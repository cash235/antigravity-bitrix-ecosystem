#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Project Memory Search & Session Startup Brief (Node.js 18+).
 * Inspired by breferrari/obsidian-mind (vault-manifest + instant session start context).
 *
 * Usage:
 *   node bitrix-memory-search.mjs [project-root] --brief [--json]
 *   node bitrix-memory-search.mjs [project-root] --query "условие поиска" [--limit 10] [--json]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
function getFlagValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--") ? args[idx + 1] : null;
}

const queryArg = getFlagValue("--query") || getFlagValue("-q");
const limitArg = Math.max(1, Math.min(50, Number(getFlagValue("--limit") || 10)));
const briefMode = args.includes("--brief") || !queryArg;
const jsonMode = args.includes("--json");

const valueFlags = new Set(["--query", "-q", "--limit"]);
let dirArg = null;
for (let i = 0; i < args.length; i++) {
  if (valueFlags.has(args[i])) {
    i++;
    continue;
  }
  if (!args[i].startsWith("--") && !dirArg) dirArg = args[i];
}
const rootDir = path.resolve(dirArg || process.cwd());

function readSafe(filePath, maxBytes = 120000) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const buf = fs.readFileSync(filePath);
    return buf.subarray(0, maxBytes).toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

function collectMemoryFiles(root) {
  const files = [];
  const fixed = [
    "AGENTS.md",
    "docs/backlog.md",
    "BACKLOG_ECOSYSTEM.md",
    "docs/memory/README.md",
    "docs/memory/codemap.md",
    "docs/memory/decisions.md",
    "docs/memory/status.md",
  ];
  for (const rel of fixed) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) files.push({ rel, full });
  }
  for (const sub of ["docs/daily", "docs/adr", ".agents/learned-skills"]) {
    const dir = path.join(root, sub);
    if (!fs.existsSync(dir)) continue;
    const entries = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 20);
    for (const f of entries) {
      files.push({ rel: `${sub}/${f}`, full: path.join(dir, f) });
    }
  }
  return files;
}

