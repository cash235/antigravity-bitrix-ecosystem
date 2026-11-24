#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Project & Antigravity Ecosystem Bootstrapper v1.0 (Node.js 18+).
 * Initializes any new (Greenfield) or existing (Brownfield) 1C-Bitrix project in one command:
 *   1. Checks environment (Node.js, Git, PHP, installed Antigravity Bitrix plugins).
 *   2. Writes workspace-scoped `.agents/plugins.json` pinning the chosen plugin profile.
 *   3. Creates a safe 1C-Bitrix `.gitignore` if absent.
 *   4. Scaffolds `AGENTS.md`, `docs/memory/*`, `docs/backlog.md`, and `docs/daily/DD.MM.YY.md`
 *      from `antigravity-bitrix-core/templates/` without overwriting existing files (unless `--force`).
 *   5. Outputs a ready-to-paste prompt to run the interactive `bitrix-project-init` interview.
 *
 * Usage:
 *   node bitrix-bootstrap.mjs <target-dir> [--profile full|store|corporate|minimal] [--plugins core,seo-geo,qa,marketing] [--name "Project Name"] [--update-config] [--force] [--dry-run] [--json]
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCmsChecklist } from "./bitrix-cms-checklist.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, "..");
const templatesDir = path.join(pluginRoot, "templates");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node bitrix-bootstrap.mjs <target-dir> [options]

Options:
  --profile <full|store|corporate|minimal>        Plugin bundle profile (default: full)
  --plugins <list>                                Comma-separated short/full names (e.g. core,seo-geo,qa)
  --permissions-profile <safe_default|local_dev|staging_full>  Blast-radius policy profile (default: safe_default)
  --name <string>                                 Human-readable project name (default: folder name)
  --update-config                                 Safely overwrite ONLY .agents/plugins.json (keeps docs/memory/* intact)
  --force                                         Overwrite all existing scaffold files
  --dry-run                                       Preview actions without writing files
  --json                                          Output machine-readable JSON report
`);
  process.exit(0);
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function getFlagValue(name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return null;
}

const valueFlags = new Set(["--profile", "--plugins", "--permissions-profile", "--name"]);
/** @type {string | null} */
let targetArg = null;
for (let i = 0; i < args.length; i++) {
  if (valueFlags.has(args[i])) {
    i++;
    continue;
  }
  if (!args[i].startsWith("--") && !targetArg) {
    targetArg = args[i];
  }
}

const targetDir = path.resolve(targetArg || process.cwd());
const profile = (getFlagValue("--profile") || "full").toLowerCase();
const customPluginsRaw = getFlagValue("--plugins");
const permissionsProfile = (getFlagValue("--permissions-profile") || "safe_default").toLowerCase();
const projectName = getFlagValue("--name") || path.basename(targetDir);
const updateConfig = args.includes("--update-config");
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const jsonMode = args.includes("--json");

/** @type {Record<string, string>} */
const PLUGIN_ALIASES = {
  core: "antigravity-bitrix-core",
  "antigravity-bitrix-core": "antigravity-bitrix-core",
  "seo-geo": "antigravity-bitrix-seo-geo",
  seo: "antigravity-bitrix-seo-geo",
  "antigravity-bitrix-seo-geo": "antigravity-bitrix-seo-geo",
  qa: "antigravity-bitrix-qa",
  "antigravity-bitrix-qa": "antigravity-bitrix-qa",
  marketing: "antigravity-bitrix-marketing",
  cro: "antigravity-bitrix-marketing",
  "antigravity-bitrix-marketing": "antigravity-bitrix-marketing",
};

/** @type {Record<string, string[]>} */
const PROFILES = {
  full: [
    "antigravity-bitrix-core",
    "antigravity-bitrix-seo-geo",
    "antigravity-bitrix-qa",
    "antigravity-bitrix-marketing",
  ],
  store: [
    "antigravity-bitrix-core",
    "antigravity-bitrix-seo-geo",
    "antigravity-bitrix-qa",
    "antigravity-bitrix-marketing",
  ],
  corporate: [
    "antigravity-bitrix-core",
    "antigravity-bitrix-seo-geo",
    "antigravity-bitrix-qa",
  ],
  minimal: ["antigravity-bitrix-core"],
};

/** @type {string[]} */
let selectedPlugins = [];
if (customPluginsRaw) {
  const parts = customPluginsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const p of parts) {
    const mapped = PLUGIN_ALIASES[p];
    if (mapped && !selectedPlugins.includes(mapped)) selectedPlugins.push(mapped);
  }
  if (!selectedPlugins.includes("antigravity-bitrix-core")) {
    selectedPlugins.unshift("antigravity-bitrix-core");
  }
} else {
  selectedPlugins = PROFILES[profile] || PROFILES.full;
}

