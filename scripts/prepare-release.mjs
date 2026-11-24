#!/usr/bin/env node
/**
 * Zero-dependency Release Notes & Version Consistency Helper (Node.js 18+).
 * Reads CHANGELOG.md, BACKLOG_ECOSYSTEM.md, plugin manifests, and git log since the last tag
 * to verify version readiness and generate GitHub Release Markdown + gh CLI command.
 *
 * Usage:
 *   node scripts/prepare-release.mjs [--version v2.4.0] [--out release-notes.md] [--dry-run] [--json]
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
function getFlagValue(name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return null;
}

const requestedVersion = getFlagValue("--version");
const outPath = getFlagValue("--out");
const dryRun = args.includes("--dry-run") || !outPath;
const jsonMode = args.includes("--json");
const rootDir = process.cwd();

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

function runGit(gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return "";
  }
}

function parseChangelog(md) {
  const releases = [];
  if (!md) return releases;
  const lines = md.split(/\r?\n/);
  let current = null;
  let currentSection = "";

  for (const line of lines) {
    const h2 = line.match(/^##\s+\[?([^\]\s]+)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/);
    if (h2) {
      if (current) releases.push(current);
      current = {
        version: h2[1].trim(),
        date: h2[2] || "",
        sections: [],
        items: [],
        rawLines: [line],
      };
      currentSection = "";
      continue;
    }
    if (!current) continue;
    current.rawLines.push(line);

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      currentSection = h3[1].trim();
      current.sections.push(currentSection);
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (bullet) {
      current.items.push(bullet[1].trim());
    }
  }
  if (current) releases.push(current);
  return releases;
}

// 1. Scan plugin manifests & IDE extension
const pluginDirs = fs
  .readdirSync(rootDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("antigravity-bitrix-") && d.name !== "antigravity-bitrix-ide-panel")
  .map((d) => d.name)
  .sort();

const modules = [];
for (const dir of pluginDirs) {
  const manifestPath = path.join(rootDir, dir, "plugin.json");
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readSafe(manifestPath));
  const skillsDir = path.join(rootDir, dir, "skills");
  const agentsDir = path.join(rootDir, dir, "agents");
  const scriptsDir = path.join(rootDir, dir, "scripts");
  const skillsCount = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).length
    : 0;
  const agentsCount = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
    : 0;
  const scriptsCount = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".mjs") || f.endsWith(".js")).length
    : 0;
  modules.push({
    name: dir,
    version: manifest.version || "0.0.0",
    skillsCount,
    agentsCount,
    scriptsCount,
  });
}

const idePkgPath = path.join(rootDir, "antigravity-bitrix-ide-panel", "package.json");
if (fs.existsSync(idePkgPath)) {
  const idePkg = JSON.parse(readSafe(idePkgPath));
  modules.push({
    name: "antigravity-bitrix-ide-panel",
    version: idePkg.version || "0.0.0",
    skillsCount: 0,
    agentsCount: 0,
    scriptsCount: 1,
  });
}

// 2. Parse CHANGELOG.md
const changelogMd = readSafe(path.join(rootDir, "CHANGELOG.md"));
const releases = parseChangelog(changelogMd);
const coreModule = modules.find((m) => m.name === "antigravity-bitrix-core");
const latestTag = runGit(["describe", "--tags", "--abbrev=0"]) || "";
const targetVersion = requestedVersion
  ? (requestedVersion.startsWith("v") ? requestedVersion : `v${requestedVersion}`)
  : (releases[0]?.version || (coreModule ? `v${coreModule.version}` : "v0.1.0"));

// 3. Git commits since last tag
const logRange = latestTag ? `${latestTag}..HEAD` : "HEAD";
const commitsRaw = runGit(["log", logRange, "--pretty=format:%h|%ad|%s", "--date=short"]);
const commitsSinceTag = commitsRaw
  ? commitsRaw.split(/\r?\n/).filter(Boolean).map((line) => {
      const [hash, date, ...rest] = line.split("|");
      return { hash, date, message: rest.join("|") };
    })
  : [];

// 4. Backlog snapshot
const backlogMd = readSafe(path.join(rootDir, "BACKLOG_ECOSYSTEM.md")) || readSafe(path.join(rootDir, "docs", "backlog.md"));
const doneIds = [];
const openIds = [];
const cardBlocks = backlogMd.split(/^###\s+/m).slice(1);
for (const block of cardBlocks) {
  const header = block.split(/\r?\n/)[0] || "";
  const idMatch = header.match(/`?([A-Za-z0-9_#-]+)`?\s*[—–-]\s*(.+)/);
  if (!idMatch) continue;
  const checks = [...block.matchAll(/^\s*[-*]\s+\[([ xX])\]/gm)];
  if (checks.length === 0) continue;
  const allDone = checks.every((m) => m[1].toLowerCase() === "x");
  if (allDone) doneIds.push(idMatch[1]);
  else openIds.push(idMatch[1]);
}

// 5. Version consistency checks
const warnings = [];
const matchedRelease = releases.find(
  (r) => r.version === targetVersion || `v${r.version}` === targetVersion
);
if (!matchedRelease) {
  warnings.push(`Секция '${targetVersion}' ещё не добавлена в CHANGELOG.md.`);
}
const cleanTargetVer = targetVersion.replace(/^v/, "");
if (coreModule && coreModule.version !== cleanTargetVer) {
  warnings.push(
    `Версия antigravity-bitrix-core/plugin.json (${coreModule.version}) отличается от целевой (${cleanTargetVer}).`
  );
}
const dirtyTree = runGit(["status", "--porcelain"]);
if (dirtyTree) {
  warnings.push(`В рабочем дереве Git есть незакоммиченные изменения (${dirtyTree.split(/\r?\n/).length} файл.).`);
}

// 6. Compose GitHub Release Markdown
const today = new Date().toISOString().slice(0, 10);
const mdLines = [];
mdLines.push(`# 1C-Bitrix Antigravity Ecosystem ${targetVersion} (${matchedRelease?.date || today})`);
mdLines.push("");

if (matchedRelease) {
  const body = matchedRelease.rawLines.slice(1).join("\n").trim();
  if (body) {
    mdLines.push(body);
    mdLines.push("");
  }
}

if (commitsSinceTag.length > 0) {
  mdLines.push(`## Коммиты после ${latestTag || "старта"} (${commitsSinceTag.length})`);
  mdLines.push("");
  for (const c of commitsSinceTag) {
    mdLines.push(`- \`${c.hash}\` (${c.date}) ${c.message}`);
  }
  mdLines.push("");
}

mdLines.push("## Состав модулей в релизе");
mdLines.push("");
mdLines.push("| Модуль | Версия | Скиллы | Субагенты | Скрипты |");
mdLines.push("|---|---:|---:|---:|---:|");
for (const m of modules) {
  mdLines.push(`| \`${m.name}\` | \`${m.version}\` | ${m.skillsCount} | ${m.agentsCount} | ${m.scriptsCount} |`);
}
mdLines.push("");
mdLines.push(`> Прогресс бэклога: **${doneIds.length}** выполнено / **${openIds.length}** открыто.`);
mdLines.push("");

const releaseMarkdown = mdLines.join("\n");
const ghCommand = `gh release create ${targetVersion} --title "${targetVersion} — 1C-Bitrix Antigravity Ecosystem" --notes-file ${outPath || "release-notes.md"}`;

if (!dryRun && outPath) {
  const absOut = path.resolve(rootDir, outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, releaseMarkdown, "utf8");
}

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        targetVersion,
        latestTag,
        commitsSinceTagCount: commitsSinceTag.length,
        modules,
        backlog: { done: doneIds.length, open: openIds.length },
        warnings,
        ghCommand,
      },
      null,
      2
    )
  );
} else {
  if (warnings.length > 0) {
    console.error("=== Предупреждения перед релизом ===");
    for (const w of warnings) console.error(`- ${w}`);
    console.error("");
  }
  if (dryRun) {
    console.log(releaseMarkdown);
    console.log("---");
    console.log(`Команда публикации (после git push): ${ghCommand}`);
  } else {
    console.log(`Release notes записаны в ${outPath}`);
    console.log(`Команда публикации (после git push): ${ghCommand}`);
  }
}
