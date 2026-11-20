#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Project Structural Scanner (Node.js 18+).
 * Quickly inventories /local/, classes, templates, components, AJAX endpoints,
 * urlrewrite.php, init.php, multisite hints, and existing Markdown docs without
 * scanning heavy /bitrix/, /upload/, or cache folders.
 *
 * Usage:
 *   node bitrix-project-scan.mjs [project-root] [--json]
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
]);

function rel(p) {
  return path.relative(rootDir, p).replace(/\\/g, "/");
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function walkFiles(dir, extFilter, maxDepth = 6, depth = 0, out = []) {
  if (!fs.existsSync(dir) || depth > maxDepth) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkFiles(full, extFilter, maxDepth, depth + 1, out);
    } else if (e.isFile() && (!extFilter || extFilter(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function detectClasses(classesDir) {
  const files = walkFiles(classesDir, (n) => n.endsWith(".php"), 6);
  const namespaces = new Set();
  const classes = [];
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    const nsMatch = content.match(/^\s*namespace\s+([^;]+);/m);
    const clsMatch = content.match(/^\s*(?:final\s+|abstract\s+)?(?:class|interface|trait|enum)\s+([A-Za-z0-9_]+)/m);
    if (nsMatch) namespaces.add(nsMatch[1].trim());
    if (clsMatch) {
      classes.push({
        file: rel(f),
        fqcn: nsMatch ? `${nsMatch[1].trim()}\\${clsMatch[1]}` : clsMatch[1],
      });
    }
  }
  return { namespaces: [...namespaces].sort(), count: classes.length, sample: classes.slice(0, 60) };
}

function inspectInitPhp(initPath) {
  if (!fs.existsSync(initPath)) return { exists: false };
  const content = fs.readFileSync(initPath, "utf8");
  const events = [...content.matchAll(/addEventHandler(?:Compatible)?\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/gi)].map(
    (m) => `${m[1]}:${m[2]}`
  );
  const constants = [...content.matchAll(/define\s*\(\s*['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1]);
  const hasAutoload = /spl_autoload_register|registerAutoLoadClasses/i.test(content);
  const hasSiteDetection = /HTTP_HOST|SITE_ID|SiteConfig/i.test(content);
  return {
    exists: true,
    file: rel(initPath),
    hasAutoload,
    hasSiteDetection,
    constants: [...new Set(constants)].slice(0, 25),
    eventHandlers: [...new Set(events)].slice(0, 30),
  };
}

function inspectUrlRewrite(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, rulesCount: 0, conditions: [] };
  const content = fs.readFileSync(filePath, "utf8");
  const conditions = [...content.matchAll(/['"]CONDITION['"]\s*=>\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return {
    exists: true,
    rulesCount: conditions.length,
    conditions: conditions.slice(0, 25),
  };
}

function detectCustomComponents(compDir) {
  const namespaces = listDirs(compDir);
  const components = [];
  for (const ns of namespaces) {
    const names = listDirs(path.join(compDir, ns));
    for (const name of names) {
      components.push(`${ns}:${name}`);
    }
  }
  return components;
}

const topDirs = listDirs(rootDir).filter((d) => !SKIP_DIRS.has(d));
const localDir = path.join(rootDir, "local");
const phpInterfaceDir = path.join(localDir, "php_interface");
const classesDir = path.join(phpInterfaceDir, "classes");
const modulesDir = path.join(localDir, "modules");
const templatesDir = path.join(localDir, "templates");
const componentsDir = path.join(localDir, "components");
const ajaxDir = path.join(localDir, "ajax");

const templates = listDirs(templatesDir).map((tpl) => {
  const tplCompDir = path.join(templatesDir, tpl, "components");
  const overrides = [];
  for (const ns of listDirs(tplCompDir)) {
    for (const cmp of listDirs(path.join(tplCompDir, ns))) {
      overrides.push(`${ns}:${cmp}`);
    }
  }
  return { name: tpl, componentOverridesCount: overrides.length, componentOverridesSample: overrides.slice(0, 20) };
});

const ajaxFiles = fs.existsSync(ajaxDir)
  ? fs.readdirSync(ajaxDir).filter((f) => f.endsWith(".php")).sort()
  : [];

const mdFiles = walkFiles(rootDir, (n) => /\.md$/i.test(n), 4).map(rel).sort();
const hasMemoryHub = fs.existsSync(path.join(rootDir, "docs", "memory", "README.md"));
const hasBacklog = fs.existsSync(path.join(rootDir, "docs", "backlog.md"));
const hasRootAgents = fs.existsSync(path.join(rootDir, "AGENTS.md"));
const hasGit = fs.existsSync(path.join(rootDir, ".git"));
const hasComposer = fs.existsSync(path.join(rootDir, "composer.json"));
const hasBitrixDir = fs.existsSync(path.join(rootDir, "bitrix"));
const hasLocalDir = fs.existsSync(localDir);

const isExistingProject = hasLocalDir || hasBitrixDir || fs.existsSync(path.join(rootDir, "urlrewrite.php"));

const result = {
  root: rootDir,
  detectedType: isExistingProject ? "brownfield" : "greenfield_or_empty",
  signals: {
    hasGit,
    hasBitrixDir,
    hasLocalDir,
    hasComposer,
    hasRootAgents,
    hasMemoryHub,
    hasBacklog,
    hasRobotsTxt: fs.existsSync(path.join(rootDir, "robots.txt")),
    hasSitemapXml: fs.existsSync(path.join(rootDir, "sitemap.xml")),
    hasLlmsEndpoint: fs.existsSync(path.join(rootDir, "llms.txt")) || fs.existsSync(path.join(rootDir, "llms.php")),
  },
  topLevelDirectories: topDirs,
  initPhp: inspectInitPhp(path.join(phpInterfaceDir, "init.php")),
  urlrewrite: inspectUrlRewrite(path.join(rootDir, "urlrewrite.php")),
  localModules: listDirs(modulesDir),
  classes: detectClasses(classesDir),
  templates,
  customComponents: detectCustomComponents(componentsDir),
  ajaxEndpoints: ajaxFiles,
  markdownDocsCount: mdFiles.length,
  markdownDocsSample: mdFiles.slice(0, 30),
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`=== 1C-Bitrix Project Scan: ${result.root} ===`);
  console.log(`Detected Mode : ${result.detectedType}`);
  console.log(
    `Signals       : git=${hasGit}, local/=${hasLocalDir}, bitrix/=${hasBitrixDir}, composer=${hasComposer}, AGENTS.md=${hasRootAgents}, docs/memory=${hasMemoryHub}, backlog=${hasBacklog}`
  );
  console.log(`Top-Level Dirs: ${topDirs.join(", ") || "none"}`);
  console.log(`Local Modules : ${result.localModules.join(", ") || "none"}`);
  console.log(`Templates     : ${templates.map((t) => `${t.name} (${t.componentOverridesCount} overrides)`).join(", ") || "none"}`);
  console.log(`Custom Comps  : ${result.customComponents.join(", ") || "none"}`);
  console.log(`PHP Classes   : ${result.classes.count} class(es) | Namespaces: ${result.classes.namespaces.join(", ") || "none"}`);
  console.log(`AJAX (/local) : ${ajaxFiles.join(", ") || "none"}`);
  console.log(`urlrewrite.php: ${result.urlrewrite.exists ? `${result.urlrewrite.rulesCount} rules` : "missing"}`);
  console.log(
    `init.php      : ${result.initPhp.exists ? `autoload=${result.initPhp.hasAutoload}, multisite=${result.initPhp.hasSiteDetection}, events=${result.initPhp.eventHandlers.length}` : "missing"}`
  );
  console.log(`Markdown Docs : ${result.markdownDocsCount} file(s) found`);
}