/**
 * @param {string} cmd
 * @param {string[]} argList
 * @returns {string | null}
 */
function cmdVersion(cmd, argList) {
  try {
    return execFileSync(cmd, argList, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000 })
      .trim()
      .split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

const globalPluginsDir = path.join(os.homedir(), ".gemini", "config", "plugins");
/** @type {Record<string, string>} */
const installedVersions = {};
/** @type {string[]} */
const installedPlugins = [];
for (const name of selectedPlugins) {
  const mfPath = path.join(globalPluginsDir, name, "plugin.json");
  if (fs.existsSync(mfPath)) {
    installedPlugins.push(name);
    try {
      const mf = JSON.parse(fs.readFileSync(mfPath, "utf8").replace(/^\uFEFF/, ""));
      installedVersions[name] = mf.version || "unknown";
    } catch {
      installedVersions[name] = "unknown";
    }
  }
}
const missingPlugins = selectedPlugins.filter((name) => !installedPlugins.includes(name));

// Detect workspace-local copies that silently override global plugins (Workspace > Global precedence)
/** @type {Array<{path: string, name: string, localVersion: string, globalVersion: string | null}>} */
const localPluginOverrides = [];
for (const dotDir of [".agents", ".agent", "_agents", "_agent"]) {
  const localPlugDir = path.join(targetDir, dotDir, "plugins");
  if (!fs.existsSync(localPlugDir)) continue;
  for (const entry of fs.readdirSync(localPlugDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (/bitrix/i.test(entry.name)) {
      let localVer = "unknown";
      const mf = path.join(localPlugDir, entry.name, "plugin.json");
      if (fs.existsSync(mf)) {
        try {
          localVer = JSON.parse(fs.readFileSync(mf, "utf8").replace(/^\uFEFF/, "")).version || "unknown";
        } catch {
          localVer = "unknown";
        }
      }
      localPluginOverrides.push({
        path: `${dotDir}/plugins/${entry.name}`,
        name: entry.name,
        localVersion: localVer,
        globalVersion: installedVersions[entry.name] || null,
      });
    }
  }
}

const envCheck = {
  node: process.version,
  git: cmdVersion("git", ["--version"]),
  php: cmdVersion("php", ["-v"]),
  globalPluginsDir,
  installedPlugins,
  installedVersions,
  missingPlugins,
  localPluginOverrides,
};

const hasLocalDir = fs.existsSync(path.join(targetDir, "local"));
const hasBitrixDir = fs.existsSync(path.join(targetDir, "bitrix"));
const hasUrlrewrite = fs.existsSync(path.join(targetDir, "urlrewrite.php"));
const detectedStage = hasLocalDir || hasBitrixDir || hasUrlrewrite ? "Brownfield" : "Greenfield";

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

const detectedTemplates = listSubdirs(path.join(targetDir, "local", "templates"));
const detectedAjax = fs.existsSync(path.join(targetDir, "local", "ajax"))
  ? fs.readdirSync(path.join(targetDir, "local", "ajax")).filter((f) => f.endsWith(".php")).sort()
  : [];

const now = new Date();
const dd = String(now.getDate()).padStart(2, "0");
const mm = String(now.getMonth() + 1).padStart(2, "0");
const yyyy = String(now.getFullYear());
const yy = yyyy.slice(-2);

const replacements = {
  "{{PROJECT_NAME}}": projectName,
  "{{BITRIX_EDITION}}": "(уточнить: Старт / Малый бизнес / Бизнес / Б24 Коробка)",
  "{{PHP_VERSION}}": envCheck.php ? envCheck.php.replace(/^PHP\s+/i, "").split(" ")[0] : "8.2+",
  "{{HOSTING_STACK}}": "(уточнить: BitrixVM / Nginx+PHP-FPM / Redis / Автокомпозит)",
  "{{DOMAINS_SUMMARY}}": "(уточнить боевой и staging домены)",
  "{{BASE_CURRENCY}}": "(уточнить базовую валюту b_currency)",
  "{{DEPLOY_WORKFLOW}}": "(уточнить: Git + SSH / SFTP, staging -> prod)",
  "{{RED_LINES_SHORT}}": "Не трогать /bitrix/, не коммитить секреты, уточнить бизнес-ограничения в status.md",
  "{{PRIMARY_DOMAIN}}": "example.com (уточнить)",
  "{{SITE_ROLE}}": "prod (уточнить)",
  "{{CURRENCY}}": "(уточнить)",
  "{{REGION}}": "(уточнить)",
  "{{NOTES}}": "Заполнить при интервью bitrix-project-init",
  "{{TEMPLATES_LIST}}": detectedTemplates.length ? detectedTemplates.join(", ") : "(пока не обнаружены)",
  "{{CUSTOM_COMPONENTS_LIST}}": "(заполнить по результатам скана bitrix-project-scan.mjs)",
  "{{AJAX_ENDPOINTS_LIST}}": detectedAjax.length ? detectedAjax.join(", ") : "(пока не обнаружены)",
  "{{URLREWRITE_SUMMARY}}": hasUrlrewrite ? "urlrewrite.php обнаружен (требуется аудит правил)" : "(пока отсутствует)",
  "{{ERP_INTEGRATION}}": "(уточнить: 1С / МойСклад / нет)",
  "{{CRM_AND_ANALYTICS}}": "(уточнить: Б24 CRM, Яндекс.Метрика, GA4, GTM)",
  "{{PAYMENTS_AND_DELIVERY}}": "(уточнить платёжные шлюзы и службы доставки)",
  "{{SERVER_AND_CACHE}}": "(уточнить: Redis / Memcached / Композит / OPcache)",
  "{{DATE_ISO}}": `${yyyy}-${mm}-${dd}`,
  "{{DATE_RU}}": `${dd}.${mm}.${yyyy}`,
  "{{DATE_SHORT}}": `${dd}.${mm}.${yy}`,
  "{{PROJECT_BRANCH}}": detectedStage,
  "{{PROJECT_CONTEXT}}": `Стартовая инициализация проекта ${projectName} (${detectedStage}) через bitrix-bootstrap.mjs.`,
  "{{CORE_DECISION_1}}": "Вся кастомная разработка изолируется строго в /local/ на базе Bitrix D7.",
  "{{CORE_DECISION_2}}": `Подключён модульный профиль плагинов Antigravity: ${selectedPlugins.join(", ")}.`,
  "{{REJECTED_ALTERNATIVES}}": "Прямое редактирование ядра /bitrix/ и хранение глобальных правил копипастой в проекте.",
  "{{CONSEQUENCES}}": "Требуется завершить интерактивное интервью bitrix-project-init для заполнения ID инфоблоков, доменов и Красных линий.",
  "{{NORTH_STAR}}": "(уточнить конечную измеримую цель проекта в интервью bitrix-project-init)",
  "{{LONG_TERM_GOAL}}": "(уточнить цель на 3–6 месяцев)",
  "{{CURRENT_SPRINT_GOAL}}": "Завершить онбординг (bitrix-project-init) и согласовать первый спринт.",
  "{{PROJECT_RED_LINE_1}}": "(уточнить критичные бизнес-ограничения: 1С / валюта / SEO-URL / резервы)",
  "{{PROJECT_RED_LINE_2}}": "(уточнить правила деплоя и работы со staging)",
  "{{TASK_1_TITLE}}": "Завершить интерактивное интервью онбординга (`bitrix-project-init`) и заполнить `docs/memory/`",
  "{{TASK_1_GOAL}}": "Зафиксировать реальные домены, ID инфоблоков/HL-блоков, интеграции, legacy-стиль и Красные линии.",
  "{{TASK_1_DOD}}": "В `AGENTS.md`, `docs/memory/codemap.md`, `decisions.md`, `status.md` не осталось критичных незаполненных плейсхолдеров.",
  "{{TASK_2_TITLE}}": "Запустить Command Center Dashboard и первичный QA/SEO preflight",
  "{{TASK_2_GOAL}}": "Получить объективную карту рисков и ICE-приоритизацию первых задач.",
  "{{TASK_2_DOD}}": "Сформирован дашборд без CRITICAL-блокировок безопасности.",
  "{{TASK_3_TITLE}}": "Сформировать дорожную карту MVP / развития на ближайший месяц",
  "{{TASK_3_GOAL}}": "Определить 3–5 бизнес-приоритетных задач с критериями приёмки AC-001..N.",
  "{{TECH_DEBT_OR_IDEA}}": "Настроить базовые smoke-проверки и регулярный контроль Core Web Vitals / SEO-дрейфа.",
};

/**
 * @param {string} templateFile
 * @returns {string | null}
 */
function renderTemplate(templateFile) {
  const full = path.join(templatesDir, templateFile);
  if (!fs.existsSync(full)) return null;
  let content = fs.readFileSync(full, "utf8");
  for (const [k, v] of Object.entries(replacements)) {
    content = content.split(k).join(v);
  }
  return content;
}

/** @type {Record<string, Record<string, { level: string, note: string }>>} */
const PERMISSION_PROFILES = {
  safe_default: {
    outside_workspace: { level: "deny", note: "Только внутри текущей папки проекта" },
    internet: { level: "read_only", note: "Только чтение официальной документации и live SEO/QA-чеки (без мутаций)" },
    terminal: { level: "read_only", note: "php -l, node --check, git status/diff; мутации через подтверждение" },
    ssh: { level: "deny", note: "Подключение по SSH запрещено без явного разрешения оператора" },
    database: { level: "deny", note: "Прямые запросы к БД запрещены; миграции только через D7-скрипты и ревью" },
    deploy: { level: "ask", note: "Любой git push / деплой на staging или prod только после подтверждения" },
  },
  local_dev: {
    outside_workspace: { level: "read_only", note: "Чтение глобальных плагинов/шаблонов; запись только в workspace" },
    internet: { level: "read_only", note: "Документация, read-only проверки URL и API" },
    terminal: { level: "allow", note: "Локальные сборки, тесты, git commit (без деструктивных rm -rf / force push)" },
    ssh: { level: "ask", note: "Только по явному подтверждению оператора" },
    database: { level: "read_only", note: "Только SELECT / инспекция схемы на локальном стенде" },
    deploy: { level: "ask", note: "Push / деплой только после явного подтверждения" },
  },
  staging_full: {
    outside_workspace: { level: "read_only", note: "Чтение внешних конфигов по необходимости; запись только в workspace" },
    internet: { level: "allow", note: "Документация, внешние API и staging-проверки" },
    terminal: { level: "allow", note: "Полный локальный CLI и тестовые скрипты" },
    ssh: { level: "staging_rw", note: "Чтение/запись на staging; на prod строго ask/read_only" },
    database: { level: "staging_rw", note: "Чтение/миграции на staging; на prod строго ask" },
    deploy: { level: "staging_only", note: "Автодеплой допустим только на staging; prod строго через подтверждение" },
  },
};

const selectedPermissions = PERMISSION_PROFILES[permissionsProfile] || PERMISSION_PROFILES.safe_default;
const permissionsJsonContent = JSON.stringify(
  {
    schemaVersion: "1.0",
    profile: PERMISSION_PROFILES[permissionsProfile] ? permissionsProfile : "safe_default",
    updatedAt: `${yyyy}-${mm}-${dd}`,
    rules: selectedPermissions,
    notes: "Настройте уровни (deny | read_only | ask | staging_rw | staging_only | allow). Агент и все субагенты обязаны соблюдать эти границы.",
  },
  null,
  2
) + "\n";

const velocityJsonContent = JSON.stringify(
  {
    schemaVersion: "1.0",
    targetHoursPerDay: 2.0,
    activeDaysPerWeek: 5,
    sprintLengthDays: 7,
    autoCalibrateFromHistory: true,
    notes: "Используется планировщиком спринтов и расчётом реалистичных дедлайнов в Command Center Dashboard.",
  },
  null,
  2
) + "\n";

const pluginsJsonContent = JSON.stringify(
  {
    entries: [
      {
        path: "~/.gemini/config/plugins",
        include_only: selectedPlugins,
      },
    ],
  },
  null,
  2
) + "\n";

const gitignoreContent = `# 1C-Bitrix Core, Uploads & Cache (do not commit)
/bitrix/
/upload/
/local/cache/
/local/managed_cache/
/local/stack_cache/
/local/html_pages/

# Secrets & Local Environment (Zero PII / Zero Keys in Git)
.env
.env.*
service-account*.json
*.pem
*.key
*.sql
*.sql.gz
*.dump

# IDE & OS
.DS_Store
Thumbs.db
.idea/
.vscode/
*.log
`;

/** @type {{ created: string[], overwritten: string[], skipped: string[] }} */
const actions = {
  created: [],
  overwritten: [],
  skipped: [],
};

/**
 * @param {string} relPath
 * @param {string | null} content
 * @param {boolean} [allowOverwrite]
 */
function writeTargetFile(relPath, content, allowOverwrite = false) {
  if (content == null) return;
  const fullPath = path.join(targetDir, relPath);
  const exists = fs.existsSync(fullPath);
  if (exists && !force && !allowOverwrite) {
    actions.skipped.push(relPath);
    return;
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
  if (exists) actions.overwritten.push(relPath);
  else actions.created.push(relPath);
}

if (!dryRun) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const cmsChecklistSeed = buildCmsChecklist(targetDir, { archetype: profile, force: true });
const cmsChecklistJsonContent = JSON.stringify(
  {
    schemaVersion: "1.0",
    archetype: cmsChecklistSeed.archetype,
    archetypeLabel: cmsChecklistSeed.archetypeLabel,
    updatedAt: `${yyyy}-${mm}-${dd}`,
    blocks: cmsChecklistSeed.blocks.map((b) => ({
      id: b.id,
      number: b.number,
      title: b.title,
      module: b.module,
      adminPath: b.adminPath,
      items: b.items.map((it) => ({
        id: it.id,
        title: it.title,
        status: it.status,
        note: it.note || "",
      })),
    })),
  },
  null,
  2
) + "\n";

writeTargetFile(".agents/plugins.json", pluginsJsonContent, updateConfig);
writeTargetFile(".agents/permissions.json", permissionsJsonContent);
writeTargetFile(".gitignore", gitignoreContent);
writeTargetFile("AGENTS.md", renderTemplate("AGENTS.project.md"));
writeTargetFile("docs/memory/README.md", renderTemplate("memory-README.md"));
writeTargetFile("docs/memory/codemap.md", renderTemplate("memory-codemap.md"));
writeTargetFile("docs/memory/decisions.md", renderTemplate("memory-decisions.md"));
writeTargetFile("docs/memory/status.md", renderTemplate("memory-status.md"));
writeTargetFile("docs/memory/velocity.json", velocityJsonContent);
writeTargetFile("docs/memory/cms-checklist.json", cmsChecklistJsonContent);
writeTargetFile("docs/backlog.md", renderTemplate("backlog.md"));
writeTargetFile(`docs/daily/${dd}.${mm}.${yy}.md`, renderTemplate("daily-log.md"));

const nextPrompt =
  `Запусти bitrix-project-init для этого проекта (${projectName}, определён как ${detectedStage}): ` +
  `просканируй структуру, проведи короткое интервью (2 раунда) и актуализируй AGENTS.md, docs/memory/* и docs/backlog.md, затем открой Command Center Dashboard.`;

const result = {
  ok: true,
  dryRun,
  updateConfig,
  targetDir,
  projectName,
  detectedStage,
  profile: customPluginsRaw ? "custom" : profile,
  selectedPlugins,
  envCheck,
  actions,
  nextPrompt,
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`=== 1C-Bitrix Antigravity Bootstrap (${dryRun ? "DRY RUN" : "APPLIED"}) ===`);
  console.log(`Project  : ${projectName} (${detectedStage})`);
  console.log(`Target   : ${targetDir}`);
  console.log(`Profile  : ${result.profile} -> ${selectedPlugins.map((p) => `${p}${installedVersions[p] ? ` v${installedVersions[p]}` : ""}`).join(", ")}`);
  console.log(`Env      : Node ${envCheck.node} | Git: ${envCheck.git || "NOT FOUND"} | PHP: ${envCheck.php || "NOT FOUND"}`);
  if (missingPlugins.length > 0) {
    console.log(`WARNING  : Not yet installed globally in ${globalPluginsDir}: ${missingPlugins.join(", ")}`);
    console.log(`           Run install-ecosystem.ps1 (or install-ecosystem.sh) to install them.`);
  }
  if (localPluginOverrides.length > 0) {
    console.log(`WARNING  : Workspace-local plugin copies found (they override global versions!):`);
    for (const o of localPluginOverrides) {
      console.log(`           - ${o.path} (local v${o.localVersion} vs global v${o.globalVersion || "none"})`);
    }
    console.log(`           Remove those local copies if you want the project to use the freshly updated global plugins.`);
  }
  console.log(`Created  : ${actions.created.length ? actions.created.join(", ") : "none"}`);
  if (actions.overwritten.length) console.log(`Updated  : ${actions.overwritten.join(", ")}`);
  if (actions.skipped.length) console.log(`Skipped  : ${actions.skipped.join(", ")} (already exist; use --update-config for plugins.json only or --force for all)`);
  console.log("\nNext step in Antigravity chat:");
  console.log(`  ${nextPrompt}`);
}
