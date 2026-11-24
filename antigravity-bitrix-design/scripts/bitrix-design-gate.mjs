#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Design Taste Art-Direction Dealer & Fail-Closed Visual Gate (Node.js 18+).
 * Inspired by Leonxlnx/taste-skill (draw.mjs + gate.mjs) and emilkowalski/skills (ui/performance craft).
 *
 * Modes:
 *   1. Static Visual & Craft Gate:
 *        node bitrix-design-gate.mjs <target-dir> [--json]
 *      Ends on deterministic verdict: GATE: PASS | GATE: FAIL | GATE: SETUP
 *
 *   2. Deterministic Art-Direction Dealer (--deal):
 *        node bitrix-design-gate.mjs --deal <auto-parts|retail|services|b2b|manager> [--seed <project-name>] [--json]
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

function getFlagValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--") ? args[idx + 1] : null;
}

const dealArchetype = getFlagValue("--deal");
const seedArg = getFlagValue("--seed") || "";

const ART_DIRECTIONS = {
  "auto-parts": [
    {
      name: "Industrial Precision Catalog",
      palette: { bg: "#F8FAFC", surface: "#FFFFFF", ink: "#0F172A", muted: "#475569", accent: "#1D4ED8", border: "rgba(15,23,42,0.12)" },
      typography: { heading: "Inter / Golos Text (600–700, tight tracking)", mono: "JetBrains Mono / tabular-nums for OEM & prices" },
      layout: "Left-aligned VIN/OEM search bar first, dense scannable spec table, sticky mobile buy/analog bar, 4px–6px crisp radii.",
      avoid: "Avoid marketing carousels above catalog search or oversized 3-col icon cards.",
    },
    {
      name: "Dark Workshop Technical Spec",
      palette: { bg: "#111317", surface: "#181B20", ink: "#F3F4F6", muted: "#9CA3AF", accent: "#F59E0B", border: "rgba(255,255,255,0.10)" },
      typography: { heading: "Manrope / IBM Plex Sans (600)", mono: "IBM Plex Mono tabular-nums for SKU/stock/price" },
      layout: "High-contrast technical grid, explicit warehouse availability pills (6px status dot), zero decorative gradients.",
      avoid: "Avoid neon glows, low-contrast gray-on-dark labels, or animated card flips.",
    },
  ],
  retail: [
    {
      name: "Editorial Object-First Storefront",
      palette: { bg: "#FFFFFF", surface: "#F7F7F5", ink: "#141413", muted: "#5C5C57", accent: "#0F766E", border: "rgba(20,20,19,0.10)" },
      typography: { heading: "Onest / Plus Jakarta Sans (600)", mono: "Tabular numerals for price & savings" },
      layout: "Large real product photography (4:5 or 1:1), 1 primary CTA per card, clean horizontal filter bar + slide-over mobile filter drawer.",
      avoid: "Avoid cluttering product cards with >3 badges or competing secondary buttons.",
    },
    {
      name: "Crisp Department Grid",
      palette: { bg: "#FAFAFA", surface: "#FFFFFF", ink: "#18181B", muted: "#52525B", accent: "#2563EB", border: "rgba(24,24,27,0.10)" },
      typography: { heading: "Golos Text / Inter (600)", mono: "System UI tabular-nums" },
      layout: "Fast category navigation, transparent delivery/pickup strip above fold, instant Out-of-Stock analog switcher.",
      avoid: "Avoid auto-rotating hero sliders or popups blocking first paint.",
    },
  ],
  services: [
    {
      name: "Trust-First Local Craft",
      palette: { bg: "#FFFFFF", surface: "#F4F5F7", ink: "#111827", muted: "#4B5563", accent: "#0369A1", border: "rgba(17,24,39,0.11)" },
      typography: { heading: "Golos Text / Manrope (700)", mono: "Tabular numerals for transparent price list & timings" },
      layout: "5-second value proposition + real location/hours/phone + transparent service price table + single booking/quote CTA.",
      avoid: "Avoid stock handshake photos, vague slogans, or hidden prices behind mandatory phone gates.",
    },
  ],
  b2b: [
    {
      name: "Swiss Corporate Ledger",
      palette: { bg: "#FFFFFF", surface: "#F8FAFC", ink: "#0F172A", muted: "#475569", accent: "#1E40AF", border: "rgba(15,23,42,0.12)" },
      typography: { heading: "IBM Plex Sans / Inter (600)", mono: "IBM Plex Mono for specs, tolerances, and SLA metrics" },
      layout: "Asymmetric editorial grid, verifiable case metrics, downloadable spec sheets, concise RFQ form.",
      avoid: "Avoid generic SaaS purple gradients or unverified '1000+ happy clients' claims.",
    },
  ],
  manager: [
    {
      name: "Native High-Density IDE / Console",
      palette: { bg: "#16181D", surface: "#1E2128", ink: "#E5E7EB", muted: "#9CA3AF", accent: "#3B82F6", border: "rgba(255,255,255,0.10)" },
      typography: { heading: "System UI / Inter (600, 12.5–14px)", mono: "JetBrains Mono / Consolas tabular-nums" },
      layout: "3px–4px radii, 6px semantic dots, keyboard-friendly tables, 0ms instant filtering (no decorative transitions).",
      avoid: "Avoid pill buttons, dashboard bloat cards, or animations on table sorting/filtering.",
    },
  ],
};

