#!/usr/bin/env node
/**
 * Zero-dependency Antigravity Lifecycle Hook Runner for 1C-Bitrix Core (Node.js 18+).
 * Adapted from affaan-m/ECC (.antigravity-plugin/hooks.json) and breferrari/obsidian-mind.
 *
 * Supported hooks (--hook <name>):
 *   - core-isolation : PreToolUse guard blocking edits inside /bitrix/ core directory.
 *   - post-edit-lint : PostToolUse fast syntax check (node --check / php -l) on edited file.
 *   - pre-compact    : PreCompact snapshot of branch, modified files & open sprint state.
 *
 * Set BITRIX_HOOKS_DISABLED=1 to bypass in CI/testing.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
const hookIdx = args.indexOf("--hook");
const hookName = hookIdx !== -1 && hookIdx + 1 < args.length ? args[hookIdx + 1] : "core-isolation";

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

if (["1", "true", "yes"].includes(String(process.env.BITRIX_HOOKS_DISABLED || "").toLowerCase())) {
  respond({ decision: "allow", note: "BITRIX_HOOKS_DISABLED=1" });
  process.exit(0);
}

let rawStdin = "";
try {
  rawStdin = fs.readFileSync(0, "utf8").trim();
} catch {
  rawStdin = "";
}

let payload = {};
if (rawStdin) {
  try {
    payload = JSON.parse(rawStdin);
  } catch {
    payload = {};
  }
}

const targetPath = String(
  payload.path || payload.Path || payload.filePath || payload.toolInput?.Path || payload.toolInput?.path || ""
).replace(/\\/g, "/");

if (hookName === "core-isolation") {
  if (/(?:^|\/)bitrix\/(?:modules|components|php_interface|admin|js|css)\//i.test(targetPath)) {
    respond({
      decision: "deny",
      reason: `Bitrix Core Isolation Guard: editing '${targetPath}' inside /bitrix/ core is forbidden. Place custom logic in /local/.`,
    });
    process.exit(0);
  }
  respond({ decision: "allow" });
  process.exit(0);
}

if (hookName === "post-edit-lint") {
  if (targetPath && fs.existsSync(targetPath)) {
    const ext = path.extname(targetPath).toLowerCase();
    try {
      if (ext === ".mjs" || ext === ".js") {
        execFileSync(process.execPath, ["--check", targetPath], { stdio: "pipe", timeout: 4000 });
      } else if (ext === ".php") {
        execFileSync("php", ["-l", targetPath], { stdio: "pipe", timeout: 4000 });
      }
    } catch (err) {
      respond({
        decision: "allow",
        warning: `Syntax check failed for ${path.basename(targetPath)}: ${(err.stderr || err.message || "").toString().trim().slice(0, 220)}`,
      });
      process.exit(0);
    }
  }
  respond({ decision: "allow" });
  process.exit(0);
}

if (hookName === "pre-compact") {
  const cwd = process.cwd();
  const stateDir = path.join(cwd, "docs", "memory");
  if (fs.existsSync(stateDir)) {
    let branch = "";
    let status = "";
    try {
      branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      status = execFileSync("git", ["status", "--short"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      // non-git workspace
    }
    const snapshot = {
      capturedAt: new Date().toISOString(),
      branch,
      modifiedFiles: status ? status.split(/\r?\n/).slice(0, 20) : [],
      note: "Captured automatically before compaction. Run bitrix-memory-search.mjs --brief to restore full session context.",
    };
    try {
      fs.writeFileSync(path.join(stateDir, ".last-compact-state.json"), JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    } catch {
      // ignore read-only FS
    }
  }
  respond({ decision: "allow" });
  process.exit(0);
}

respond({ decision: "allow" });
