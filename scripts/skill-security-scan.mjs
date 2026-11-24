#!/usr/bin/env node
/**
 * Zero-dependency Skill Security, Prompt-Injection & Supply-Chain Scanner (Node.js 18+).
 * Inspired by midudev/autoskills security model.
 * Scans all SKILL.md, agents/*.md, and rules/*.md files across plugins (or a custom directory)
 * to block prompt-injection, covert shell exfiltration, encoded payloads, and unsafe overrides.
 *
 * Usage:
 *   node scripts/skill-security-scan.mjs [target-dir] [--json]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const targetDir = path.resolve(args.find((a) => !a.startsWith("--")) || process.cwd());

const RULES = [
  {
    code: "PROMPT_INJECTION_OVERRIDE",
    severity: "CRITICAL",
    re: /\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|rules|prompts|guardrails)\b/i,
    reason: "Prompt-injection attempt trying to override system/user instructions.",
  },
  {
    code: "PROMPT_INJECTION_JAILBREAK",
    severity: "CRITICAL",
    re: /\b(?:you are now|act as DAN|bypass\s+(?:all\s+)?(?:security|permissions|sandbox|guardrails)|disable\s+cock-up\s+prevention)\b/i,
    reason: "Attempt to bypass permissions, sandbox, or governance guardrails.",
  },
  {
    code: "PIPE_TO_SHELL_EXEC",
    severity: "CRITICAL",
    re: /\b(?:curl|wget)\s+[^\n|]{4,}\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b/i,
    reason: "Remote script piped directly into shell (supply-chain RCE risk).",
  },
  {
    code: "POWERSHELL_ENCODED_EXEC",
    severity: "CRITICAL",
    re: /\b(?:powershell|pwsh)\b[^\n]*(?:-enc(?:odedcommand)?\b|Invoke-Expression\b|\biex\s*\()/i,
    reason: "Obfuscated PowerShell execution / Invoke-Expression detected.",
  },
  {
    code: "COVERT_EXFILTRATION",
    severity: "CRITICAL",
    re: /\b(?:curl|wget|nc|netcat)\b[^\n]*(?:\.env|id_rsa|private[_-]?key|permissions\.json|service-account)[^\n]*(?:https?:\/\/|@)/i,
    reason: "Potential secret exfiltration command referencing credentials/keys.",
  },
  {
    code: "DESTRUCTIVE_RM_RF",
    severity: "CRITICAL",
    re: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:\/|~|\$HOME|\*)\b/,
    reason: "Destructive wildcard/root deletion command inside skill instructions.",
  },
  {
    code: "HIDDEN_UNICODE_BIDI",
    severity: "CRITICAL",
    re: /[\u202A-\u202E\u2066-\u2069\u200B\uFEFF](?=.*[\u202A-\u202E\u2066-\u2069])/,
    reason: "Hidden Unicode Bidirectional (Trojan Source) control characters detected.",
  },
];

const SKIP_DIRS = new Set([".git", "node_modules", "bitrix", "upload"]);
const mdFiles = [];

function walk(dir, depth = 0) {
  if (depth > 6) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (e.name.endsWith(".md")) {
      const norm = full.replace(/\\/g, "/");
      if (
        norm.includes("/skills/") ||
        norm.includes("/agents/") ||
        norm.includes("/rules/") ||
        norm.includes("/learned-skills/") ||
        e.name === "SKILL.md"
      ) {
        mdFiles.push(full);
      }
    }
  }
}

walk(targetDir);

const findings = [];
for (const file of mdFiles) {
  const rel = path.relative(targetDir, file).replace(/\\/g, "/");
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    for (const rule of RULES) {
      if (rule.re.test(ln)) {
        findings.push({
          severity: rule.severity,
          code: rule.code,
          file: rel,
          line: i + 1,
          reason: rule.reason,
          snippet: ln.trim().slice(0, 120),
        });
      }
    }
  }
}

const ok = findings.length === 0;
const report = {
  ok,
  verdict: ok ? "PASS" : "BLOCK",
  targetDir,
  filesScanned: mdFiles.length,
  findingsCount: findings.length,
  findings,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`=== Skill Security & Prompt-Injection Scan (${report.filesScanned} files) ===`);
  if (ok) {
    console.log("VERDICT: PASS (0 prompt-injection / supply-chain findings)");
  } else {
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.code} ${f.file}:${f.line} — ${f.reason}`);
    }
    console.log(`VERDICT: BLOCK (${findings.length} critical findings)`);
  }
}

process.exit(ok ? 0 : 2);