if (dealArchetype) {
  const key = dealArchetype.toLowerCase();
  const pool = ART_DIRECTIONS[key] || ART_DIRECTIONS["auto-parts"];
  const hash = crypto.createHash("sha256").update(`${key}:${seedArg || "default"}`).digest();
  const picked = pool[hash[0] % pool.length];
  const result = {
    archetype: key,
    seed: seedArg || "default",
    direction: picked,
    motionDefaults: {
      enterEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
      enterMs: key === "manager" ? 0 : 180,
      morphEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
      allowedProperties: ["transform", "opacity"],
      requireReducedMotionMediaQuery: true,
    },
    bitrixGuardrails: [
      "Load CSS/JS strictly via Bitrix\\Main\\Page\\Asset::getInstance()",
      "Keep all custom templates isolated inside /local/templates/",
      "Preserve single <h1>, Schema.org JSON-LD/Microdata, and explicit img width/height/alt",
      "Verify GATE: PASS at 1440px and 390px before closing task",
    ],
  };
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`=== 1C-Bitrix Design Taste Direction (${key}) ===`);
    console.log(`Direction : ${picked.name}`);
    console.log(`Palette   : bg=${picked.palette.bg} surface=${picked.palette.surface} ink=${picked.palette.ink} accent=${picked.palette.accent}`);
    console.log(`Type      : ${picked.typography.heading} | ${picked.typography.mono}`);
    console.log(`Layout    : ${picked.layout}`);
    console.log(`Avoid     : ${picked.avoid}`);
  }
  process.exit(0);
}

// Static Visual & Craft Gate mode
const valueFlags = new Set(["--deal", "--seed"]);
let targetArg = null;
for (let i = 0; i < args.length; i++) {
  if (valueFlags.has(args[i])) {
    i++;
    continue;
  }
  if (!args[i].startsWith("--") && !targetArg) targetArg = args[i];
}
const rootDir = path.resolve(targetArg || process.cwd());

if (!fs.existsSync(rootDir)) {
  if (jsonMode) console.log(JSON.stringify({ gate: "SETUP", reason: `Path not found: ${rootDir}`, findings: [] }, null, 2));
  else console.log(`GATE: SETUP (path not found: ${rootDir})`);
  process.exit(1);
}

const SKIP_DIRS = new Set([".git", "node_modules", "bitrix", "upload", "vendor", "cache", "managed_cache"]);
const scanFiles = [];

function walk(dir, depth = 0) {
  if (depth > 8) return;
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
    } else if (/\.(php|css|scss|html)$/i.test(e.name)) {
      scanFiles.push(full);
    }
  }
}

// Prefer scanning /local/templates if present, else scan targetDir directly
const bitrixTemplatesDir = path.join(rootDir, "local", "templates");
const scanRoot = fs.existsSync(bitrixTemplatesDir) ? bitrixTemplatesDir : rootDir;
walk(scanRoot);

if (scanFiles.length === 0) {
  const res = {
    gate: "SETUP",
    scanRoot,
    filesChecked: 0,
    critical: [],
    warnings: [],
    message: "No template files (.php/.css/.scss/.html) found to audit.",
  };
  if (jsonMode) console.log(JSON.stringify(res, null, 2));
  else console.log("GATE: SETUP");
  process.exit(0);
}

const critical = [];
const warnings = [];
let hasCssMotion = false;
let hasReducedMotion = false;