function buildSessionBrief(root) {
  const manifestRaw = readSafe(path.join(root, "docs", "memory", "manifest.json"), 16000);
  let manifest = null;
  if (manifestRaw) {
    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      manifest = null;
    }
  }

  const statusMd = readSafe(path.join(root, "docs", "memory", "status.md"));
  const decisionsMd = readSafe(path.join(root, "docs", "memory", "decisions.md"));
  const backlogMd =
    readSafe(path.join(root, "docs", "backlog.md")) || readSafe(path.join(root, "BACKLOG_ECOSYSTEM.md"));
  const permRaw = readSafe(path.join(root, ".agents", "permissions.json"), 16000);
  let permProfile = "unconfigured";
  if (permRaw) {
    try {
      permProfile = JSON.parse(permRaw).profile || "custom";
    } catch {
      permProfile = "invalid";
    }
  }

  const northStarMatch =
    backlogMd.match(/\*\*Конечная цель(?:\s*\(North Star\))?\*\*:\s*(.+)/i) ||
    statusMd.match(/\*\*Конечная цель(?:\s*\(North Star\))?\*\*:\s*(.+)/i);
  const northStar = northStarMatch ? northStarMatch[1].trim() : null;

  // Red lines extraction
  const redLines = [];
  const rlBlock = statusMd.match(/##[^\n]*(?:Красные линии|Red Lines)[\s\S]*?(?=\n##\s|$)/i);
  if (rlBlock) {
    for (const ln of rlBlock[0].split(/\r?\n/)) {
      const m = ln.match(/^\s*(?:\d+\.|-|\*)\s+(.+)$/);
      if (m) redLines.push(m[1].replace(/\*\*/g, "").trim());
    }
  }

  // Open tasks extraction (supports rich ### cards AND classic flat - [ ] backlogs)
  const openTasks = [];
  let richCardsFound = 0;
  const cards = backlogMd.split(/^###\s+/m).slice(1);
  for (const block of cards) {
    const firstLine = block.split(/\r?\n/)[0] || "";
    const hm = firstLine.match(/`?([A-Za-z0-9_#-]+)`?\s*[—–-]\s*(.+)/);
    if (!hm) continue;
    const checks = [...block.matchAll(/^\s*[-*]\s+\[([ xX])\]/gm)];
    if (checks.length === 0) continue;
    richCardsFound++;
    const doneCount = checks.filter((c) => c[1].toLowerCase() === "x").length;
    if (doneCount === checks.length) continue;
    const qm = block.match(/\[(Q[1-4])/i);
    openTasks.push({
      id: hm[1].trim(),
      title: hm[2].replace(/\*\*/g, "").trim(),
      quadrant: qm ? qm[1].toUpperCase() : "Q2",
      checklist: `${doneCount}/${checks.length}`,
    });
  }
  if (richCardsFound === 0) {
    let idx = 1;
    for (const ln of backlogMd.split(/\r?\n/)) {
      const m = ln.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/);
      if (!m) continue;
      const clean = m[1].replace(/\*\*/g, "").trim();
      const idm = clean.match(/`?(#\d+|[A-Z]+-\d+)`?/);
      openTasks.push({
        id: idm ? idm[1] : `#${idx}`,
        title: clean,
        quadrant: "Q2",
        checklist: "0/1",
      });
      idx++;
    }
  }

  // Recent ADRs (supports both ## ADR- and ### ADR-)
  const adrs = [...decisionsMd.matchAll(/^#{2,3}\s+(ADR-\d+[^\n]*)/gm)].map((m) => m[1].trim()).slice(-5);

  // Latest daily log
  const dailyDir = path.join(root, "docs", "daily");
  let latestDaily = null;
  if (fs.existsSync(dailyDir)) {
    const dailyList = fs
      .readdirSync(dailyDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ f, mtime: fs.statSync(path.join(dailyDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (dailyList.length > 0) {
      const topFile = dailyList[0].f;
      const content = readSafe(path.join(dailyDir, topFile), 16000);
      const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()).slice(-4);
      latestDaily = { file: `docs/daily/${topFile}`, headings };
    }
  }

  return {
    project: path.basename(root),
    manifestVersion: manifest?.schemaVersion || null,
    permissionsProfile: permProfile,
    northStar,
    redLines: redLines.slice(0, 5),
    openTasksCount: openTasks.length,
    topOpenTasks: openTasks.slice(0, 5),
    recentAdrs: adrs,
    latestDaily,
  };
}

function searchMemory(root, query, limit) {
  const tokens = String(query || "")
    .toLowerCase()
    .split(/[\s,;:/\\|()[\]{}]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return { query, totalMatches: 0, results: [] };

  const files = collectMemoryFiles(root);
  const hits = [];

  for (const f of files) {
    const text = readSafe(f.full);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    let currentHeading = "";
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (/^#{1,4}\s+/.test(ln)) currentHeading = ln.replace(/^#+\s+/, "").trim();
      const lower = ln.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (lower.includes(tok)) {
          score += /^#{1,4}\s+/.test(ln) ? 4 : 2;
        } else if (currentHeading.toLowerCase().includes(tok)) {
          score += 1;
        }
      }
      if (score >= tokens.length * 1.5 || (tokens.length === 1 && score >= 2)) {
        hits.push({
          file: f.rel,
          line: i + 1,
          heading: currentHeading,
          score,
          snippet: ln.trim().slice(0, 180),
        });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);
  return {
    query,
    tokens,
    filesScanned: files.length,
    totalMatches: hits.length,
    results: hits.slice(0, limit),
  };
}

if (queryArg) {
  const res = searchMemory(rootDir, queryArg, limitArg);
  if (jsonMode) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(`=== Memory Search: "${res.query}" (${res.totalMatches} matches across ${res.filesScanned} files) ===`);
    for (const h of res.results) {
      console.log(`- [${h.score}] ${h.file}:${h.line}${h.heading ? ` (${h.heading})` : ""}`);
      console.log(`    ${h.snippet}`);
    }
  }
} else if (briefMode) {
  const brief = buildSessionBrief(rootDir);
  if (jsonMode) {
    console.log(JSON.stringify(brief, null, 2));
  } else {
    console.log(`=== Session Startup Brief: ${brief.project} ===`);
    console.log(`Permissions : ${brief.permissionsProfile} | Memory Manifest: ${brief.manifestVersion || "not set"}`);
    if (brief.northStar) console.log(`North Star  : ${brief.northStar}`);
    if (brief.topOpenTasks.length > 0) {
      console.log(`Open Tasks (${brief.openTasksCount}):`);
      for (const t of brief.topOpenTasks) {
        console.log(`  - [${t.quadrant}] ${t.id}: ${t.title} (DoD ${t.checklist})`);
      }
    }
    if (brief.redLines.length > 0) {
      console.log(`Red Lines:`);
      for (const rl of brief.redLines) console.log(`  ! ${rl}`);
    }
    if (brief.recentAdrs.length > 0) {
      console.log(`Recent ADRs : ${brief.recentAdrs.join(" | ")}`);
    }
    if (brief.latestDaily) {
      console.log(`Latest Daily: ${brief.latestDaily.file} (${brief.latestDaily.headings.join(" · ")})`);
    }
  }
}
