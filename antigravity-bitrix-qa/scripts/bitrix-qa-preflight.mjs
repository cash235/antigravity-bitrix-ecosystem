#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix QA & Security Preflight Scanner (Node.js 18+).
 * Scans /local/ and custom app folders for leaked secrets, unsafe SQL interpolation,
 * RestartBuffer+process404 traps, debug leftovers, and AJAX auth/CSRF posture.
 *
 * Usage:
 *   node bitrix-qa-preflight.mjs [project-root] [--json]
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const rootDir = path.resolve(args.find((a) => !a.startsWith("--")) || process.cwd());

if (!fs.existsSync(rootDir)) {
  console.error(`Directory not found: ${rootDir}`);
  process.exit(1);
}

const SKIP_DIRS = new Set([
  ".git",
  "bitrix",
  "upload",
  "node_modules",
  "vendor",
  "cache",
  "managed_cache",
  "stack_cache",
  "html_pages",
  "tmp",
  "docs",
  "scratch",
]);

const report = {
  root: rootDir,
  verdict: "SHIP",
  stats: { phpFiles: 0, jsFiles: 0, ajaxEndpoints: 0 },
  critical: [],
  high: [],
  medium: [],
  info: [],
};

function add(level, code, file, line, message) {
  report[level].push({
    code,
    file: path.relative(rootDir, file).replace(/\\/g, "/"),
    line,
    message,
  });
}

function walk(dir, depth = 0) {
  if (!fs.existsSync(dir) || depth > 7) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (e.isFile()) {
      if (e.name.endsWith(".php")) scanPhp(full);
      else if (e.name.endsWith(".js") && !e.name.endsWith(".min.js")) scanJs(full);
    }
  }
}

const SECRET_PATTERNS = [
  { name: "PRIVATE_KEY", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GOOGLE_API_KEY", re: /\bAIza[0-9A-Za-z\-_]{30,}\b/ },
  { name: "YANDEX_OAUTH_TOKEN", re: /\by0_[A-Za-z0-9_\-]{25,}\b/ },
  { name: "AWS_ACCESS_KEY", re: /\bAKIA[0-9A-Z]{16}\b/ },
];

function scanPhp(filePath) {
  report.stats.phpFiles++;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const norm = filePath.replace(/\\/g, "/");

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("#")) return;

    for (const sp of SECRET_PATTERNS) {
      if (sp.re.test(line)) {
        add("critical", `SECRET_${sp.name}`, filePath, ln, `Possible hardcoded secret (${sp.name}) detected.`);
      }
    }

    if (/->(?:query|Query)\s*\([^)]*\$_(?:GET|POST|REQUEST)\s*\[/i.test(line)) {
      add("critical", "UNSAFE_SQL_INTERPOLATION", filePath, ln, "Direct $_GET/$_POST interpolation inside SQL query.");
    }

    if (/\b(?:var_dump|dd)\s*\(/i.test(line)) {
      add("medium", "DEBUG_LEFTOVER_PHP", filePath, ln, "Debug function call (var_dump/dd) found in PHP file.");
    }
  });

  if (/process404\s*\(/i.test(content) && /\$APPLICATION->RestartBuffer\s*\(/i.test(content)) {
    const ln = lines.findIndex((l) => /\$APPLICATION->RestartBuffer\s*\(/i.test(l)) + 1;
    add("high", "RESTART_BUFFER_404", filePath, ln || 1, "RestartBuffer() paired with process404() triggers Quirks Mode; use RestartWorkarea().");
  }

  // Inspect AJAX endpoints for auth / CSRF posture
  const isAjax = /\/ajax\.php$/i.test(norm) || /\/local\/ajax\/[^/]+\.php$/i.test(norm);
  if (isAjax) {
    report.stats.ajaxEndpoints++;
    const hasSessid = /check_bitrix_sessid/i.test(content);
    const hasAuth = /IsAuthorized|GetUserGroupArray|IsAdmin/i.test(content);
    const isAdminArea = /\/manager\/|\/admin\//i.test(norm);
    if (isAdminArea && !hasAuth) {
      add("critical", "ADMIN_AJAX_NO_AUTH", filePath, 1, "Admin/manager AJAX endpoint appears to lack server-side auth/group check.");
    } else if (!hasSessid && !hasAuth) {
      add("info", "PUBLIC_AJAX_REVIEW", filePath, 1, "Public AJAX endpoint without check_bitrix_sessid/auth (verify strict input validation & rate/abuse safety).");
    }
  }
}

function scanJs(filePath) {
  report.stats.jsFiles++;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const ln = idx + 1;
    for (const sp of SECRET_PATTERNS) {
      if (sp.re.test(line)) {
        add("critical", `SECRET_${sp.name}`, filePath, ln, `Possible hardcoded secret (${sp.name}) in JS bundle.`);
      }
    }
    if (/\bdebugger\s*;/.test(line)) {
      add("medium", "JS_DEBUGGER", filePath, ln, "Leftover 'debugger;' statement in JS file.");
    }
  });
}

// Scan /local and custom app dirs (skip vendor/libs)
const targets = ["local", "manager", "personal", "account", "catalog", "api"]
  .map((d) => path.join(rootDir, d))
  .filter((d) => fs.existsSync(d));

if (targets.length === 0) {
  walk(rootDir, 0);
} else {
  targets.forEach((t) => walk(t, 0));
}

// Check for accidentally committed .env or service-account JSON in root
for (const risky of [".env", ".env.local", "service-account.json"]) {
  const p = path.join(rootDir, risky);
  if (fs.existsSync(p)) {
    add("high", "SENSITIVE_FILE_IN_ROOT", p, 1, `Sensitive file '${risky}' present in project root (ensure it is gitignored).`);
  }
}

if (report.critical.length > 0) report.verdict = "BLOCK";
else if (report.high.length > 0) report.verdict = "SHIP WITH FIXES";
else report.verdict = "SHIP";

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`=== 1C-Bitrix QA Preflight: ${report.root} ===`);
  console.log(`Scanned : ${report.stats.phpFiles} PHP, ${report.stats.jsFiles} JS, ${report.stats.ajaxEndpoints} AJAX endpoints`);
  console.log(`Findings: CRITICAL=${report.critical.length} | HIGH=${report.high.length} | MEDIUM=${report.medium.length} | INFO=${report.info.length}`);
  console.log(`Verdict : ${report.verdict}\n`);
  for (const level of ["critical", "high", "medium", "info"]) {
    if (!report[level].length) continue;
    console.log(`[${level.toUpperCase()}]`);
    for (const f of report[level].slice(0, 20)) {
      console.log(`  - (${f.code}) ${f.file}:${f.line} — ${f.message}`);
    }
    console.log("");
  }
}