for (const file of scanFiles) {
  const rel = path.relative(rootDir, file).replace(/\\/g, "/");
  const ext = path.extname(file).toLowerCase();
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);

  // 1. PHP template checks
  if (ext === ".php") {
    if (path.basename(file).toLowerCase() === "header.php" && /<head\b/i.test(content)) {
      if (!/<meta\b[^>]*name=["']viewport["']/i.test(content)) {
        critical.push({ code: "MISSING_VIEWPORT", file: rel, line: 1, message: "header.php lacks <meta name=\"viewport\"> — breaks 390px mobile layout." });
      }
    }
    lines.forEach((ln, idx) => {
      if (/<style\b/i.test(ln)) {
        critical.push({ code: "INLINE_STYLE_IN_PHP", file: rel, line: idx + 1, message: "Inline <style> in PHP template; load CSS via Asset::getInstance()->addCss()." });
      }
      if (/<script\b(?![^>]*application\/ld\+json)(?![^>]*\bsrc=)/i.test(ln)) {
        warnings.push({ code: "INLINE_SCRIPT_IN_PHP", file: rel, line: idx + 1, message: "Inline <script> in PHP template; prefer Asset::getInstance()->addJs()." });
      }
    });
  }

  // 2. Placeholder / AI-slop content detection
  lines.forEach((ln, idx) => {
    if (/\blorem\s+ipsum\b|via\.placeholder\.com|placehold\.co\/\d+/i.test(ln)) {
      critical.push({ code: "AI_SLOP_PLACEHOLDER", file: rel, line: idx + 1, message: "Placeholder text/image detected (Lorem ipsum / placeholder service)." });
    }
  });

  // 3. IMG alt / CLS checks (HTML & PHP)
  if (ext === ".php" || ext === ".html") {
    lines.forEach((ln, idx) => {
      const imgs = ln.match(/<img\b[^>]*>/gi) || [];
      for (const tag of imgs) {
        if (!/\balt\s*=/i.test(tag)) {
          warnings.push({ code: "IMG_MISSING_ALT", file: rel, line: idx + 1, message: "<img> missing alt attribute (accessibility & SEO)." });
        }
        if (!/\bwidth\s*=/i.test(tag) || !/\bheight\s*=/i.test(tag)) {
          warnings.push({ code: "IMG_MISSING_DIMENSIONS", file: rel, line: idx + 1, message: "<img> missing explicit width/height (risks CLS layout shift)." });
        }
      }
    });
  }

  // 4. CSS / Motion performance checks
  if (ext === ".css" || ext === ".scss") {
    if (/\b(?:transition|animation)\s*:/i.test(content) || /@keyframes\b/i.test(content)) {
      hasCssMotion = true;
    }
    if (/prefers-reduced-motion/i.test(content)) {
      hasReducedMotion = true;
    }
    lines.forEach((ln, idx) => {
      if (/\btransition\s*:\s*all\b/i.test(ln)) {
        critical.push({ code: "MOTION_TRANSITION_ALL", file: rel, line: idx + 1, message: "Avoid 'transition: all' — animate only GPU-safe transform/opacity." });
      }
      if (/\btransition(?:-property)?\s*:[^;]*\b(?:width|height|top|left|margin|padding)\b/i.test(ln)) {
        warnings.push({ code: "MOTION_LAYOUT_THRASH", file: rel, line: idx + 1, message: "Animating layout property (width/height/top/left/margin/padding) hurts mobile INP." });
      }
    });
  }
}

if (hasCssMotion && !hasReducedMotion) {
  warnings.push({
    code: "MISSING_REDUCED_MOTION",
    file: path.relative(rootDir, scanRoot).replace(/\\/g, "/") || ".",
    line: 1,
    message: "CSS transitions/animations detected without @media (prefers-reduced-motion: reduce).",
  });
}

const gate = critical.length > 0 ? "FAIL" : "PASS";
const report = {
  gate,
  scanRoot: path.relative(rootDir, scanRoot).replace(/\\/g, "/") || ".",
  filesChecked: scanFiles.length,
  criticalCount: critical.length,
  warningCount: warnings.length,
  critical: critical.slice(0, 30),
  warnings: warnings.slice(0, 30),
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`=== 1C-Bitrix Design & Visual Gate (${report.filesChecked} files checked) ===`);
  for (const c of report.critical) {
    console.log(`[FAIL] ${c.code} ${c.file}:${c.line} — ${c.message}`);
  }
  for (const w of report.warnings) {
    console.log(`[WARN] ${w.code} ${w.file}:${w.line} — ${w.message}`);
  }
  console.log(`GATE: ${gate}`);
}

process.exit(gate === "FAIL" ? 2 : 0);
