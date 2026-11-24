#!/usr/bin/env node
/**
 * Zero-dependency Live Anonymized Skill Collector, Fail-Closed PII/Secret Sanitizer,
 * and 1-Click GitHub PR Builder (Node.js 18+).
 *
 * Stores project-discovered reusable patterns in `.agents/learned-skills/*.md`,
 * deterministically blocks/redacts domains, credentials, API keys, emails, phones,
 * local paths, and server IPs, and prepares safe Pull Requests to
 * `cash235/antigravity-bitrix-ecosystem`.
 *
 * Usage:
 *   node bitrix-skill-collector.mjs [project-root] --list [--json]
 *   node bitrix-skill-collector.mjs [project-root] --check <file> [--json]
 *   node bitrix-skill-collector.mjs [project-root] --add --title "..." --summary "..." --plugin core --category d7-backend --body "..." [--redact]
 *   node bitrix-skill-collector.mjs [project-root] --sanitize <filename>
 *   node bitrix-skill-collector.mjs [project-root] --prepare-pr [--files a.md,b.md] [--json]
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const UPSTREAM_REPO = "cash235/antigravity-bitrix-ecosystem";

const SAFE_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.example.com",
  "staging.example.com",
  "localhost",
  "127.0.0.1",
  "dev.1c-bitrix.ru",
  "docs.1c-bitrix.ru",
  "academy.1c-bitrix.ru",
  "1c-bitrix.ru",
  "schema.org",
  "w3.org",
  "www.w3.org",
  "github.com",
  "raw.githubusercontent.com",
  "nodejs.org",
  "php.net",
  "www.php.net",
  "developer.mozilla.org",
  "developers.google.com",
  "yandex.ru",
  "yandex.com",
  "google.com",
  "bitrix24.ru",
  "bitrix24.com",
]);

const SAFE_EMAILS = new Set([
  "user@example.com",
  "admin@example.com",
  "test@example.com",
  "noreply@example.com",
  "info@example.com",
]);

const SAFE_TLD_CODE_EXCLUSIONS = new Set([
  "php",
  "mjs",
  "js",
  "ts",
  "json",
  "md",
  "css",
  "scss",
  "html",
  "xml",
  "sql",
  "yml",
  "yaml",
  "sh",
  "ps1",
  "env",
  "log",
  "txt",
  "svg",
  "png",
  "jpg",
  "webp",
  "lock",
  "vsix",
  "map",
  "min",
  "tpl",
  "twig",
  "ini",
  "conf",
  "cfg",
  "bak",
]);

const PLACEHOLDER_VALUE_RE =
  /^(?:your[_-]?|placeholder|example|dummy|sample|test|changeme|xxx+|redacted|<[^>]+>|\$\{[^}]+\}|\$[A-Z_]+|null|false|true|""|'')$/i;

/**
 * Check if an IPv4 address is safe/non-routable placeholder.
 * @param {string} ip
 */
function isSafeIp(ip) {
  return (
    ip === "127.0.0.1" ||
    ip === "0.0.0.0" ||
    ip.startsWith("192.0.2.") ||
    ip.startsWith("198.51.100.") ||
    ip.startsWith("203.0.113.") ||
    ip === "255.255.255.255"
  );
}

/**
 * Deterministic Fail-Closed PII, Secret, Domain & Prompt-Injection Sanitizer.
 * Returns { verdict: "PASS" | "BLOCK", blocked: boolean, findings: Array<object>, sanitized: string }.
 *
 * @param {string} rawText
 */
