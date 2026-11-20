#!/usr/bin/env node
/**
 * Static SEO & GEO audit for 1C-Bitrix codebases (zero dependencies).
 * Usage: node bitrix-code-audit.mjs [project-root] [--json]
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

const report = {
  root: rootDir,
  critical: [],
  warnings: [],
  info: [],
  stats: {
    phpFilesScanned: 0,
    templatePhpCount: 0,
  },
};

function addIssue(level, code, file, message, line = null) {
  report[level].push({
    code,
    file: path.relative(rootDir, file).replace(/\\/g, "/"),
    line,
    message,
  });
}

// 1. Check urlrewrite.php for duplicate numeric keys
const urlrewritePath = path.join(rootDir, "urlrewrite.php");
if (fs.existsSync(urlrewritePath)) {
  const content = fs.readFileSync(urlrewritePath, "utf8");
  const lines = content.split(/\r?\n/);
  const seenKeys = new Map();
  const keyLineRe = /^\s{1,4}(\d+)\s*=>\s*(?:array\s*\(|\[)?\s*$/i;

  lines.forEach((lineText, idx) => {
    const match = lineText.match(keyLineRe);
    if (match) {
      const nextLine = lines[idx + 1] || "";
      const hasInlineArray = /=>\s*(?:array\s*\(|\[)/i.test(lineText);
      const hasNextArray = /^\s*(?:array\s*\(|\[)/i.test(nextLine);
      if (!hasInlineArray && !hasNextArray) return;

      const key = match[1];
      const lineNum = idx + 1;
      if (seenKeys.has(key)) {
        addIssue(
          "critical",
          "URLREWRITE_DUPLICATE_KEY",
          urlrewritePath,
          `Duplicate $arUrlRewrite key '${key}' (first seen at line ${seenKeys.get(key)}). Later rule silently overwrites earlier rule.`,
          lineNum
        );
      } else {
        seenKeys.set(key, lineNum);
      }
    }
  });
  report.info.push({
    code: "URLREWRITE_CHECKED",
    file: "urlrewrite.php",
    message: `Checked ${seenKeys.size} unique top-level rule keys.`,
  });
} else {
  addIssue("warnings", "URLREWRITE_MISSING", urlrewritePath, "urlrewrite.php not found in project root.");
}

// 2. Check robots.txt (root or multisite docs/seo/robots/)
const robotsPath = path.join(rootDir, "robots.txt");
const multisiteRobotsDir = path.join(rootDir, "docs", "seo", "robots");
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, "utf8");
  if (!/Sitemap:/i.test(robots)) {
    addIssue("warnings", "ROBOTS_NO_SITEMAP", robotsPath, "robots.txt does not contain a Sitemap: directive.");
  }
  if (/Disallow:\s*\/\s*$/m.test(robots)) {
    addIssue("critical", "ROBOTS_DISALLOW_ALL", robotsPath, "robots.txt contains 'Disallow: /' blocking entire site.");
  }
} else if (fs.existsSync(multisiteRobotsDir)) {
  const rFiles = fs.readdirSync(multisiteRobotsDir).filter((f) => f.endsWith(".txt"));
  if (rFiles.length > 0) {
    report.info.push({
      code: "ROBOTS_MULTISITE",
      file: "docs/seo/robots",
      message: `Found ${rFiles.length} multisite robots configuration file(s).`,
    });
  } else {
    addIssue("critical", "ROBOTS_MISSING", robotsPath, "robots.txt is missing in document root.");
  }
} else {
  addIssue("critical", "ROBOTS_MISSING", robotsPath, "robots.txt is missing in document root.");
}

// 3. Check sitemap.xml and GEO llms.txt / llms.php
const sitemapPath = path.join(rootDir, "sitemap.xml");
const llmsPhpPath = path.join(rootDir, "llms.php");
const llmsTxtPath = path.join(rootDir, "llms.txt");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (!/<loc>/i.test(sitemap)) {
    addIssue("critical", "SITEMAP_EMPTY", sitemapPath, "sitemap.xml contains no <loc> entries (empty index or broken generator).");
  }
  if (/http:\/\//i.test(sitemap)) {
    addIssue("warnings", "SITEMAP_HTTP_URLS", sitemapPath, "sitemap.xml contains non-HTTPS http:// URLs.");
  }
} else {
  report.info.push({
    code: "SITEMAP_SERVER_MANAGED",
    file: "sitemap.xml",
    message: "Static sitemap.xml not in git root (verify per-domain sitemap.xml on live server).",
  });
}

if (fs.existsSync(llmsPhpPath) || fs.existsSync(llmsTxtPath)) {
  report.info.push({
    code: "LLMS_TXT_READY",
    file: fs.existsSync(llmsPhpPath) ? "llms.php" : "llms.txt",
    message: "GEO /llms.txt endpoint found in project root.",
  });
} else {
  addIssue("info", "LLMS_TXT_MISSING", llmsTxtPath, "No llms.txt or llms.php found in project root (recommended for GEO / AI search).");
}

// 4. Scan /local/templates and /local/components
const scanDirs = [
  path.join(rootDir, "local", "templates"),
  path.join(rootDir, "local", "components"),
];

const skipDirs = new Set([".git", "node_modules", "vendor", "cache", "managed_cache"]);

function walkPhp(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPhp(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".php")) {
      inspectPhpFile(fullPath, entry.name);
    }
  }
}

function inspectPhpFile(filePath, fileName) {
  report.stats.phpFilesScanned += 1;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  // Check SEO setters in cached template.php
  if (fileName === "template.php") {
    report.stats.templatePhpCount += 1;
    const seoSetterRe = /\$APPLICATION->(SetTitle|SetPageProperty|AddHeadString|SetCanonicalUrl)\s*\(/;
    lines.forEach((lineText, idx) => {
      if (seoSetterRe.test(lineText) && !/^\s*(\/\/|#|\*)/.test(lineText)) {
        addIssue(
          "warnings",
          "SEO_SETTER_IN_TEMPLATE",
          filePath,
          "SEO setter called in template.php (may fail when component cache is warm; move to component_epilog.php).",
          idx + 1
        );
      }
    });
  }

  // Check RestartBuffer() paired with process404 (causes Quirks Mode & broken 404 layout)
  if (/process404\s*\(/i.test(content)) {
    lines.forEach((lineText, idx) => {
      if (/\$APPLICATION->RestartBuffer\s*\(/i.test(lineText) && !/^\s*(\/\/|#|\*)/.test(lineText)) {
        addIssue(
          "warnings",
          "RESTART_BUFFER_404",
          filePath,
          "RestartBuffer() used alongside process404() — strips <!DOCTYPE html> and causes Quirks Mode. Use RestartWorkarea() instead.",
          idx + 1
        );
      }
    });
  }

  // Check inline <style> and <script> (excluding application/ld+json)
  lines.forEach((lineText, idx) => {
    if (/<style\b/i.test(lineText)) {
      addIssue(
        "warnings",
        "INLINE_STYLE",
        filePath,
        "Inline <style> found. Move CSS to Asset::getInstance()->addCss() or external stylesheet.",
        idx + 1
      );
    }
    if (/<script\b(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)/i.test(lineText)) {
      addIssue(
        "info",
        "INLINE_SCRIPT",
        filePath,
        "Inline <script> without src detected. Prefer external JS via Asset::getInstance()->addJs().",
        idx + 1
      );
    }
  });
}

scanDirs.forEach(walkPhp);

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`=== Bitrix SEO & GEO Code Audit: ${report.root} ===`);
  console.log(`PHP files scanned: ${report.stats.phpFilesScanned} (template.php: ${report.stats.templatePhpCount})`);
  console.log(`Critical: ${report.critical.length} | Warnings: ${report.warnings.length} | Info: ${report.info.length}\n`);
  for (const level of ["critical", "warnings", "info"]) {
    if (report[level].length === 0) continue;
    console.log(`[${level.toUpperCase()}]`);
    for (const item of report[level]) {
      const loc = item.line ? `${item.file}:${item.line}` : item.file;
      console.log(`  - (${item.code}) ${loc}: ${item.message}`);
    }
    console.log("");
  }
}
