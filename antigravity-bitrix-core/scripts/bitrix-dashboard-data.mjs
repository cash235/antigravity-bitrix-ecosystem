#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Project Command Center & Orchestrator Data Collector v2.0 (Node.js 18+).
 * Aggregates real facts about structure, memory/docs health, personalized vs basic
 * knowledge/integrations, backlog progress, Git status/history, installed 4-plugin Bitrix ecosystem,
 * Context Budget overhead, and multi-track PM/Orchestrator signals into a compact JSON snapshot.
 *
 * Usage:
 *   node bitrix-dashboard-data.mjs [project-root] [--json]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

function readSafe(filePath, maxBytes = 120000) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const buf = fs.readFileSync(filePath);
    return buf.subarray(0, maxBytes).toString("utf8");
  } catch {
    return "";
  }
}

function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words * 1.35);
}

function fileInfo(relPath) {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) return { exists: false, path: relPath, ageDays: null, size: 0 };
  const st = fs.statSync(full);
  const ageDays = Math.max(0, Math.floor((Date.now() - st.mtimeMs) / 86400000));
  return {
    exists: true,
    path: relPath,
    updatedAt: st.mtime.toISOString().slice(0, 10),
    ageDays,
    size: st.size,
  };
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function walkFiles(dir, extFilter, maxDepth = 5, depth = 0, out = []) {
  if (!fs.existsSync(dir) || depth > maxDepth) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
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

function runGit(gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

// 1. Structural Scan (/local/, classes, templates, components, AJAX, urlrewrite, init.php)
const localDir = path.join(rootDir, "local");
const classesDir = path.join(localDir, "php_interface", "classes");
const templatesDir = path.join(localDir, "templates");
const componentsDir = path.join(localDir, "components");
const ajaxDir = path.join(localDir, "ajax");

const classFiles = walkFiles(classesDir, (n) => n.endsWith(".php"), 6);
const namespaces = new Set();
let classCount = 0;
let codeCorpus = "";

for (const f of classFiles) {
  const txt = readSafe(f, 32000);
  const ns = txt.match(/^\s*namespace\s+([^;]+);/m);
  if (ns) namespaces.add(ns[1].trim());
  if (/^\s*(?:final\s+|abstract\s+)?(?:class|interface|trait|enum)\s+[A-Za-z0-9_]+/m.test(txt)) {
    classCount++;
  }
  if (codeCorpus.length < 250000) codeCorpus += "\n" + txt.slice(0, 4000);
}

const initContent = readSafe(path.join(localDir, "php_interface", "init.php"), 80000);
const urlrewriteContent = readSafe(path.join(rootDir, "urlrewrite.php"), 50000);
const pkgJsonContent = readSafe(path.join(rootDir, "package.json"), 20000);
const composerContent = readSafe(path.join(rootDir, "composer.json"), 20000);

let hasViewportMeta = false;
const templates = listDirs(templatesDir).map((tpl) => {
  const tplDir = path.join(templatesDir, tpl);
  const headerTxt = readSafe(path.join(tplDir, "header.php"), 24000);
  const footerTxt = readSafe(path.join(tplDir, "footer.php"), 12000);
  if (/name=["']viewport["']/i.test(headerTxt)) hasViewportMeta = true;
  if (codeCorpus.length < 320000) codeCorpus += "\n" + headerTxt + "\n" + footerTxt;
  const tplCompDir = path.join(tplDir, "components");
  let overrides = 0;
  for (const ns of listDirs(tplCompDir)) {
    overrides += listDirs(path.join(tplCompDir, ns)).length;
  }
  return { name: tpl, componentOverrides: overrides };
});

const customComponents = [];
for (const ns of listDirs(componentsDir)) {
  for (const name of listDirs(path.join(componentsDir, ns))) {
    customComponents.push(`${ns}:${name}`);
  }
}

const ajaxEndpoints = fs.existsSync(ajaxDir)
  ? fs.readdirSync(ajaxDir).filter((f) => f.endsWith(".php")).sort()
  : [];

const includesTxt = walkFiles(path.join(localDir, "includes"), (n) => n.endsWith(".php"), 2)
  .map((f) => readSafe(f, 8000))
  .join("\n");

const fullCodeSignal = `${initContent}\n${urlrewriteContent}\n${pkgJsonContent}\n${composerContent}\n${includesTxt}\n${codeCorpus}`;

// 2. Canonical Memory & Docs Health
const memoryFiles = {
  rootAgents: fileInfo("AGENTS.md"),
  memoryIndex: fileInfo("docs/memory/README.md"),
  codemap: fileInfo("docs/memory/codemap.md"),
  decisions: fileInfo("docs/memory/decisions.md"),
  status: fileInfo("docs/memory/status.md"),
  backlog: fileInfo("docs/backlog.md"),
};

const rootAgentsText = readSafe(path.join(rootDir, "AGENTS.md"), 40000);
const codemapText = readSafe(path.join(rootDir, "docs/memory/codemap.md"), 120000);
const decisionsText = readSafe(path.join(rootDir, "docs/memory/decisions.md"), 120000);
const statusText = readSafe(path.join(rootDir, "docs/memory/status.md"), 120000);
const backlogText = readSafe(path.join(rootDir, "docs/backlog.md"), 80000);
const seoPlanText = readSafe(path.join(rootDir, "docs/seo/MASTER_SEO_PLAN.md"), 80000);
const docsCorpus = `${codemapText}\n${decisionsText}\n${statusText}\n${backlogText}\n${seoPlanText}`;

const adrCount = [...decisionsText.matchAll(/^###\s+ADR-(\d+)/gm)].length;

const dailyDir = path.join(rootDir, "docs", "daily");
let latestDaily = null;
let dailyCount = 0;
if (fs.existsSync(dailyDir)) {
  const dailyFiles = fs
    .readdirSync(dailyDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const full = path.join(dailyDir, f);
      const st = fs.statSync(full);
      return { file: `docs/daily/${f}`, mtimeMs: st.mtimeMs, updatedAt: st.mtime.toISOString().slice(0, 10) };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  dailyCount = dailyFiles.length;
  if (dailyFiles.length > 0) {
    latestDaily = {
      file: dailyFiles[0].file,
      updatedAt: dailyFiles[0].updatedAt,
      ageDays: Math.max(0, Math.floor((Date.now() - dailyFiles[0].mtimeMs) / 86400000)),
    };
  }
}

// 3. Installed Plugins, Ecosystem Status & Context Budget
const pluginsRoot = path.join(os.homedir(), ".gemini", "config", "plugins");
const installedPlugins = [];
let rulesTokenEstimate = estimateTokens(rootAgentsText);
let skillIndexEntries = 0;
let duplicateSkillNames = [];
const seenSkills = new Map();

if (fs.existsSync(pluginsRoot)) {
  for (const dirName of listDirs(pluginsRoot)) {
    const pDir = path.join(pluginsRoot, dirName);
    const manifestPath = path.join(pDir, "plugin.json");
    if (!fs.existsSync(manifestPath)) continue;
    let manifest = {};
    try {
      manifest = JSON.parse(readSafe(manifestPath, 16000));
    } catch {
      manifest = { name: dirName };
    }
    const skills = listDirs(path.join(pDir, "skills"));
    for (const sk of skills) {
      skillIndexEntries++;
      if (seenSkills.has(sk)) {
        duplicateSkillNames.push(`${sk} (${seenSkills.get(sk)} & ${dirName})`);
      } else {
        seenSkills.set(sk, dirName);
      }
    }
    const agents = fs.existsSync(path.join(pDir, "agents"))
      ? fs.readdirSync(path.join(pDir, "agents")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [];
    const rulesFile = path.join(pDir, "rules", "AGENTS.md");
    const hasRules = fs.existsSync(rulesFile);
    const ruleTokens = hasRules ? estimateTokens(readSafe(rulesFile, 40000)) : 0;
    rulesTokenEstimate += ruleTokens;

    installedPlugins.push({
      dir: dirName,
      name: manifest.name || dirName,
      displayName: manifest.displayName || manifest.name || dirName,
      version: manifest.version || "—",
      disabledByManifest: Boolean(manifest.disabled),
      hasRules,
      ruleTokens,
      skills,
      agents,
      isBitrix: /bitrix/i.test(dirName + " " + (manifest.name || "")),
    });
  }
}

const projectSkills = [
  ...listDirs(path.join(rootDir, ".agent", "skills")),
  ...listDirs(path.join(rootDir, ".agents", "skills")),
];
skillIndexEntries += projectSkills.length;

const ecosystem = {
  core: installedPlugins.find((p) => p.dir === "antigravity-bitrix-core") || null,
  seoGeo: installedPlugins.find((p) => p.dir === "antigravity-bitrix-seo-geo") || null,
  qa: installedPlugins.find((p) => p.dir === "antigravity-bitrix-qa") || null,
  marketing: installedPlugins.find((p) => p.dir === "antigravity-bitrix-marketing") || null,
  legacySeoDuplicate: installedPlugins.find((p) => p.dir === "antigravity-bitrix-seo") || null,
};

const mcpDir = path.join(os.homedir(), ".gemini", "antigravity", "mcp");
const detectedMcps = listDirs(mcpDir);

const contextBudget = {
  alwaysOnRulesTokens: rulesTokenEstimate,
  skillListingsCount: skillIndexEntries,
  estimatedSkillIndexTokens: skillIndexEntries * 45,
  totalBaselineOverheadTokens: rulesTokenEstimate + skillIndexEntries * 45,
  duplicateSkillCollisions: duplicateSkillNames,
  projectLocalSkillsCount: projectSkills.length,
  status:
    duplicateSkillNames.length > 0 || rulesTokenEstimate > 5000 || projectSkills.length > 35
      ? "needs_trim"
      : "healthy",
};

// 4. Knowledge & Integration Readiness Matrix
function evaluateDomain(id, label, category, usedInCode, personalizedInDocs, evidenceUsed, evidenceDocs, personalizePrompt) {
  let status = "not_used";
  let statusLabel = "Не используется";
  if (usedInCode && personalizedInDocs) {
    status = "personalized";
    statusLabel = "Персонализировано";
  } else if (usedInCode && !personalizedInDocs) {
    status = "basic_only";
    statusLabel = "Базовые знания (не персонализировано)";
  } else if (!usedInCode && personalizedInDocs) {
    status = "personalized";
    statusLabel = "Зафиксировано в документации";
  }
  return {
    id,
    label,
    category,
    status,
    statusLabel,
    evidence: [evidenceUsed, evidenceDocs].filter(Boolean).join(" • ") || "Не обнаружено",
    personalizePrompt: status === "basic_only" ? personalizePrompt : null,
  };
}

const cssFrameworksDetected = [];
if (/tailwind|tailwindcss/i.test(fullCodeSignal) || fs.existsSync(path.join(rootDir, "tailwind.config.js")) || fs.existsSync(path.join(rootDir, "tailwind.config.ts"))) {
  cssFrameworksDetected.push("Tailwind CSS");
}
if (/bootstrap|data-bs-|col-xl-|velzon/i.test(fullCodeSignal)) {
  cssFrameworksDetected.push("Bootstrap 5");
}
if (/vue|nuxt|pinia/i.test(pkgJsonContent)) cssFrameworksDetected.push("Vue");
if (/react|next/i.test(pkgJsonContent)) cssFrameworksDetected.push("React");

const hasTestsDir = fs.existsSync(path.join(rootDir, "tests")) || fs.existsSync(path.join(rootDir, "phpunit.xml"));
const hasMarketingDocs = fs.existsSync(path.join(rootDir, "docs", "marketing")) || /позиционирован|оффер|конверси/i.test(docsCorpus);

const knowledgeMatrix = [
  {
    id: "bitrix_d7",
    label: "1C-Bitrix D7 & Официальная документация",
    category: "Платформа",
    status: ecosystem.core ? "personalized" : "basic_only",
    statusLabel: ecosystem.core ? `OK (core v${ecosystem.core.version} + MCP)` : "Базовые знания (установите core)",
    evidence: ecosystem.core
      ? `antigravity-bitrix-core v${ecosystem.core.version} • MCP: ${detectedMcps.filter((m) => /b24|chrome/i.test(m)).join(", ") || "не обнаружены"}`
      : "Плагин antigravity-bitrix-core не найден",
    personalizePrompt: ecosystem.core ? null : "Установи плагин antigravity-bitrix-core",
  },
  {
    id: "architecture_memory",
    label: "Архитектура проекта (codemap.md + ADR)",
    category: "Память",
    status:
      memoryFiles.codemap.exists && memoryFiles.decisions.exists && codemapText.length > 500
        ? "personalized"
        : memoryFiles.codemap.exists
        ? "basic_only"
        : "missing",
    statusLabel:
      memoryFiles.codemap.exists && memoryFiles.decisions.exists && codemapText.length > 500
        ? `OK (${adrCount} ADR, codemap заполнен)`
        : "Требует инициализации (bitrix-project-init)",
    evidence: memoryFiles.codemap.exists
      ? `codemap.md (${memoryFiles.codemap.updatedAt}), ADR: ${adrCount}`
      : "docs/memory/ отсутствует",
    personalizePrompt:
      memoryFiles.codemap.exists && codemapText.length > 500
        ? null
        : "Запусти bitrix-project-init и собери архитектуру проекта в docs/memory/",
  },
  evaluateDomain(
    "frontend_ui",
    `Фронтенд и UI-стек${cssFrameworksDetected.length ? ` (${cssFrameworksDetected.join(", ")})` : ""}`,
    "Frontend",
    cssFrameworksDetected.length > 0 || templates.length > 0,
    /(tailwind|bootstrap|velzon|дизайн-систем|шаблон интерфейса|ui-стек)/i.test(docsCorpus),
    cssFrameworksDetected.length ? `В коде: ${cssFrameworksDetected.join(", ")}` : `Шаблоны: ${templates.map((t) => t.name).join(", ") || "нет"}`,
    /(tailwind|bootstrap|velzon|дизайн-систем|шаблон интерфейса|ui-стек)/i.test(docsCorpus) ? "Описано в docs/memory" : "Не описано в docs/memory",
    `Персонализируй правила и дизайн-систему фронтенда (${cssFrameworksDetected.join(", ") || "шаблона"}) в docs/memory/codemap.md и ADR`
  ),
  evaluateDomain(
    "ecommerce_crm",
    "Интернет-магазин, Склады и CRM",
    "Backend",
    /(DealTable|LeadTable|StoreProductTable|Catalog|OrderProcessor|Bitrix\\Sale|Bitrix\\Crm)/i.test(fullCodeSignal),
    /(StoreRealization|IBLOCK_ID|CATALOG_IBLOCK_ID|b_crm_deal|b_catalog_store|склад|резерв)/i.test(docsCorpus),
    /(DealTable|StoreProductTable|Bitrix\\Sale|Bitrix\\Crm)/i.test(fullCodeSignal) ? "Найдены классы Catalog/Sale/CRM" : "",
    /(StoreRealization|IBLOCK_ID|b_crm_deal|склад)/i.test(docsCorpus) ? "Описаны сущности и правила" : "Нет персонализации правил складов/CRM",
    "Зафиксируй в docs/memory/codemap.md и decisions.md схему инфоблоков каталога, складов, валют и CRM-сделок"
  ),
  evaluateDomain(
    "erp_1c",
    "Обмен с 1С / Внешняя ERP",
    "Интеграции",
    /(1c_exchange|cml2|MYCOMPANY_ID|b_catalog_store_docs|1с|1c)/i.test(fullCodeSignal),
    /(выгрузк[аи]\s+в.*1С|обмен.*1С|для 1С|CLOSEDATE.*1С)/i.test(docsCorpus),
    /(1c_exchange|cml2|b_catalog_store_docs|MYCOMPANY_ID)/i.test(fullCodeSignal) ? "Обнаружены признаки интеграции 1С" : "",
    /(выгрузк[аи]\s+в.*1С|обмен.*1С|для 1С)/i.test(docsCorpus) ? "Правила 1С отражены в ADR" : "Только базовые знания по 1С",
    "Опиши точный регламент обмена с 1С (расписание, сущности, даты, юрлица, Красные линии) в docs/memory/decisions.md"
  ),
  evaluateDomain(
    "seo_geo",
    "SEO & GEO (ИИ-поиск, Schema.org, llms.txt)",
    "SEO & GEO",
    fs.existsSync(path.join(rootDir, "llms.php")) ||
      fs.existsSync(path.join(rootDir, "llms.txt")) ||
      fs.existsSync(path.join(rootDir, "robots.txt")) ||
      /application\/ld\+json|SitemapGenerator/i.test(fullCodeSignal),
    fs.existsSync(path.join(rootDir, "docs", "seo")) || /(Schema\.org|GEO|canonical|hreflang|sitemap)/i.test(docsCorpus),
    ecosystem.seoGeo ? `Плагин seo-geo v${ecosystem.seoGeo.version} активен` : "SEO-элементы в коде",
    fs.existsSync(path.join(rootDir, "docs", "seo")) ? "Есть docs/seo/ и ADR" : "Нет проектного SEO/GEO плана",
    "Проведи аудит через antigravity-bitrix-seo-geo и зафиксируй SEO/GEO стандарты проекта"
  ),
  evaluateDomain(
    "analytics",
    "Веб-аналитика и Воронка (Метрика / GA4 / GTM)",
    "Аналитика",
    /(mc\.yandex\.ru|googletagmanager\.com|gtag\(|seo_event\.php|YANDEX_METRIKA|GA4_PROPERTY)/i.test(fullCodeSignal),
    /(YANDEX_METRIKA|GA4|GTM|seo-report|телеметрия)/i.test(docsCorpus),
    /(mc\.yandex\.ru|googletagmanager\.com|GA4_PROPERTY)/i.test(fullCodeSignal) ? "Счётчики/API найдены в коде" : "",
    /(YANDEX_METRIKA|GA4|seo-report)/i.test(docsCorpus) ? "Задокументировано" : "Цели и ID не зафиксированы в памяти",
    "Зафиксируй ID счётчиков Метрики/GA4/GTM, список целей воронки и фильтр сотрудников в docs/memory/"
  ),
  evaluateDomain(
    "qa_testing",
    "QA, Автотесты и Pre-Launch Контроль",
    "QA",
    hasTestsDir || templates.length > 0,
    hasTestsDir || /UAT|QA Checklist|click-path|browser-qa/i.test(docsCorpus),
    ecosystem.qa ? `Плагин qa v${ecosystem.qa.version} активен` : hasTestsDir ? "Найдены тесты" : "Автотесты не найдены",
    hasTestsDir ? "Есть папка tests/" : "Только ручной UAT (стоит добавить smoke/browser QA)",
    "Запусти bitrix-production-audit и bitrix-browser-qa (375/768/1440px) по ключевым сценариям сайта"
  ),
  evaluateDomain(
    "marketing_cro",
    "Маркетинг, Офферы и Конверсия (CRO)",
    "Маркетинг",
    templates.length > 0,
    hasMarketingDocs,
    ecosystem.marketing ? `Плагин marketing v${ecosystem.marketing.version} активен` : "Публичная витрина есть",
    hasMarketingDocs ? "Конверсионные элементы зафиксированы" : "Нет маркетинг-брифа / CRO-аудита",
    "Запусти bitrix-product-lens и bitrix-conversion-copy для аудита первого экрана, карточек и брошенных корзин"
  ),
  evaluateDomain(
    "legal_security",
    "Безопасность, Кэш и Юр. соответствие (ПДн / RBAC / Redis)",
    "Безопасность",
    /(UserConsent|cookie[-_]?consent|check_bitrix_sessid|GetUserGroupArray|staging_guard|Redis|AUTO_COMPOSITE)/i.test(fullCodeSignal),
    /(152-ФЗ|99-З|Cookie|Staging Guard|UserConsent|RBAC|Redis|Композит)/i.test(docsCorpus),
    /(UserConsent|GetUserGroupArray|Redis)/i.test(fullCodeSignal) ? "Найдены механизмы доступа/кэша" : "",
    /(152-ФЗ|99-З|Staging Guard|Redis|Композит)/i.test(docsCorpus) ? "Зафиксировано в ADR" : "Ограничения безопасности/кэша не персонализированы",
    "Проведи аудит безопасности и производительности (bitrix-production-audit) и запиши Красные линии"
  ),
];

// 5. Backlog Parsing
function parseCheckboxes(mdText, sourceName) {
  const done = [];
  const open = [];
  for (const line of mdText.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (!m) continue;
    const isDone = m[1].toLowerCase() === "x";
    const text = m[2].replace(/\*\*/g, "").trim();
    if (isDone) done.push({ source: sourceName, text });
    else open.push({ source: sourceName, text });
  }
  return { done, open };
}

const bMain = parseCheckboxes(backlogText, "docs/backlog.md");
const bSeo = parseCheckboxes(seoPlanText, "docs/seo/MASTER_SEO_PLAN.md");
const allDoneTasks = [...bMain.done, ...bSeo.done];
const allOpenTasks = [...bMain.open, ...bSeo.open];

// 5.5. Optional QA Preflight Auto-Integration (when antigravity-bitrix-qa is installed)
let qaPreflight = null;
const qaScriptPath = path.join(pluginsRoot, "antigravity-bitrix-qa", "scripts", "bitrix-qa-preflight.mjs");
if (fs.existsSync(qaScriptPath)) {
  try {
    const qaRaw = execFileSync(process.execPath, [qaScriptPath, rootDir, "--json"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15000,
    }).trim();
    if (qaRaw) {
      qaPreflight = JSON.parse(qaRaw);
    }
  } catch {
    qaPreflight = {
      verdict: "INCOMPLETE",
      error: "Failed to execute bitrix-qa-preflight.mjs",
      stats: { phpFiles: 0, jsFiles: 0, ajaxEndpoints: 0 },
      critical: [],
      high: [],
      medium: [],
      info: [],
    };
  }
}

// 6. Git Health & Commit Timeline
const isGitRepo = runGit(["rev-parse", "--is-inside-work-tree"]) === "true";
const gitInfo = {
  isRepo: isGitRepo,
  branch: null,
  totalCommits: 0,
  uncommittedCount: 0,
  modifiedFiles: [],
  untrackedFiles: [],
  checkpoints: [],
  recentCommits: [],
};

if (isGitRepo) {
  gitInfo.branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  gitInfo.totalCommits = parseInt(runGit(["rev-list", "--count", "HEAD"]) || "0", 10) || 0;
  const porcelain = runGit(["status", "--porcelain"]) || "";
  for (const line of porcelain.split(/\r?\n/).filter(Boolean)) {
    const code = line.slice(0, 2);
    const f = line.slice(3).trim();
    if (code === "??") gitInfo.untrackedFiles.push(f);
    else gitInfo.modifiedFiles.push({ status: code.trim(), file: f });
  }
  gitInfo.uncommittedCount = gitInfo.modifiedFiles.length + gitInfo.untrackedFiles.length;

  const tagsRaw = runGit(["tag", "-l", "checkpoint/*"]) || "";
  gitInfo.checkpoints = tagsRaw.split(/\r?\n/).filter(Boolean).slice(-5);

  const logRaw = runGit(["log", "-n", "8", "--pretty=format:%h|%ad|%an|%s", "--date=short"]) || "";
  for (const row of logRaw.split(/\r?\n/).filter(Boolean)) {
    const [hash, date, author, ...msgParts] = row.split("|");
    gitInfo.recentCommits.push({ hash, date, author, message: msgParts.join("|") });
  }
}

// 7. Automated Heuristic PM & Orchestrator Signals
const pmSignals = [];
if (qaPreflight && Array.isArray(qaPreflight.critical) && qaPreflight.critical.length > 0) {
  const sampleFiles = [...new Set(qaPreflight.critical.map((c) => `${c.file}:${c.line}`))].slice(0, 4).join(", ");
  pmSignals.push({
    severity: "critical",
    track: "qa",
    area: "QA / Безопасность",
    model: "flash",
    fallback: "inherit",
    title: `QA Preflight: BLOCK (${qaPreflight.critical.length} критич. замечаний)`,
    detail: `Обнаружено автосканером bitrix-qa-preflight.mjs: ${sampleFiles}.`,
    actionPrompt: `[Модель: flash | Режим: Solo + bitrix-qa-verifier]\nУстрани все CRITICAL замечания из bitrix-qa-preflight.mjs (${sampleFiles}) и повторным прогоном подтверди CRITICAL=0.`,
  });
} else if (qaPreflight && Array.isArray(qaPreflight.high) && qaPreflight.high.length > 0) {
  const sampleFiles = [...new Set(qaPreflight.high.map((c) => `${c.file}:${c.line}`))].slice(0, 4).join(", ");
  pmSignals.push({
    severity: "high",
    track: "qa",
    area: "QA / Стабильность",
    model: "flash",
    fallback: "inherit",
    title: `QA Preflight: ${qaPreflight.high.length} HIGH замечаний`,
    detail: `Проверь найденные риски в ${sampleFiles}.`,
    actionPrompt: `[Модель: flash | Режим: Solo]\nРазбери и исправь HIGH замечания bitrix-qa-preflight.mjs (${sampleFiles}), затем перепроверь вердикт.`,
  });
}
if (!memoryFiles.codemap.exists || !memoryFiles.decisions.exists || !memoryFiles.status.exists) {
  pmSignals.push({
    severity: "high",
    track: "backend",
    area: "Онбординг",
    model: "inherit",
    fallback: "flash",
    title: "Каноническая память проекта не инициализирована",
    detail: "Запустите bitrix-project-init, чтобы Оркестратор собрал архитектуру, legacy-стиль, Красные линии и бэклог.",
    actionPrompt: "[Модель: inherit | Режим: Solo]\nЗапусти bitrix-project-init: проведи опросник (Greenfield/Brownfield), просканируй /local/ и сформируй AGENTS.md, docs/memory/* и docs/backlog.md.",
  });
}
if (!gitInfo.isRepo) {
  pmSignals.push({
    severity: "high",
    track: "qa",
    area: "Git",
    model: "flash",
    fallback: "inherit",
    title: "Репозиторий Git не инициализирован",
    detail: "Без Git нет чекпоинтов и безопасного отката релизов.",
    actionPrompt: "[Модель: flash | Режим: Solo]\nНастрой .gitignore под 1С-Битрикс (исключи /bitrix/, /upload/, кэш и секреты) и инициализируй Git.",
  });
} else if (gitInfo.uncommittedCount > 0) {
  pmSignals.push({
    severity: "medium",
    track: "qa",
    area: "Git",
    model: "flash",
    fallback: "inherit",
    title: `Незакоммиченные изменения (${gitInfo.uncommittedCount} файл.)`,
    detail: "Проверьте diff на отсутствие секретов и зафиксируйте чистый коммит.",
    actionPrompt: "[Модель: flash | Режим: Solo]\nПроверь git status и git diff на отсутствие секретов/мусора и оформи чистый conventional commit.",
  });
}
if (ecosystem.legacySeoDuplicate && ecosystem.seoGeo) {
  pmSignals.push({
    severity: "medium",
    track: "qa",
    area: "Context Budget",
    model: "flash_lite",
    fallback: "flash",
    title: "Дубль плагина antigravity-bitrix-seo тратит контекст",
    detail: `Найдено ${duplicateSkillNames.length} коллизий скиллов — отключите старый antigravity-bitrix-seo в Customizations.`,
    actionPrompt: "Покажи ссылку для отключения старого плагина antigravity-bitrix-seo",
  });
}
if (!hasViewportMeta && templates.length > 0) {
  pmSignals.push({
    severity: "high",
    track: "frontend",
    area: "Мобильная адаптивность",
    model: "flash",
    fallback: "inherit",
    title: "В header.php шаблонов не найден meta viewport",
    detail: "Без viewport мобильная версия сайта и Core Web Vitals критически пострадают.",
    actionPrompt: "[Модель: flash | Режим: Browser QA]\nПроверь <meta name='viewport'> и мобильную вёрстку 375px во всех публичных шаблонах /local/templates/.",
  });
}
for (const item of knowledgeMatrix.filter((k) => k.status === "basic_only")) {
  pmSignals.push({
    severity: "medium",
    track: item.category === "Маркетинг" ? "marketing" : item.category === "QA" ? "qa" : item.category === "Frontend" ? "frontend" : "backend",
    area: "Персонализация знаний",
    model: "flash",
    fallback: "inherit",
    title: `${item.label}: только базовые знания`,
    detail: `Технология используется (${item.evidence}), но проектные правила не персонализированы.`,
    actionPrompt: item.personalizePrompt,
  });
}

// Compute readiness score (0-100)
let score = 0;
if (memoryFiles.rootAgents.exists) score += 10;
if (memoryFiles.codemap.exists && codemapText.length > 500) score += 20;
if (memoryFiles.decisions.exists && adrCount > 0) score += 15;
if (memoryFiles.status.exists) score += 10;
if (memoryFiles.backlog.exists) score += 10;
if (gitInfo.isRepo) score += 15;
if (gitInfo.isRepo && gitInfo.uncommittedCount === 0) score += 5;
if (ecosystem.core) score += 10;
if (latestDaily && latestDaily.ageDays <= 7) score += 5;

const payload = {
  schemaVersion: "2.1",
  generatedAt: new Date().toISOString(),
  projectName: path.basename(rootDir),
  rootDir,
  readinessScore: Math.min(100, score),
  qaPreflight,
  structure: {
    hasLocalDir: fs.existsSync(localDir),
    hasBitrixDir: fs.existsSync(path.join(rootDir, "bitrix")),
    hasViewportMeta,
    hasTestsDir,
    classesCount: classCount,
    namespaces: [...namespaces].sort(),
    templates,
    customComponents,
    ajaxEndpoints,
    localModules: listDirs(path.join(localDir, "modules")),
    urlrewriteRules: (urlrewriteContent.match(/['"]CONDITION['"]\s*=>/g) || []).length,
    initEventsCount: (initContent.match(/addEventHandler(?:Compatible)?\s*\(/gi) || []).length,
  },
  memory: {
    files: memoryFiles,
    adrCount,
    dailyCount,
    latestDaily,
  },
  knowledgeMatrix,
  backlog: {
    doneCount: allDoneTasks.length,
    openCount: allOpenTasks.length,
    totalCount: allDoneTasks.length + allOpenTasks.length,
    completionPct:
      allDoneTasks.length + allOpenTasks.length > 0
        ? Math.round((allDoneTasks.length / (allDoneTasks.length + allOpenTasks.length)) * 100)
        : 0,
    openTasks: allOpenTasks.slice(0, 20),
    recentDoneTasks: allDoneTasks.slice(0, 10),
  },
  git: gitInfo,
  ecosystem: {
    core: ecosystem.core ? ecosystem.core.version : null,
    seoGeo: ecosystem.seoGeo ? ecosystem.seoGeo.version : null,
    qa: ecosystem.qa ? ecosystem.qa.version : null,
    marketing: ecosystem.marketing ? ecosystem.marketing.version : null,
    legacySeoDuplicate: Boolean(ecosystem.legacySeoDuplicate),
    mcps: detectedMcps,
  },
  plugins: {
    installed: installedPlugins,
    projectSkillsCount: projectSkills.length,
  },
  contextBudget,
  pmSignals,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`=== Bitrix Central Orchestrator Snapshot v2.0: ${payload.projectName} ===`);
  console.log(`Readiness Score : ${payload.readinessScore}/100 | Context Budget: ~${contextBudget.totalBaselineOverheadTokens} tok (${contextBudget.status})`);
  console.log(`Ecosystem       : core=${payload.ecosystem.core || "OFF"}, seo-geo=${payload.ecosystem.seoGeo || "OFF"}, qa=${payload.ecosystem.qa || "OFF"}, marketing=${payload.ecosystem.marketing || "OFF"}`);
  console.log(`Structure       : ${classCount} classes (${namespaces.size} ns), ${templates.length} templates, ${ajaxEndpoints.length} AJAX, ${payload.structure.urlrewriteRules} urlrewrite`);
  console.log(`Memory          : AGENTS=${memoryFiles.rootAgents.exists}, codemap=${memoryFiles.codemap.exists}, ADR=${adrCount}, daily=${dailyCount}`);
  console.log(`Backlog         : ${payload.backlog.doneCount} done / ${payload.backlog.openCount} open (${payload.backlog.completionPct}%)`);
  console.log(`Git             : repo=${gitInfo.isRepo}, branch=${gitInfo.branch || "—"}, commits=${gitInfo.totalCommits}, uncommitted=${gitInfo.uncommittedCount}`);
  console.log(`PM Signals      : ${pmSignals.length} | Skill Collisions: ${duplicateSkillNames.length}`);
}