export function sanitizeSkillContent(rawText) {
  const text = String(rawText || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const findings = [];
  const redactedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = lines[i];

    // 1. Private key headers
    if (/-----BEGIN\s+(?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/i.test(line)) {
      findings.push({
        type: "private_key",
        severity: "critical",
        line: lineNum,
        snippet: "-----BEGIN ... PRIVATE KEY-----",
        reason: "Обнаружен приватный ключ (PEM/SSH). Категорически запрещено отправлять.",
      });
      line = line.replace(/-----BEGIN[^-]+PRIVATE KEY-----/gi, "<REDACTED_PRIVATE_KEY>");
    }

    // 2. Known high-entropy API tokens / cloud keys / JWT
    const tokenPatterns = [
      { re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, label: "GitHub Token" },
      { re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, label: "GitHub Fine-Grained PAT" },
      { re: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}\b/g, label: "API Secret Key (sk-...)" },
      { re: /\bAIza[0-9A-Za-z_-]{30,}\b/g, label: "Google API Key" },
      { re: /\bya29\.[0-9A-Za-z_-]{20,}\b/g, label: "Google OAuth Token" },
      { re: /\bxox[baprs]-[0-9A-Za-z-]{15,}\b/g, label: "Slack Token" },
      { re: /\bAKIA[0-9A-Z]{16}\b/g, label: "AWS Access Key ID" },
      { re: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{10,}\b/g, label: "JWT Token" },
      { re: /\by0_[A-Za-z0-9_-]{25,}\b/g, label: "Yandex OAuth Token" },
    ];
    for (const tp of tokenPatterns) {
      const matches = [...line.matchAll(tp.re)];
      if (matches.length > 0) {
        findings.push({
          type: "api_token",
          severity: "critical",
          line: lineNum,
          snippet: `${tp.label} (${matches[0][0].slice(0, 8)}...)`,
          reason: `Обнаружен секретный токен/ключ (${tp.label}).`,
        });
        line = line.replace(tp.re, "<REDACTED_TOKEN>");
      }
    }

    // 3. Explicit password / secret / token assignments
    const assignRe =
      /(\b(?:password|passwd|db_?pass(?:word)?|api_?key|api_?secret|access_?token|client_?secret|private_?key|auth_?token|webhook_?secret)\b\s*[:=]\s*['"]?)([^'"\s,;)]+)(['"]?)/gi;
    line = line.replace(assignRe, (full, prefix, val, suffix) => {
      const cleanVal = String(val || "").trim();
      if (!cleanVal || cleanVal.length < 4 || PLACEHOLDER_VALUE_RE.test(cleanVal)) {
        return full;
      }
      findings.push({
        type: "credential_assignment",
        severity: "critical",
        line: lineNum,
        snippet: `${prefix.trim()} ***`,
        reason: "Обнаружено захардкоженное значение пароля/ключа/токена.",
      });
      return `${prefix}<REDACTED_SECRET>${suffix}`;
    });

    // 4. Connection strings with credentials or SSH user@host
    const connRe = /\b((?:mysql|postgres|postgresql|mongodb|redis|ftp|sftp|https?):\/\/[^:\s/]+:)([^@\s/]+)(@[^\s'"`]+)/gi;
    line = line.replace(connRe, (full, p1, pass, p3) => {
      if (PLACEHOLDER_VALUE_RE.test(pass)) return full;
      findings.push({
        type: "connection_secret",
        severity: "critical",
        line: lineNum,
        snippet: `${p1}***@<host>`,
        reason: "Обнаружены учётные данные в URL/строке подключения.",
      });
      return `${p1}<REDACTED_SECRET>@example.com`;
    });

    const sshRe = /\b(ssh(?:\s+-[a-zA-Z0-9\s]+)?\s+)([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/g;
    line = line.replace(sshRe, (full, cmd, target) => {
      if (/example\.com|localhost|127\.0\.0\.1/i.test(target)) return full;
      findings.push({
        type: "ssh_target",
        severity: "high",
        line: lineNum,
        snippet: `ssh ${target.split("@")[0]}@***`,
        reason: "Обнаружен реальный SSH-адрес сервера.",
      });
      return `${cmd}user@example.com`;
    });

    // 5. Real email addresses (PII)
    const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    line = line.replace(emailRe, (email) => {
      const lower = email.toLowerCase();
      if (SAFE_EMAILS.has(lower) || lower.endsWith("@example.com") || lower.endsWith("@example.org")) {
        return email;
      }
      findings.push({
        type: "email_pii",
        severity: "high",
        line: lineNum,
        snippet: `${lower.slice(0, 2)}***@***`,
        reason: "Обнаружен реальный email-адрес (PII).",
      });
      return "user@example.com";
    });

    // 6. Real phone numbers (PII)
    const phoneRe = /(?:\+?[1-9]\d{0,2}[\s\-().]{0,2})(?:\(?\d{2,4}\)?[\s\-().]{1,2})\d{2,4}[\s\-().]?\d{2}[\s\-().]?\d{2}\b/g;
    line = line.replace(phoneRe, (phone) => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) return phone;
      if (/^0+$|^123456789/.test(digits)) return phone;
      findings.push({
        type: "phone_pii",
        severity: "high",
        line: lineNum,
        snippet: `${phone.slice(0, 5)}***`,
        reason: "Обнаружен телефонный номер (PII).",
      });
      return "+7 (000) 000-00-00";
    });

    // 7. Local OS paths with usernames or cloud sync folders
    const localPathRe = /(?:[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\\\s'"`]+|\/(?:Users|home)\/[^/\s'"`]+|Yandex\.Disk)/gi;
    line = line.replace(localPathRe, (m) => {
      if (/\\<user>|\/<user>|\\username|\/username/i.test(m)) return m;
      findings.push({
        type: "local_path_pii",
        severity: "high",
        line: lineNum,
        snippet: m.slice(0, 16) + "...",
        reason: "Обнаружен локальный путь с именем пользователя или личной папкой.",
      });
      return m.startsWith("/") ? "/home/<user>" : "C:\\Users\\<user>";
    });

    // 8. Real IPv4 addresses
    const ipRe = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/g;
    line = line.replace(ipRe, (ip) => {
      const octets = ip.split(".").map(Number);
      if (octets.some((n) => n < 0 || n > 255)) return ip;
      if (isSafeIp(ip)) return ip;
      findings.push({
        type: "server_ip",
        severity: "high",
        line: lineNum,
        snippet: `${octets[0]}.${octets[1]}.*.*`,
        reason: "Обнаружен IP-адрес сервера/сети.",
      });
      return "192.0.2.10";
    });

    // 9. Client domains (URLs & bare hostnames with real TLDs)
    const urlDomainRe = /\b(https?:\/\/)([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(:\d+)?/gi;
    line = line.replace(urlDomainRe, (full, proto, host, port = "") => {
      const h = host.toLowerCase();
      if (
        SAFE_DOMAINS.has(h) ||
        h.endsWith(".example.com") ||
        h.endsWith(".1c-bitrix.ru") ||
        h.endsWith(".github.io")
      ) {
        return full;
      }
      findings.push({
        type: "client_domain",
        severity: "high",
        line: lineNum,
        snippet: `${proto}${h}`,
        reason: `Обнаружен внешний/клиентский домен (${h}). Замените на example.com.`,
      });
      return `${proto}example.com${port}`;
    });

    const bareDomainRe = /\b([a-zA-Z0-9-]{2,}\.(?:ru|by|kz|ua|rf|рф|com|net|org|io|shop|store|pro|biz|info|online|site))\b/gi;
    line = line.replace(bareDomainRe, (host) => {
      const h = host.toLowerCase();
      const tld = h.split(".").pop() || "";
      if (SAFE_TLD_CODE_EXCLUSIONS.has(tld)) return host;
      if (SAFE_DOMAINS.has(h) || h.endsWith(".example.com") || h.endsWith(".1c-bitrix.ru")) return host;
      // Avoid flagging Bitrix PHP namespaces or file names like sale.order.ajax
      if (/^(?:bitrix|sale|catalog|iblock|main|crm|system|local)\./i.test(h)) return host;
      findings.push({
        type: "client_domain",
        severity: "high",
        line: lineNum,
        snippet: h,
        reason: `Обнаружено доменное имя (${h}). Замените на example.com.`,
      });
      return "example.com";
    });

    // 10. Basic prompt-injection guard
    if (/(?:ignore\s+(?:all\s+)?previous\s+instructions|disregard\s+system\s+prompt|curl\s+[^|\n]+\|\s*(?:ba)?sh)/i.test(line)) {
      findings.push({
        type: "prompt_injection",
        severity: "critical",
        line: lineNum,
        snippet: line.trim().slice(0, 60),
        reason: "Обнаружен подозрительный паттерн prompt-injection или небезопасного shell-выполнения.",
      });
    }

    redactedLines.push(line);
  }

  return {
    verdict: findings.length > 0 ? "BLOCK" : "PASS",
    blocked: findings.length > 0,
    findings,
    sanitized: redactedLines.join("\n"),
  };
}

/**
 * Parse YAML-like frontmatter from a learned skill Markdown file.
 * @param {string} raw
 */
function parseSkillMarkdown(raw) {
  const clean = String(raw || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const fmMatch = clean.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {
    id: "",
    title: "",
    summary: "",
    category: "d7-backend",
    targetPlugin: "antigravity-bitrix-core",
    createdAt: "",
    excluded: false,
  };
  let body = clean;
  if (fmMatch) {
    body = fmMatch[2].trim();
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (k === "excluded") meta.excluded = v === "true";
      else if (k in meta) meta[k] = v;
    }
  }
  if (!meta.title) {
    const h1 = body.match(/^#\s+(.+)$/m);
    meta.title = h1 ? h1[1].trim() : "Без названия";
  }
  return { meta, body };
}

/**
 * Serialize a learned skill into Markdown with YAML frontmatter.
 * @param {object} meta
 * @param {string} body
 */
function serializeSkillMarkdown(meta, body) {
  const escYaml = (v) => String(v || "").replace(/\r?\n/g, " ").replace(/"/g, "'").trim();
  return [
    "---",
    `id: "${escYaml(meta.id)}"`,
    `title: "${escYaml(meta.title)}"`,
    `summary: "${escYaml(meta.summary)}"`,
    `category: "${escYaml(meta.category || "d7-backend")}"`,
    `targetPlugin: "${escYaml(meta.targetPlugin || "antigravity-bitrix-core")}"`,
    `createdAt: "${escYaml(meta.createdAt || new Date().toISOString().slice(0, 10))}"`,
    `excluded: ${meta.excluded ? "true" : "false"}`,
    "---",
    "",
    String(body || "").trim(),
    "",
  ].join("\n");
}

function slugify(str) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const translit = String(str || "")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in map ? map[ch] : ch))
    .join("");
  return translit
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "learned-skill";
}

/**
 * List and live-audit all learned skills in `.agents/learned-skills/`.
 * @param {string} rootDir
 */
export function listLearnedSkills(rootDir) {
  const dir = path.join(rootDir, ".agents", "learned-skills");
  if (!fs.existsSync(dir)) {
    return {
      dir: ".agents/learned-skills",
      exists: false,
      count: 0,
      readyCount: 0,
      blockedCount: 0,
      excludedCount: 0,
      upstreamRepo: UPSTREAM_REPO,
      skills: [],
    };
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const skills = [];
  for (const filename of files) {
    const fullPath = path.join(dir, filename);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { meta, body } = parseSkillMarkdown(raw);
    const audit = sanitizeSkillContent(`${meta.title}\n${meta.summary}\n${body}`);
    const bodyAudit = sanitizeSkillContent(body);
    skills.push({
      filename,
      relPath: `.agents/learned-skills/${filename}`,
      id: meta.id || filename.replace(/\.md$/i, ""),
      title: meta.title,
      summary: meta.summary || "Краткая расшифровка навыка не указана.",
      category: meta.category || "d7-backend",
      targetPlugin: meta.targetPlugin || "antigravity-bitrix-core",
      createdAt: meta.createdAt || "",
      excluded: Boolean(meta.excluded),
      verdict: audit.verdict,
      blocked: audit.blocked,
      findingsCount: audit.findings.length,
      findings: audit.findings.slice(0, 12),
      body,
      sanitizedBody: bodyAudit.sanitized,
    });
  }

  const excludedCount = skills.filter((s) => s.excluded).length;
  const blockedCount = skills.filter((s) => !s.excluded && s.blocked).length;
  const readyCount = skills.filter((s) => !s.excluded && !s.blocked).length;

  return {
    dir: ".agents/learned-skills",
    exists: true,
    count: skills.length,
    readyCount,
    blockedCount,
    excludedCount,
    upstreamRepo: UPSTREAM_REPO,
    skills,
  };
}

/**
 * Save a new learned skill into `.agents/learned-skills/`.
 * @param {string} rootDir
 * @param {{ title: string, summary: string, category?: string, targetPlugin?: string, body: string, autoRedact?: boolean }} input
 */
export function saveLearnedSkill(rootDir, input) {
  const dir = path.join(rootDir, ".agents", "learned-skills");
  fs.mkdirSync(dir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const id = slugify(input.title);
  const filename = `${id}.md`;

  let title = String(input.title || "Новый паттерн 1С-Битрикс").trim();
  let summary = String(input.summary || "Практический приём, выявленный при разработке.").trim();
  let body = String(input.body || "").trim();

  const initialAudit = sanitizeSkillContent(`${title}\n${summary}\n${body}`);
  if (input.autoRedact && initialAudit.blocked) {
    title = sanitizeSkillContent(title).sanitized;
    summary = sanitizeSkillContent(summary).sanitized;
    body = sanitizeSkillContent(body).sanitized;
  }

  const content = serializeSkillMarkdown(
    {
      id,
      title,
      summary,
      category: input.category || "d7-backend",
      targetPlugin: input.targetPlugin || "antigravity-bitrix-core",
      createdAt: today,
      excluded: false,
    },
    body
  );

  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, content, "utf8");
  const finalAudit = sanitizeSkillContent(content);
  return {
    filename,
    relPath: `.agents/learned-skills/${filename}`,
    verdict: finalAudit.verdict,
    findings: finalAudit.findings,
  };
}

/**
 * Apply auto-redaction in place to an existing learned skill file.
 * @param {string} rootDir
 * @param {string} filename
 */
export function sanitizeExistingSkill(rootDir, filename) {
  const safeName = path.basename(filename);
  const fullPath = path.join(rootDir, ".agents", "learned-skills", safeName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Файл навыка не найден: ${safeName}`);
  }
  const raw = fs.readFileSync(fullPath, "utf8");
  const { meta, body } = parseSkillMarkdown(raw);
  meta.title = sanitizeSkillContent(meta.title).sanitized;
  meta.summary = sanitizeSkillContent(meta.summary).sanitized;
  const cleanBody = sanitizeSkillContent(body).sanitized;
  const nextRaw = serializeSkillMarkdown(meta, cleanBody);
  fs.writeFileSync(fullPath, nextRaw, "utf8");
  const verify = sanitizeSkillContent(nextRaw);
  return { filename: safeName, verdict: verify.verdict, findings: verify.findings };
}

/**
 * Toggle excluded flag on an existing learned skill file.
 * @param {string} rootDir
 * @param {string} filename
 * @param {boolean} excluded
 */
export function setLearnedSkillExcluded(rootDir, filename, excluded) {
  const safeName = path.basename(filename);
  const fullPath = path.join(rootDir, ".agents", "learned-skills", safeName);
  if (!fs.existsSync(fullPath)) throw new Error(`Файл навыка не найден: ${safeName}`);
  const { meta, body } = parseSkillMarkdown(fs.readFileSync(fullPath, "utf8"));
  meta.excluded = Boolean(excluded);
  fs.writeFileSync(fullPath, serializeSkillMarkdown(meta, body), "utf8");
  return { filename: safeName, excluded: meta.excluded };
}

/**
 * Delete a learned skill file from `.agents/learned-skills/`.
 * @param {string} rootDir
 * @param {string} filename
 */
export function deleteLearnedSkill(rootDir, filename) {
  const safeName = path.basename(filename);
  const fullPath = path.join(rootDir, ".agents", "learned-skills", safeName);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  return { deleted: safeName };
}

/**
 * Build a Fail-Closed sanitized PR bundle for selected skills.
 * HARD BLOCKS if any selected skill fails Sanitizer!
 * @param {string} rootDir
 * @param {string[]} [selectedFilenames]
 */
export function prepareSkillsPrBundle(rootDir, selectedFilenames) {
  const listing = listLearnedSkills(rootDir);
  const chosen = listing.skills.filter((s) => {
    if (Array.isArray(selectedFilenames) && selectedFilenames.length > 0) {
      return selectedFilenames.includes(s.filename);
    }
    return !s.excluded;
  });

  if (chosen.length === 0) {
    return {
      ok: false,
      blocked: true,
      error: "Не выбрано ни одного навыка для отправки.",
      skillsCount: 0,
      blockedSkills: [],
      prTitle: "",
      prBody: "",
    };
  }

  const blockedSkills = chosen.filter((s) => s.blocked);
  if (blockedSkills.length > 0) {
    return {
      ok: false,
      blocked: true,
      error: `Отправка заблокирована PII/Secret Sanitizer: ${blockedSkills.map((s) => s.filename).join(", ")}. Сначала обезличьте или исключите их.`,
      skillsCount: chosen.length,
      blockedSkills: blockedSkills.map((s) => ({ filename: s.filename, findings: s.findings })),
      prTitle: "",
      prBody: "",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const prTitle =
    chosen.length === 1
      ? `feat(learned-skills): add ${chosen[0].title}`
      : `feat(learned-skills): contribute ${chosen.length} anonymized 1C-Bitrix patterns (${today})`;

  const lines = [
    "## Предложенные обезличенные навыки из боевой практики 1С-Битрикс",
    "",
    `- Проверено автоматическим **PII & Secret Sanitizer**: \`PASS\` (0 утечек доменов, токенов, путей и PII).`,
    `- Количество навыков: **${chosen.length}**.`,
    "",
    "| Навык | Целевой плагин | Категория | Расшифровка |",
    "|---|---|---|---|",
  ];
  for (const s of chosen) {
    lines.push(`| \`${s.id}\` | \`${s.targetPlugin}\` | \`${s.category}\` | ${s.summary} |`);
  }
  lines.push("");
  for (const s of chosen) {
    lines.push(`### ${s.title} (\`${s.targetPlugin}\`)`);
    lines.push(`> ${s.summary}`);
    lines.push("");
    lines.push(s.sanitizedBody);
    lines.push("");
  }

  // Final defense-in-depth check on the entire assembled PR body
  const finalCheck = sanitizeSkillContent(`${prTitle}\n${lines.join("\n")}`);
  if (finalCheck.blocked) {
    return {
      ok: false,
      blocked: true,
      error: "Итоговая проверка PR-бандла обнаружила остаточные PII/секреты.",
      skillsCount: chosen.length,
      blockedSkills: [{ filename: "pr-bundle", findings: finalCheck.findings }],
      prTitle: "",
      prBody: "",
    };
  }

  return {
    ok: true,
    blocked: false,
    skillsCount: chosen.length,
    skills: chosen,
    prTitle,
    prBody: lines.join("\n"),
    upstreamRepo: UPSTREAM_REPO,
  };
}

/**
 * Locate GitHub CLI (`gh`) binary on Windows / Linux / macOS.
 */
function findGhBinary() {
  const candidates = process.platform === "win32"
    ? ["gh", "C:\\Program Files\\GitHub CLI\\gh.exe"]
    : ["gh", "/usr/local/bin/gh", "/opt/homebrew/bin/gh"];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["--version"], { stdio: "ignore", timeout: 3000 });
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Create a real GitHub Pull Request in UPSTREAM_REPO (via clean temp clone/fork + gh pr create).
 * Only called after explicit operator confirmation!
 * @param {string} rootDir
 * @param {string[]} [selectedFilenames]
 */
export function submitSkillsPullRequest(rootDir, selectedFilenames) {
  const bundle = prepareSkillsPrBundle(rootDir, selectedFilenames);
  if (!bundle.ok || bundle.blocked) {
    return { ok: false, error: bundle.error, bundle };
  }

  const gh = findGhBinary();
  if (!gh) {
    return {
      ok: false,
      fallbackCopy: true,
      error: "GitHub CLI (gh) не найден. Обезличенный бандл готов — скопируйте его для PR/Issue.",
      bundle,
    };
  }

  // Verify gh auth
  try {
    execFileSync(gh, ["auth", "status"], { stdio: "ignore", timeout: 5000 });
  } catch {
    return {
      ok: false,
      fallbackCopy: true,
      error: "GitHub CLI не авторизован (выполните `gh auth login`).",
      bundle,
    };
  }

  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), "bitrix-skill-pr-"));
  try {
    const branchName = `learned-skills/${new Date().toISOString().replace(/[:.T]/g, "-").slice(0, 19)}`;
    execFileSync(gh, ["repo", "clone", UPSTREAM_REPO, tmpRepo, "--", "--depth", "1"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
    execFileSync("git", ["checkout", "-b", branchName], { cwd: tmpRepo, stdio: "ignore" });

    const targetDir = path.join(tmpRepo, "docs", "community-learned-skills");
    fs.mkdirSync(targetDir, { recursive: true });
    for (const s of bundle.skills) {
      const md = serializeSkillMarkdown(
        {
          id: s.id,
          title: s.title,
          summary: s.summary,
          category: s.category,
          targetPlugin: s.targetPlugin,
          createdAt: s.createdAt,
          excluded: false,
        },
        s.sanitizedBody
      );
      fs.writeFileSync(path.join(targetDir, s.filename), md, "utf8");
    }

    execFileSync("git", ["add", "docs/community-learned-skills"], { cwd: tmpRepo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", bundle.prTitle], { cwd: tmpRepo, stdio: "ignore" });
    execFileSync("git", ["push", "-u", "origin", branchName], {
      cwd: tmpRepo,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 25000,
    });

    const prUrl = execFileSync(
      gh,
      ["pr", "create", "--repo", UPSTREAM_REPO, "--head", branchName, "--base", "main", "--title", bundle.prTitle, "--body", bundle.prBody],
      { cwd: tmpRepo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 25000 }
    ).trim();

    return { ok: true, prUrl, branchName, skillsCount: bundle.skillsCount };
  } catch (err) {
    return {
      ok: false,
      fallbackCopy: true,
      error: `Не удалось автоматически создать PR (если нет прав push в upstream, сделайте Fork или используйте Issue): ${err.message}`,
      bundle,
    };
  } finally {
    fs.rmSync(tmpRepo, { recursive: true, force: true });
  }
}

// CLI execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const cliArgs = process.argv.slice(2);
  function flagVal(name) {
    const idx = cliArgs.indexOf(name);
    return idx !== -1 && idx + 1 < cliArgs.length && !cliArgs[idx + 1].startsWith("--") ? cliArgs[idx + 1] : null;
  }
  const valueFlags = new Set(["--check", "--title", "--summary", "--plugin", "--category", "--body", "--sanitize", "--files"]);
  let dirArg = null;
  for (let i = 0; i < cliArgs.length; i++) {
    if (valueFlags.has(cliArgs[i])) {
      i++;
      continue;
    }
    if (!cliArgs[i].startsWith("--") && !dirArg) dirArg = cliArgs[i];
  }
  const rootDir = path.resolve(dirArg || process.cwd());
  const jsonMode = cliArgs.includes("--json");

  if (cliArgs.includes("--check")) {
    const target = flagVal("--check");
    const raw = target ? fs.readFileSync(path.resolve(target), "utf8") : "";
    const res = sanitizeSkillContent(raw);
    console.log(jsonMode ? JSON.stringify(res, null, 2) : `Verdict: ${res.verdict} (${res.findings.length} findings)`);
    process.exit(res.blocked ? 2 : 0);
  } else if (cliArgs.includes("--add")) {
    const res = saveLearnedSkill(rootDir, {
      title: flagVal("--title") || "Bitrix D7 Pattern",
      summary: flagVal("--summary") || "Reusable 1C-Bitrix pattern",
      targetPlugin: flagVal("--plugin") || "antigravity-bitrix-core",
      category: flagVal("--category") || "d7-backend",
      body: flagVal("--body") || "",
      autoRedact: cliArgs.includes("--redact"),
    });
    console.log(JSON.stringify(res, null, 2));
  } else if (cliArgs.includes("--sanitize")) {
    const fn = flagVal("--sanitize");
    const res = sanitizeExistingSkill(rootDir, fn || "");
    console.log(JSON.stringify(res, null, 2));
  } else if (cliArgs.includes("--prepare-pr")) {
    const filesRaw = flagVal("--files");
    const filesList = filesRaw ? filesRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const res = prepareSkillsPrBundle(rootDir, filesList);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.ok ? 0 : 2);
  } else {
    const res = listLearnedSkills(rootDir);
    console.log(jsonMode ? JSON.stringify(res, null, 2) : `Learned skills: ${res.count} (ready=${res.readyCount}, blocked=${res.blockedCount}, excluded=${res.excludedCount})`);
  }
}
