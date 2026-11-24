#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix Central Orchestrator Command Center Dashboard Renderer v2.1 (Node.js 18+).
 * Deterministically builds a rock-solid, self-verified interactive 5-tab HTML dashboard from
 * bitrix-dashboard-data.mjs snapshot + optional Orchestrator JSON overlay.
 *
 * Key guarantees:
 * - Safe JSON data embedding (<script id="dashboard-data" type="application/json">) — zero risk of
 *   unescaped backticks / template literal crashes that break button interactivity.
 * - Full HTML escaping for all dynamic text fields.
 * - 3-tier resilient copyText(): VS Code Webview postMessage -> navigator.clipboard.writeText().catch()
 *   -> hidden textarea execCommand('copy') -> interactive fallback modal.
 * - Dual render modes:
 *     --mode artifact : Antigravity Side Pane Standalone HTML (gstatic Tailwind + semantic CSS vars)
 *     --mode webview  : Offline zero-CDN VS Code / Antigravity IDE Webview (VS Code theme vars + IDE actions)
 *
 * Usage:
 *   node bitrix-dashboard-render.mjs [project-root] [--data snapshot.json] [--overlay overlay.json] [--out file.html] [--mode artifact|webview] [--stdout]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
function getFlagValue(name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return null;
}

const dataPath = getFlagValue("--data");
const overlayPath = getFlagValue("--overlay");
const outPath = getFlagValue("--out");
const mode = (getFlagValue("--mode") || "artifact").toLowerCase();
const stdoutMode = args.includes("--stdout") || !outPath;

const valueFlags = new Set(["--data", "--overlay", "--out", "--mode"]);
let projectArg = null;
for (let i = 0; i < args.length; i++) {
  if (valueFlags.has(args[i])) {
    i++;
    continue;
  }
  if (!args[i].startsWith("--") && !projectArg) {
    projectArg = args[i];
  }
}
const rootDir = path.resolve(projectArg || process.cwd());

function readJsonFile(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${label} JSON (${filePath}): ${err.message}`);
    process.exit(1);
  }
}

let snapshot;
if (dataPath) {
  snapshot = readJsonFile(path.resolve(dataPath), "snapshot");
} else {
  const collectorPath = path.join(__dirname, "bitrix-dashboard-data.mjs");
  try {
    const raw = execFileSync(process.execPath, [collectorPath, rootDir, "--json"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 25000,
    });
    snapshot = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to collect dashboard data: ${err.message}`);
    process.exit(1);
  }
}

const overlay = overlayPath ? readJsonFile(path.resolve(overlayPath), "overlay") : {};

function normalizeTrack(raw) {
  const t = String(raw || "").toLowerCase();
  if (t.includes("qa") || t.includes("безопас") || t.includes("test")) return "QA";
  if (t.includes("seo") || t.includes("geo") || t.includes("аналит")) return "SEO & GEO";
  if (t.includes("front") || t.includes("ui") || t.includes("ux") || t.includes("верст")) return "Frontend";
  if (t.includes("market") || t.includes("cro") || t.includes("маркет")) return "Маркетинг";
  return "Backend";
}

function buildDefaultInitiatives(snap) {
  const list = [];
  const signals = Array.isArray(snap.pmSignals) ? snap.pmSignals : [];
  signals.forEach((sig, i) => {
    const sev = String(sig.severity || "medium").toLowerCase();
    const impact = sev === "critical" ? 10 : sev === "high" ? 8.5 : 7;
    const confidence = sev === "critical" ? 10 : sev === "high" ? 8.5 : 8;
    const effort = sev === "critical" ? 2 : 2.5;
    const tier = sev === "critical" ? "T2" : sev === "high" ? "T3" : "T2";
    const subagent = sig.model || (tier === "T3" ? "inherit" : "flash");
    const quadrant = sev === "critical" || sev === "high" ? "Q1" : "Q2";
    const size = effort <= 1.5 ? "S" : effort <= 3 ? "M" : "L";
    list.push({
      id: `SIG-${String(i + 1).padStart(2, "0")}`,
      track: normalizeTrack(sig.track || sig.area),
      pipeline: sev === "critical" ? "fix-defect" : "review-and-audit",
      tier,
      quadrant,
      size,
      estHours: effort,
      title: sig.title || "Сигнал Оркестратора",
      impact,
      confidence,
      effort,
      uiModel: tier === "T3" ? "Balanced Workhorse (Medium)" : "Fast Model (Medium)",
      uiQuota: null,
      fallbackModel: "Cross-Provider Fallback",
      fallbackQuota: null,
      subagent,
      tools: sig.area || "antigravity-bitrix-core",
      benefit: sig.detail || "Устранение выявленного узкого места повышает стабильность и предсказуемость проекта.",
      evidence: `Автоскан bitrix-dashboard-data.mjs (${sig.area || "сигнал"})`,
      prompt:
        sig.actionPrompt ||
        `[Класс: ${tier} | Шкалы: ${quadrant} · ${size} (~${effort} ч) | Subagent: ${subagent}]\nЗадача: ${sig.title}\nБизнес-выгода: ${sig.detail}\nCock-up Prevention: перед стартом и перед закрытием проверь чеклист приёмки и зафиксируй Actual время.`,
    });
  });

  const openTasks = Array.isArray(snap.backlog?.openTasks) ? snap.backlog.openTasks : [];
  openTasks.slice(0, 8).forEach((task, idx) => {
    const idMatch = String(task.text || "").match(/#(\d+)/);
    const taskId = task.id || (idMatch ? `BL-${idMatch[1]}` : `BL-${String(idx + 1).padStart(2, "0")}`);
    const track = normalizeTrack(`${task.source || ""} ${task.text || ""}`);
    const quadrant = task.quadrant || "Q2";
    const size = task.size || "M";
    const estHours = task.estHours || (size === "S" ? 1 : size === "L" ? 4 : size === "XL" ? 8 : 2.5);
    const impact = quadrant === "Q1" ? 9.5 : quadrant === "Q2" ? 8.5 : quadrant === "Q3" ? 6 : 4;
    const effort = size === "S" ? 1.5 : size === "M" ? 2.5 : size === "L" ? 4 : 6;
    const acLines = Array.isArray(task.checklist) && task.checklist.length > 0
      ? task.checklist.map((c, ci) => `- [${c.done ? "x" : " "}] AC-${String(ci + 1).padStart(3, "0")}: ${c.text}`).join("\n")
      : "- [ ] AC-001: Изменения выполнены строго в /local/ по стандартам 1C-Bitrix D7.\n- [ ] AC-002: Пройдены проверки php -l / node --check без регрессий.";
    list.push({
      id: taskId,
      track,
      pipeline: "add-feature",
      tier: size === "L" || size === "XL" ? "T4" : "T3",
      quadrant,
      size,
      estHours,
      title: task.text,
      impact,
      confidence: 8.5,
      effort,
      uiModel: size === "L" || size === "XL" ? "Flagship (High)" : "Balanced Workhorse (Medium)",
      uiQuota: null,
      fallbackModel: "Cross-Provider Fallback",
      fallbackQuota: null,
      subagent: size === "L" || size === "XL" ? "pro" : "inherit",
      tools: "bitrix-orchestrator",
      benefit: task.businessValue || "Прямое продвижение по приоритетному бэклогу проекта с проверяемыми критериями приёмки.",
      evidence: `${task.sprint ? `${task.sprint} · ` : ""}${task.source || "docs/backlog.md"}${task.checklistTotal ? ` · чеклист ${task.checklistDone}/${task.checklistTotal}` : ""}`,
      prompt: `[Класс: ${size === "L" || size === "XL" ? "T4" : "T3"} | Шкалы: ${quadrant} · ${size} (~${estHours} ч) | Subagent: ${size === "L" || size === "XL" ? "pro" : "inherit"} | Pipeline: add-feature]\nЗадача (${taskId}): ${task.text}\nБизнес-выгода: ${task.businessValue || "Закрытие приоритетной задачи бэклога."}\n\nЧеклист приёмки (DoD — выполнен чеклист = закрыта задача):\n${acLines}\n\nCock-up Prevention (обязательно для всех уровней субагентов): Проверяй на каждом шаге соответствие цели и чеклисту; попутные нюансы маршрутизируй по Scope Triage.\nФинал: Зафиксировать Actual время, отметить [x] чеклист в бэклоге и обновить docs/memory/status.md.`,
    });
  });

  if (list.length === 0) {
    list.push({
      id: "INIT-01",
      track: "Backend",
      pipeline: "review-and-audit",
      tier: "T2",
      title: "Запустить интерактивный онбординг и аудит целей проекта (bitrix-project-init)",
      impact: 9,
      confidence: 9,
      effort: 1.5,
      uiModel: "Fast Model (Medium)",
      uiQuota: null,
      fallbackModel: "Cross-Provider Fallback",
      fallbackQuota: null,
      subagent: "inherit",
      tools: "antigravity-bitrix-core (bitrix-project-init + bitrix-orchestrator)",
      benefit: "Создаст каноническую память (AGENTS.md, codemap, ADR, бэклог), чтобы агент работал без галлюцинаций с 1-го хода.",
      evidence: "В проекте не найдено открытых задач или сигналов — требуется первичная калибровка.",
      prompt: "Запусти bitrix-project-init: проведи опросник (Greenfield/Brownfield), просканируй структуру проекта и сформируй AGENTS.md, docs/memory/* и docs/backlog.md.",
    });
  }

  return list;
}

function buildDefaultBlindSpots(snap) {
  const spots = [];
  if (snap.qaPreflight && snap.qaPreflight.critical?.length > 0) {
    const top = snap.qaPreflight.critical[0];
    spots.push({
      severity: "error",
      badge: `CRITICAL · QA (${snap.qaPreflight.critical.length})`,
      metric: `Verdict: ${snap.qaPreflight.verdict}`,
      title: top.code || "Критические находки QA Preflight",
      detail: `${top.file}:${top.line} — ${top.message}`,
    });
  }
  if (snap.contextBudget?.status === "needs_trim") {
    spots.push({
      severity: "warning",
      badge: "MEDIUM · Context Budget",
      metric: `~${snap.contextBudget.totalBaselineOverheadTokens} tok`,
      title: "Контекст перегружен или есть коллизии скиллов",
      detail:
        snap.contextBudget.duplicateSkillCollisions?.length > 0
          ? `Коллизий: ${snap.contextBudget.duplicateSkillCollisions.length} (${snap.contextBudget.duplicateSkillCollisions.slice(0, 2).join(", ")}).`
          : `Загружено ${snap.contextBudget.skillListingsCount} скиллов; отключите неиспользуемые плагины.`,
    });
  }
  if (!snap.memory?.files?.codemap?.exists || !snap.memory?.files?.decisions?.exists) {
    spots.push({
      severity: "warning",
      badge: "HIGH · Память проекта",
      metric: `Score ${snap.readinessScore}/100`,
      title: "Отсутствует каноническая память docs/memory/",
      detail: "Без codemap.md, decisions.md и status.md агент тратит лишние токены на повторное изучение кода.",
    });
  }
  if (snap.git?.isRepo && snap.git.uncommittedCount > 0) {
    spots.push({
      severity: "primary",
      badge: "INFO · Git Hygiene",
      metric: `${snap.git.uncommittedCount} изм.`,
      title: "Есть незакоммиченные файлы в рабочем дереве",
      detail: "Перед крупным рефакторингом сделайте чистый коммит или Git-чекпоинт.",
    });
  }
  if (!snap.structure?.hasTestsDir) {
    spots.push({
      severity: "primary",
      badge: "OPPORTUNITY · QA",
      metric: "0 автотестов",
      title: "Нет каталога tests/ и базовых smoke-скриптов",
      detail: "Подключите bitrix-regression-tests и bitrix-browser-qa (375/768/1440px) для защиты критичных клик-путей.",
    });
  }
  return spots.slice(0, 3);
}

function buildEcosystemCards(snap) {
  const installed = Array.isArray(snap.plugins?.installed) ? snap.plugins.installed : [];
  const defs = [
    { dir: "antigravity-bitrix-core", fallbackTitle: "1C-Bitrix Core & Central Orchestrator" },
    { dir: "antigravity-bitrix-seo-geo", fallbackTitle: "1C-Bitrix SEO & GEO" },
    { dir: "antigravity-bitrix-qa", fallbackTitle: "1C-Bitrix QA & Production Readiness" },
    { dir: "antigravity-bitrix-marketing", fallbackTitle: "1C-Bitrix Marketing & CRO" },
    { dir: "antigravity-bitrix-design", fallbackTitle: "1C-Bitrix Design Taste & Motion" },
  ];
  return defs.map((d) => {
    const found = installed.find((p) => p.dir === d.dir);
    if (!found) {
      return {
        name: d.dir,
        title: d.fallbackTitle,
        installed: false,
        version: "не установлен",
        rulesTok: 0,
        skills: [],
        agents: [],
      };
    }
    return {
      name: found.dir,
      title: found.displayName || d.fallbackTitle,
      installed: true,
      version: found.version || "—",
      rulesTok: found.ruleTokens || 0,
      skills: found.skills || [],
      agents: found.agents || [],
    };
  });
}

const defaultModels = [
  { name: "T1 — Mechanical / Bulk", detail: "Логи, парсинг, README · subagent: flash_lite", quota: null, status: "primary" },
  { name: "T2 — Fast / Routine", detail: "1–3 файла, мета, копирайтинг, URL-чеки · subagent: flash", quota: null, status: "primary" },
  { name: "T3 — Standard Build", detail: "D7-сервисы, компоненты, AJAX, Browser QA · subagent: inherit", quota: null, status: "primary" },
  { name: "T4 — High-Risk / Architecture", detail: "CRM/1C/миграции, аудит безопасности, ADR · subagent: pro", quota: null, status: "warning" },
  { name: "T5 — Multi-Track Parallel", detail: "Параллельные субагенты / Swarm · subagent: inherit", quota: null, status: "success" },
];

const viewModel = {
  mode,
  schemaVersion: "2.3",
  generatedAt: (snapshot.generatedAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
  projectName: overlay.projectName || snapshot.projectName || path.basename(rootDir),
  rootDir: snapshot.rootDir || rootDir,
  northStar: overlay.northStar || snapshot.northStar || snapshot.backlog?.northStar || null,
  readinessScore: snapshot.readinessScore ?? 0,
  adrCount: snapshot.memory?.adrCount ?? 0,
  dailyCount: snapshot.memory?.dailyCount ?? 0,
  qaPreflight: snapshot.qaPreflight || null,
  permissions: snapshot.permissions || { configured: false, profile: "unconfigured", rules: {} },
  velocity: snapshot.velocity || {
    hoursPerDay: 2,
    daysPerWeek: 5,
    weeklyCapacityHours: 10,
    calibrationFactor: 1,
    source: "default",
    totalSprints: 0,
    doneSprints: 0,
    openSprints: 0,
    overallDeadline: null,
    allSprints: [],
    sprints: [],
  },
  setupPipeline: snapshot.setupPipeline || {
    steps: [],
    completedCount: 0,
    totalSteps: 6,
    allDone: false,
    isProjectInitialized: false,
  },
  changelog: snapshot.changelog || { exists: false, path: "CHANGELOG.md", releases: [] },
  cmsChecklist: snapshot.cmsChecklist || {
    configured: false,
    archetype: "store",
    archetypeLabel: "Интернет-магазин (E-commerce)",
    summary: { blocksCount: 0, totalItems: 0, applicableItems: 0, verifiedItems: 0, needsSetupItems: 0, notApplicableItems: 0, completionPct: 0 },
    blocks: [],
  },
  learnedSkills: snapshot.learnedSkills || {
    dir: ".agents/learned-skills",
    exists: false,
    count: 0,
    readyCount: 0,
    blockedCount: 0,
    excludedCount: 0,
    upstreamRepo: "cash235/antigravity-bitrix-ecosystem",
    skills: [],
  },
  backlog: {
    doneCount: snapshot.backlog?.doneCount ?? 0,
    openCount: snapshot.backlog?.openCount ?? 0,
    totalCount: snapshot.backlog?.totalCount ?? 0,
    completionPct: snapshot.backlog?.completionPct ?? 0,
    quadrantCounts: snapshot.backlog?.quadrantCounts || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    sizeCounts: snapshot.backlog?.sizeCounts || { S: 0, M: 0, L: 0, XL: 0 },
    totalEstHours: snapshot.backlog?.totalEstHours ?? 0,
    totalActualHours: snapshot.backlog?.totalActualHours ?? 0,
    openTasks: (overlay.openBacklog || snapshot.backlog?.openTasks || []).map((t, idx) => {
      if (typeof t === "string") {
        return {
          id: `#${idx + 1}`,
          track: "Backend",
          source: "docs/backlog.md",
          sprint: "",
          quadrant: "Q2",
          size: "M",
          estHours: null,
          actualHours: null,
          businessValue: "",
          checklist: [],
          checklistDone: 0,
          checklistTotal: 0,
          text: t,
          prompt: `Используй bitrix-orchestrator (Cock-up Prevention Gate): реализуй задачу «${t}» по стандартам 1C-Bitrix D7 с чеклистом приёмки и фиксацией Actual времени.`,
        };
      }
      const idMatch = String(t.text || "").match(/#(\d+)/);
      const id = t.id || (idMatch ? `#${idMatch[1]}` : `#${idx + 1}`);
      const quadrant = t.quadrant || "Q2";
      const size = t.size || "M";
      const checklist = Array.isArray(t.checklist) ? t.checklist : [];
      const acBlock = checklist.length > 0
        ? "\nЧеклист приёмки:\n" + checklist.map((c) => `- [${c.done ? "x" : " "}] ${c.text}`).join("\n")
        : "";
      return {
        id,
        track: t.track || normalizeTrack(`${t.source || ""} ${t.text || ""}`),
        source: t.source || "docs/backlog.md",
        sprint: t.sprint || "",
        quadrant,
        size,
        estHours: t.estHours ?? null,
        actualHours: t.actualHours ?? null,
        businessValue: t.businessValue || "",
        checklist,
        checklistDone: t.checklistDone ?? checklist.filter((c) => c.done).length,
        checklistTotal: t.checklistTotal ?? checklist.length,
        text: t.text || "",
        prompt:
          t.prompt ||
          `[Шкалы: ${quadrant} · ${size}${t.estHours != null ? ` · Est ${t.estHours}ч` : ""}]\nИспользуй bitrix-orchestrator (Cock-up Prevention Gate): выполни задачу ${id} — ${t.text || ""}.\nБизнес-ценность: ${t.businessValue || "уточнить"}.${acBlock}\nФинал: выполнить 100% чеклиста, зафиксировать Actual время и обновить docs/memory/status.md.`,
      };
    }),
    doneTasks: (overlay.doneBacklog || snapshot.backlog?.recentDoneTasks || []).map((t) =>
      typeof t === "string"
        ? t
        : `${t.id ? `${t.id} — ` : ""}${t.text || ""}${t.actualHours != null ? ` (Факт: ${t.actualHours}ч)` : ""}`
    ),
  },
  contextBudget: snapshot.contextBudget || {
    alwaysOnRulesTokens: 0,
    skillListingsCount: 0,
    totalBaselineOverheadTokens: 0,
    duplicateSkillCollisions: [],
    projectLocalSkillsCount: 0,
    status: "healthy",
  },
  blindSpots: Array.isArray(overlay.blindSpots) && overlay.blindSpots.length > 0
    ? overlay.blindSpots
    : buildDefaultBlindSpots(snapshot),
  initiatives: Array.isArray(overlay.initiatives) && overlay.initiatives.length > 0
    ? overlay.initiatives
    : buildDefaultInitiatives(snapshot),
  knowledge: Array.isArray(overlay.knowledge) && overlay.knowledge.length > 0
    ? overlay.knowledge
    : (snapshot.knowledgeMatrix || []).map((k) => ({
      label: k.label,
      category: k.category,
      status: k.status === "personalized" ? "ok" : k.status === "missing" ? "error" : "warn",
      statusLabel: k.statusLabel,
      evidence: k.evidence,
      personalizePrompt: k.personalizePrompt || null,
    })),
  git: snapshot.git || {
    isRepo: false,
    branch: "—",
    totalCommits: 0,
    uncommittedCount: 0,
    modifiedFiles: [],
    untrackedFiles: [],
    checkpoints: [],
    recentCommits: [],
  },
  structure: snapshot.structure || {
    classesCount: 0,
    namespaces: [],
    templates: [],
    customComponents: [],
    ajaxEndpoints: [],
    urlrewriteRules: 0,
    initEventsCount: 0,
    hasLocalDir: false,
  },
  ecosystem: buildEcosystemCards(snapshot),
  mcps: snapshot.ecosystem?.mcps || [],
  modelsSnapshotTime: overlay.modelsSnapshotTime || (overlay.models ? "Live swarm.models" : "Portable Tiers"),
  models: Array.isArray(overlay.models) && overlay.models.length > 0 ? overlay.models : defaultModels,
};

const safeJsonPayload = JSON.stringify(viewModel)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

const isWebview = mode === "webview";

const webviewCss = `
  :root {
    --background: var(--vscode-editor-background, #1a1b26);
    --card: var(--vscode-sideBar-background, var(--vscode-editorWidget-background, #16161e));
    --surface-hover: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.1));
    --border: var(--vscode-panel-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.22)));
    --foreground: var(--vscode-foreground, var(--vscode-editor-foreground, #c0caf5));
    --muted-foreground: var(--vscode-descriptionForeground, #787c99);
    --primary: var(--vscode-button-background, #3d59a1);
    --primary-hover: var(--vscode-button-hoverBackground, #4b6bc0);
    --primary-foreground: var(--vscode-button-foreground, #ffffff);
    --secondary-bg: var(--vscode-button-secondaryBackground, rgba(128, 128, 128, 0.14));
    --secondary-hover: var(--vscode-button-secondaryHoverBackground, rgba(128, 128, 128, 0.22));
    --secondary-fg: var(--vscode-button-secondaryForeground, var(--foreground));
    --input-bg: var(--vscode-input-background, var(--background));
    --input-border: var(--vscode-input-border, var(--border));
    --focus-border: var(--vscode-focusBorder, var(--primary));
    --link: var(--vscode-textLink-foreground, #7aa2f7);
    --success: var(--vscode-testing-iconPassed, #73daca);
    --warning: var(--vscode-editorWarning-foreground, #e0af68);
    --error: var(--vscode-editorError-foreground, #f7768e);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: 12.5px;
    line-height: 1.45;
  }
`;

const sharedUiCss = `
  :root {
    --surface-hover: color-mix(in srgb, var(--foreground) 6%, transparent);
    --secondary-bg: color-mix(in srgb, var(--foreground) 6%, transparent);
    --secondary-hover: color-mix(in srgb, var(--foreground) 11%, transparent);
    --secondary-fg: var(--foreground);
    --input-bg: var(--background);
    --input-border: var(--border);
    --focus-border: var(--primary);
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 14px 18px 24px; display: flex; flex-direction: column; gap: 12px; }
  .panel { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; }
  .subcard { background: var(--background); border: 1px solid var(--border); border-radius: 4px; padding: 9px 11px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .row-between { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .col { display: flex; flex-direction: column; gap: 8px; }
  .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 8px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 10px; }

  /* IDE Buttons: crisp 3px radius, restrained neutral chrome + single primary accent */
  .btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 10px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: var(--secondary-bg);
    color: var(--secondary-fg);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.12s, border-color 0.12s;
  }
  .btn:hover { background: var(--secondary-hover); border-color: var(--muted-foreground); }
  .btn:focus-visible { outline: 1px solid var(--focus-border); outline-offset: 1px; }
  .btn-primary {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }
  .btn-primary:hover { opacity: 0.92; border-color: var(--primary); }

  /* Filter chips: crisp 3px segmented buttons */
  .filter-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 9px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.12s, color 0.12s, border-color 0.12s;
  }
  .filter-btn:hover { background: var(--surface-hover); color: var(--foreground); }
  .filter-btn[aria-pressed="true"] {
    background: var(--surface-hover);
    color: var(--foreground);
    border-color: var(--primary);
  }

  /* Native IDE tab bar with bottom active indicator */
  .tab-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    border-top: 1px solid var(--border);
    margin: 10px -14px -12px;
    padding: 0 10px;
  }
  .tab-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 11px;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--muted-foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background-color 0.12s;
  }
  .tab-btn:hover { color: var(--foreground); background: var(--surface-hover); }
  .tab-btn[aria-selected="true"] {
    color: var(--foreground);
    border-bottom-color: var(--primary);
    font-weight: 600;
  }

  .input, .select {
    height: 26px;
    background: var(--input-bg);
    color: var(--foreground);
    border: 1px solid var(--input-border);
    border-radius: 3px;
    padding: 0 8px;
    font-size: 12px;
  }
  .input:focus, .select:focus { outline: 1px solid var(--focus-border); outline-offset: -1px; }

  /* Restrained IDE tags: neutral monochrome with subtle dot for semantic state */
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
  }
  .tag-strong { color: var(--foreground); background: var(--surface-hover); }
  .tag-error { color: var(--error); border-color: color-mix(in srgb, var(--error) 45%, var(--border)); }
  .tag-warning { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 45%, var(--border)); }
  .tag-success { color: var(--success); border-color: color-mix(in srgb, var(--success) 45%, var(--border)); }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
  .dot-ok { background: var(--success); }
  .dot-warn { background: var(--warning); }
  .dot-err { background: var(--error); }
  .dot-muted { background: var(--muted-foreground); opacity: 0.6; }

  .ico { width: 14px; height: 14px; flex-shrink: 0; display: inline-block; vertical-align: -2px; }
  .muted { color: var(--muted-foreground); }
  .mono { font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Consolas, monospace); }
  .title-lg { font-size: 15px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  .title-md { font-size: 12px; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); display: inline-flex; align-items: center; gap: 6px; }
  .kpi-val { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; }
  .text-xs { font-size: 11.5px; }
  .text-success { color: var(--success); }
  .text-warning { color: var(--warning); }
  .text-error { color: var(--error); }
  .text-link { color: var(--link); }
  .hidden { display: none !important; }
  .divider { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  th { color: var(--muted-foreground); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  tbody tr:hover { background: var(--surface-hover); }

  pre {
    margin: 0;
    padding: 9px 10px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 3px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11.5px;
    line-height: 1.45;
    overflow-x: auto;
  }
  details { background: var(--card); border: 1px solid var(--border); border-radius: 3px; }
  details > summary {
    list-style: none;
    padding: 6px 10px;
    cursor: pointer;
    font-weight: 500;
    font-size: 11.5px;
    color: var(--muted-foreground);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  details > summary:hover { color: var(--foreground); background: var(--surface-hover); }
  details > summary::-webkit-details-marker { display: none; }
  details[open] .lbl-open { display: none; }
  details:not([open]) .lbl-close { display: none; }
  .details-body { padding: 8px 10px 10px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

  .progress-track { width: 100%; height: 5px; border-radius: 2px; background: color-mix(in srgb, var(--foreground) 12%, transparent); overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; }

  .timeline-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
  .timeline-line { width: 1px; flex: 1; background: var(--border); margin: 3px 0; }

  .toast {
    position: fixed; right: 16px; bottom: 16px; z-index: 999;
    background: var(--card); color: var(--foreground);
    border: 1px solid var(--primary);
    padding: 7px 12px; border-radius: 3px; font-size: 12px; font-weight: 500;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  }
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-box {
    width: min(680px, 100%); background: var(--card); border: 1px solid var(--border);
    border-radius: 4px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .modal-box textarea {
    width: 100%; min-height: 220px; background: var(--background); color: var(--foreground);
    border: 1px solid var(--border); border-radius: 3px; padding: 8px; font-size: 12px;
  }
`;

const clientScript = `
(function () {
  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
  let DATA = null;

  function showFatal(msg) {
    const el = document.getElementById("runtimeError");
    if (el) {
      el.textContent = "Ошибка инициализации дашборда: " + msg;
      el.classList.remove("hidden");
    }
  }

  try {
    const raw = document.getElementById("dashboard-data");
    if (!raw || !raw.textContent) throw new Error("Отсутствует JSON-блок dashboard-data");
    DATA = JSON.parse(raw.textContent);
  } catch (err) {
    showFatal(err && err.message ? err.message : String(err));
    return;
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function calcICE(item) {
    const impact = Number(item.impact || 5);
    const confidence = Number(item.confidence || 5);
    const effort = Math.max(0.5, Number(item.effort || 2));
    return Number(((impact * confidence) / effort).toFixed(1));
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      t.classList.add("hidden");
    }, 2400);
  }

  function openCopyModal(text, title) {
    const modal = document.getElementById("copyModal");
    const ta = document.getElementById("copyModalText");
    const heading = document.getElementById("copyModalTitle");
    if (!modal || !ta) return;
    if (heading) heading.textContent = title || "Нажмите Ctrl+C для копирования";
    ta.value = text;
    modal.classList.remove("hidden");
    ta.focus();
    ta.select();
  }

  function execCommandCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.left = "-1000px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Boolean(ok);
    } catch (_) {
      return false;
    }
  }

  function copyText(text, label) {
    const okMsg = label || "Скопировано в буфер обмена";
    if (vscode) {
      vscode.postMessage({ type: "copy", text: text, label: okMsg });
      showToast(okMsg);
      return;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast(okMsg);
        },
        function () {
          if (execCommandCopy(text)) showToast(okMsg);
          else openCopyModal(text, okMsg + " (нажмите Ctrl+C)");
        }
      );
      return;
    }
    if (execCommandCopy(text)) {
      showToast(okMsg);
    } else {
      openCopyModal(text, okMsg + " (нажмите Ctrl+C)");
    }
  }

  function trackBadge(track) {
    const t = String(track || "Backend");
    return '<span class="tag tag-strong">' + esc(t) + "</span>";
  }

  function modelBadge(item) {
    const q1 = item.uiQuota != null ? " " + esc(item.uiQuota) + "%" : "";
    const q2 = item.fallbackQuota != null ? " " + esc(item.fallbackQuota) + "%" : "";
    const fb = item.fallbackModel ? " → " + esc(item.fallbackModel) + q2 : "";
    return (
      '<span class="tag mono">' + esc(item.uiModel || "Auto") + q1 + fb + "</span>" +
      '<span class="tag mono" title="Слот субагента">субагент: ' + esc(item.subagent || "inherit") + "</span>"
    );
  }

  const state = {
    tab: "orchestrator",
    track: "all",
    sort: "ice",
    knowledgeQuery: "",
    backlogQuery: "",
    backlogQuadrant: "all",
    backlogSize: "all",
    backlogSort: "quadrant",
    cmsFilter: "all",
  };

  function quadrantRank(q) {
    return q === "Q1" ? 1 : q === "Q2" ? 2 : q === "Q3" ? 3 : 4;
  }

  function sizeRank(s) {
    return s === "S" ? 1 : s === "M" ? 2 : s === "L" ? 3 : 4;
  }

  function quadrantBadge(q) {
    const code = String(q || "Q2").toUpperCase();
    const dot = code === "Q1" ? "dot-err" : code === "Q2" ? "dot-warn" : code === "Q3" ? "dot-ok" : "dot-muted";
    const title = code === "Q1" ? "Важно + Срочно" : code === "Q2" ? "Важно + Не срочно" : code === "Q3" ? "Не важно + Срочно" : "Icebox";
    return '<span class="tag tag-strong mono" title="' + esc(title) + '"><span class="dot ' + dot + '"></span>' + esc(code) + "</span>";
  }

  function sizeTimeBadge(size, est, actual) {
    const parts = [esc(size || "M")];
    if (est != null) parts.push("Оценка " + esc(est) + "ч");
    if (actual != null) parts.push("Факт " + esc(actual) + "ч");
    return '<span class="tag mono">' + parts.join(" · ") + "</span>";
  }

  const promptRegistry = new Map();

  function renderHeader() {
    document.getElementById("projectNameEl").textContent = DATA.projectName;
    document.getElementById("scanTimeEl").textContent = "Скан: " + DATA.generatedAt;
    document.getElementById("kpiReadiness").textContent = DATA.readinessScore + "/100";
    document.getElementById("kpiMemoryMeta").textContent = DATA.adrCount + " ADR · " + DATA.dailyCount + " логов";

    const qaEl = document.getElementById("kpiQa");
    const qaMeta = document.getElementById("kpiQaMeta");
    if (DATA.qaPreflight) {
      const crit = (DATA.qaPreflight.critical || []).length;
      const high = (DATA.qaPreflight.high || []).length;
      qaEl.textContent = DATA.qaPreflight.verdict + (crit ? " (" + crit + ")" : "");
      qaEl.className = "kpi-val " + (crit > 0 ? "text-error" : high > 0 ? "text-warning" : "text-success");
      qaMeta.textContent = crit + " крит. · " + high + " выс.";
    } else {
      qaEl.textContent = "Н/Д";
      qaMeta.textContent = "плагин QA не активен";
    }

    document.getElementById("kpiBacklog").textContent = DATA.backlog.completionPct + "%";
    document.getElementById("kpiBacklogMeta").textContent = DATA.backlog.doneCount + " выполн. · " + DATA.backlog.openCount + " откр.";

    const tok = DATA.contextBudget.totalBaselineOverheadTokens || 0;
    const tokEl = document.getElementById("kpiContext");
    tokEl.textContent = "~" + (tok >= 1000 ? (tok / 1000).toFixed(1) + "k" : tok) + " ток.";
    tokEl.className = "kpi-val " + (DATA.contextBudget.status === "needs_trim" ? "text-warning" : "text-success");
    document.getElementById("kpiContextMeta").textContent =
      DATA.contextBudget.status === "needs_trim" ? "нужна чистка" : "в норме";

    const tabKnowledgeBtn = document.querySelector('[data-tab="knowledge"]');
    if (tabKnowledgeBtn) {
      const cmsPct = DATA.cmsChecklist && DATA.cmsChecklist.summary ? DATA.cmsChecklist.summary.completionPct : null;
      tabKnowledgeBtn.textContent = cmsPct != null ? "Знания и CMS (" + cmsPct + "%)" : "Знания (" + DATA.knowledge.length + ")";
    }
    const tabBacklogBtn = document.querySelector('[data-tab="backlog"]');
    if (tabBacklogBtn) tabBacklogBtn.textContent = "Бэклог (" + DATA.backlog.openCount + ")";
    const tabSkillsBtn = document.querySelector('[data-tab="skills"]');
    if (tabSkillsBtn && DATA.learnedSkills) {
      tabSkillsBtn.textContent = "Навыки и PR (" + (DATA.learnedSkills.count || 0) + ")";
    }
  }

  function renderSetupPipeline() {
    const el = document.getElementById("setupPipelineBox");
    if (!el || !DATA.setupPipeline) return;
    const sp = DATA.setupPipeline;
    if (!sp.steps || sp.steps.length === 0) {
      el.classList.add("hidden");
      return;
    }
    el.classList.remove("hidden");
    if (sp.allDone) {
      el.innerHTML =
        '<div class="row-between text-xs">' +
        '<span class="row"><span class="dot dot-ok"></span><strong>Первичная настройка проекта завершена (' + sp.completedCount + "/" + sp.totalSteps + ")</strong></span>" +
        '<span class="muted">Одноразовые инструкции автоматически свернуты</span>' +
        "</div>";
      return;
    }
    el.innerHTML =
      '<div class="row-between">' +
      '<div class="title-md">Маршрут настройки (' + sp.completedCount + "/" + sp.totalSteps + ")</div>" +
      '<span class="text-xs muted">Выполните оставшиеся шаги до старта спринта</span>' +
      "</div>" +
      '<div class="row">' +
      sp.steps
        .map(function (st, idx) {
          return (
            '<span class="tag ' + (st.done ? "" : "tag-strong") + '">' +
            '<span class="dot ' + (st.done ? "dot-ok" : "dot-warn") + '"></span>' +
            (idx + 1) + ". " + esc(st.label) +
            "</span>"
          );
        })
        .join("") +
      "</div>";
  }

  const PERM_PRESETS = {
    safe_default: {
      outside_workspace: { level: "deny", note: "Только внутри текущей папки проекта" },
      internet: { level: "read_only", note: "Только чтение официальной документации и live SEO/QA-чеки" },
      terminal: { level: "read_only", note: "Проверки синтаксиса и git status/diff; мутации через подтверждение" },
      ssh: { level: "deny", note: "Подключение по SSH запрещено без явного разрешения" },
      database: { level: "deny", note: "Прямые запросы к БД запрещены; миграции через D7" },
      deploy: { level: "ask", note: "Любой git push / деплой только после подтверждения" },
    },
    local_dev: {
      outside_workspace: { level: "read_only", note: "Чтение глобальных плагинов/шаблонов; запись только в проекте" },
      internet: { level: "read_only", note: "Документация, read-only проверки URL и API" },
      terminal: { level: "allow", note: "Локальные сборки, тесты, git commit (без деструктивных команд)" },
      ssh: { level: "ask", note: "Только по явному подтверждению оператора" },
      database: { level: "read_only", note: "Только SELECT / инспекция схемы на локальном стенде" },
      deploy: { level: "ask", note: "Push / деплой только после явного подтверждения" },
    },
    staging_full: {
      outside_workspace: { level: "read_only", note: "Чтение внешних конфигов; запись только в проекте" },
      internet: { level: "allow", note: "Документация, внешние API и staging-проверки" },
      terminal: { level: "allow", note: "Полный локальный CLI и тестовые скрипты" },
      ssh: { level: "staging_rw", note: "Чтение/запись на staging; на prod строго ask/read_only" },
      database: { level: "staging_rw", note: "Чтение/миграции на staging; на prod строго ask" },
      deploy: { level: "staging_only", note: "Автодеплой допустим только на staging; prod строго через подтверждение" },
    },
  };

  const PERM_LEVEL_OPTIONS = [
    { v: "deny", l: "Запрещено (deny)" },
    { v: "read_only", l: "Только чтение (read_only)" },
    { v: "ask", l: "Спрашивать (ask)" },
    { v: "staging_rw", l: "Staging чтение/запись (staging_rw)" },
    { v: "staging_only", l: "Только Staging (staging_only)" },
    { v: "allow", l: "Разрешено (allow)" },
  ];

  const PERM_AXIS_META = {
    outside_workspace: { title: "Файлы вне проекта", hint: "Чтение и запись за пределами рабочей папки" },
    internet: { title: "Интернет / API", hint: "Документация, live SEO/QA и внешние запросы" },
    terminal: { title: "Терминал / CLI", hint: "Синтаксис, тесты, скрипты и git" },
    ssh: { title: "SSH / Серверы", hint: "Подключение к удалённым серверам" },
    database: { title: "База данных", hint: "Запросы SELECT и миграции схемы" },
    deploy: { title: "Деплой / Git Push", hint: "Отправка на staging, prod и внешние сервисы" },
  };

  let draftPermissions = {
    profile: (DATA.permissions && DATA.permissions.configured ? DATA.permissions.profile : "safe_default"),
    rules: JSON.parse(JSON.stringify((DATA.permissions && DATA.permissions.rules) || PERM_PRESETS.safe_default)),
  };

  function renderVelocityAndSprints() {
    const box = document.getElementById("sprintsPanel");
    if (!box || !DATA.velocity) return;
    const v = DATA.velocity;
    const srcEl = document.getElementById("velSourceBadge");
    if (srcEl) srcEl.textContent = v.source || "по умолчанию";
    document.getElementById("velSummaryText").textContent =
      "Ритм: " + v.hoursPerDay + " ч/день × " + v.daysPerWeek + " дн/нед = " + v.weeklyCapacityHours +
      " ч/нед · Коэфф. точности (Факт/Оценка): " + v.calibrationFactor + "x";

    const hIn = document.getElementById("velHoursInput");
    const dIn = document.getElementById("velDaysInput");
    if (hIn && !hIn.dataset.init) { hIn.value = String(v.hoursPerDay || 2); hIn.dataset.init = "1"; }
    if (dIn && !dIn.dataset.init) { dIn.value = String(v.daysPerWeek || 5); dIn.dataset.init = "1"; }

    const allSprints = Array.isArray(v.allSprints) && v.allSprints.length > 0 ? v.allSprints : (v.sprints || []);
    const totalSp = v.totalSprints != null ? v.totalSprints : allSprints.length;
    const doneSp = v.doneSprints != null ? v.doneSprints : allSprints.filter(function (s) { return s.status === "done"; }).length;
    const openSp = v.openSprints != null ? v.openSprints : Math.max(0, totalSp - doneSp);

    const overviewEl = document.getElementById("sprintsOverviewBar");
    if (overviewEl) {
      overviewEl.innerHTML =
        '<span class="tag tag-strong mono">Всего спринтов: ' + esc(totalSp) + "</span>" +
        '<span class="tag mono"><span class="dot dot-ok"></span>Завершено: ' + esc(doneSp) + "</span>" +
        '<span class="tag mono"><span class="dot ' + (openSp > 0 ? "dot-warn" : "dot-ok") + '"></span>Осталось: ' + esc(openSp) + "</span>" +
        (v.overallDeadline
          ? '<span class="tag mono">Прогноз финиша всех спринтов: ' + esc(v.overallDeadline) + "</span>"
          : '<span class="tag tag-success mono">Все спринты завершены</span>');
    }

    const listEl = document.getElementById("sprintsGrid");
    if (!allSprints || allSprints.length === 0) {
      listEl.innerHTML = '<div class="subcard text-xs muted">Спринты не обнаружены в бэклоге.</div>';
      return;
    }

    function renderSprintTasks(tasks) {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return '<div class="text-xs muted">Задачи не указаны.</div>';
      }
      return (
        '<div class="col" style="gap:4px;">' +
        tasks
          .map(function (t) {
            const dot = t.done ? "dot-ok" : "dot-muted";
            const timeParts = [esc(t.size || "M")];
            if (t.estHours != null) timeParts.push("Оц." + esc(t.estHours) + "ч");
            if (t.actualHours != null) timeParts.push("Факт " + esc(t.actualHours) + "ч");
            const clStr = t.checklistTotal > 0 ? t.checklistDone + "/" + t.checklistTotal : "";
            return (
              '<div class="row-between" style="gap:6px;padding:4px 6px;border:1px solid var(--border);border-radius:3px;background:var(--card);">' +
              '<div class="row" style="gap:5px;flex:1;min-width:0;">' +
              '<span class="dot ' + dot + '"></span>' +
              (t.id ? '<span class="mono text-xs" style="font-weight:600;">' + esc(t.id) + "</span>" : "") +
              quadrantBadge(t.quadrant || "Q2") +
              '<span class="text-xs" style="' + (t.done ? "opacity:0.8;" : "font-weight:500;") + '">' + esc(t.text) + "</span>" +
              "</div>" +
              '<div class="row" style="gap:4px;flex-shrink:0;">' +
              '<span class="tag mono">' + timeParts.join(" · ") + "</span>" +
              (clStr ? '<span class="tag mono" title="Чеклист приёмки">' + esc(clStr) + "</span>" : "") +
              "</div>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    listEl.innerHTML = allSprints
      .map(function (sp) {
        const isDone = sp.status === "done";
        const isActive = sp.status === "active";
        const statusTag = isDone
          ? '<span class="tag tag-success"><span class="dot dot-ok"></span>Завершён</span>'
          : isActive
          ? '<span class="tag tag-strong"><span class="dot dot-warn"></span>Активный</span>'
          : '<span class="tag"><span class="dot dot-muted"></span>Запланирован</span>';

        const timingTag = isDone
          ? '<span class="tag mono">Оценка ' + esc(sp.estHours) + "ч" + (sp.actualHours ? " · Факт " + esc(sp.actualHours) + "ч" : "") + "</span>"
          : '<span class="tag mono"><span class="dot ' + (sp.overloaded ? "dot-warn" : "dot-ok") + '"></span>' +
            (sp.startDate ? esc(sp.startDate) + " → " : "") + esc(sp.projectedDeadline || "—") +
            (sp.workDaysNeeded ? " (~" + esc(sp.workDaysNeeded) + " раб. дн.)" : "") + "</span>";

        const pctWidth = isDone ? 100 : Math.min(100, sp.loadPct || 0);
        const barColor = isDone ? "var(--success)" : sp.overloaded ? "var(--warning)" : "var(--primary)";
        const statsLeft = isDone
          ? "Задач выполнено: " + esc(sp.doneCount) + "/" + esc(sp.tasksCount) + " (100%)"
          : "Задач: " + esc(sp.openCount) + " откр. / " + esc(sp.tasksCount) + " всего · Осталось " + esc(sp.openEstHours != null ? sp.openEstHours : sp.estHours) + "ч" + (sp.q1Count ? " · Q1:" + sp.q1Count : "");
        const statsRight = isDone
          ? "100% закрыто"
          : esc(sp.loadPct) + "% нед." + (sp.overloaded ? " (перегруз)" : "");

        const tasksHtml = renderSprintTasks(sp.tasks);
        const tasksBlock = isDone
          ? "<details><summary><span>Задачи спринта (" + esc(sp.tasksCount) + ')</span><span class="text-link lbl-open">Показать</span><span class="text-link lbl-close">Скрыть</span></summary><div class="details-body">' + tasksHtml + "</div></details>"
          : '<div class="col" style="gap:4px;margin-top:2px;"><div class="text-xs muted" style="font-weight:600;">Задачи спринта (' + esc(sp.tasksCount) + "):</div>" + tasksHtml + "</div>";

        return (
          '<div class="subcard col" style="gap:7px;">' +
          '<div class="row-between">' +
          statusTag +
          timingTag +
          "</div>" +
          '<strong style="font-size:12.5px;">' + esc(sp.name) + "</strong>" +
          '<div class="row-between text-xs muted mono">' +
          "<span>" + statsLeft + "</span>" +
          "<span>" + statsRight + "</span>" +
          "</div>" +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pctWidth + "%;background:" + barColor + ';"></div></div>' +
          tasksBlock +
          "</div>"
        );
      })
      .join("");
  }

  function renderPermissionsMatrix() {
    const grid = document.getElementById("permissionsGrid");
    if (!grid) return;
    const p = DATA.permissions || { configured: false, profile: "unconfigured" };
    const badge = document.getElementById("permProfileBadge");
    const profNames = { safe_default: "безопасный", local_dev: "локальная разработка", staging_full: "staging", custom: "настроен вручную" };
    if (badge) {
      badge.textContent = p.configured
        ? "профиль: " + (profNames[draftPermissions.profile] || draftPermissions.profile)
        : "не сохранено (черновик: " + (profNames[draftPermissions.profile] || draftPermissions.profile) + ")";
      badge.className = "tag mono " + (p.configured ? "tag-success" : "tag-warning");
    }

    document.querySelectorAll("[data-perm-preset]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.permPreset === draftPermissions.profile ? "true" : "false");
    });

    const keys = Object.keys(PERM_AXIS_META);
    grid.innerHTML = keys
      .map(function (k) {
        const meta = PERM_AXIS_META[k];
        const rule = (draftPermissions.rules && draftPermissions.rules[k]) || { level: "ask", note: meta.hint };
        const lvl = String(rule.level || "ask");
        const dot = lvl === "deny" ? "dot-err" : lvl === "allow" ? "dot-ok" : "dot-warn";
        const optsHtml = PERM_LEVEL_OPTIONS.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (o.v === lvl ? " selected" : "") + ">" + esc(o.l) + "</option>";
        }).join("");
        return (
          '<div class="subcard col" style="gap:6px;">' +
          '<div class="row-between">' +
          '<strong class="text-xs"><span class="dot ' + dot + '" style="margin-right:5px;"></span>' + esc(meta.title) + "</strong>" +
          '<span class="text-xs mono muted">' + esc(k) + "</span>" +
          "</div>" +
          '<select class="select perm-axis-select" data-perm-axis="' + esc(k) + '" style="width:100%;">' + optsHtml + "</select>" +
          '<div class="text-xs muted">' + esc(rule.note || meta.hint) + "</div>" +
          "</div>"
        );
      })
      .join("");

    const saveBtn = document.getElementById("savePermBtn");
    if (saveBtn) {
      saveBtn.textContent = vscode ? "Сохранить в .agents/permissions.json" : "Скопировать JSON разрешений";
    }
  }

  function renderBlindSpots() {
    const box = document.getElementById("blindSpotsGrid");
    if (!box) return;
    if (!DATA.blindSpots || DATA.blindSpots.length === 0) {
      box.innerHTML = '<div class="subcard text-xs muted">Критических слепых пятен автосканерами не обнаружено.</div>';
      return;
    }
    box.innerHTML = DATA.blindSpots
      .map(function (b) {
        const dot =
          b.severity === "error"
            ? "dot-err"
            : b.severity === "warning"
            ? "dot-warn"
            : "dot-ok";
        return (
          '<div class="subcard col" style="gap:5px;">' +
          '<div class="row-between">' +
          '<span class="tag tag-strong"><span class="dot ' + dot + '"></span>' + esc(b.badge) + "</span>" +
          '<span class="text-xs mono muted">' + esc(b.metric || "") + "</span>" +
          "</div>" +
          '<div class="text-xs" style="font-weight:600;">' + esc(b.title) + "</div>" +
          '<div class="text-xs muted">' + esc(b.detail) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderTrackFilters() {
    const container = document.getElementById("trackFilters");
    if (!container) return;
    const counts = { all: DATA.initiatives.length };
    DATA.initiatives.forEach(function (i) {
      counts[i.track] = (counts[i.track] || 0) + 1;
    });
    const order = [
      { key: "all", label: "Все треки" },
      { key: "QA", label: "QA" },
      { key: "SEO & GEO", label: "SEO & GEO" },
      { key: "Frontend", label: "Frontend" },
      { key: "Маркетинг", label: "Маркетинг" },
      { key: "Backend", label: "Backend" },
    ];
    container.innerHTML = order
      .filter(function (o) {
        return o.key === "all" || (counts[o.key] || 0) > 0;
      })
      .map(function (o) {
        const pressed = state.track === o.key ? "true" : "false";
        return (
          '<button type="button" class="filter-btn pill-btn" aria-pressed="' +
          pressed +
          '" data-track="' +
          esc(o.key) +
          '">' +
          esc(o.label) +
          ' <span class="mono muted">' +
          (counts[o.key] || 0) +
          "</span></button>"
        );
      })
      .join("");
  }

  function renderInitiatives() {
    const container = document.getElementById("initiativesList");
    if (!container) return;
    let list = DATA.initiatives.map(function (item) {
      return Object.assign({}, item, { ice: calcICE(item) });
    });
    if (state.track !== "all") {
      list = list.filter(function (i) {
        return i.track === state.track;
      });
    }
    if (state.sort === "quadrant") {
      list.sort(function (a, b) {
        return quadrantRank(a.quadrant || "Q2") - quadrantRank(b.quadrant || "Q2") || b.ice - a.ice;
      });
    }
    if (state.sort === "ice") list.sort(function (a, b) { return b.ice - a.ice; });
    if (state.sort === "effort") list.sort(function (a, b) { return a.effort - b.effort || b.ice - a.ice; });
    if (state.sort === "impact") list.sort(function (a, b) { return b.impact - a.impact || b.ice - a.ice; });

    if (list.length === 0) {
      container.innerHTML = '<div class="subcard text-xs muted">Нет инициатив для выбранного трека.</div>';
      return;
    }

    container.innerHTML = list
      .map(function (item) {
        const regKey = "init:" + item.id;
        promptRegistry.set(regKey, { text: item.prompt, label: "Промпт " + item.id + " скопирован" });
        return (
          '<article class="subcard col" style="gap:8px;padding:11px 12px;">' +
          '<div class="row-between">' +
          '<div class="row">' +
          quadrantBadge(item.quadrant || (item.ice >= 30 ? "Q1" : "Q2")) +
          sizeTimeBadge(item.size || (item.effort <= 1.5 ? "S" : item.effort <= 3 ? "M" : "L"), item.estHours || item.effort, null) +
          trackBadge(item.track) +
          '<span class="tag mono">' + esc(item.tier) + " · " + esc(item.pipeline) + "</span>" +
          modelBadge(item) +
          "</div>" +
          '<div class="row">' +
          '<span class="text-xs mono muted">I:' + esc(item.impact) + " C:" + esc(item.confidence) + " E:" + esc(item.effort) + "</span>" +
          '<span class="tag tag-strong mono">ICE ' + esc(item.ice) + "</span>" +
          "</div>" +
          "</div>" +
          '<div style="font-size:13px;font-weight:600;">' + esc(item.title) + "</div>" +
          '<div class="grid-2">' +
          '<div class="panel" style="padding:8px 10px;">' +
          '<div class="text-xs muted" style="font-weight:600;margin-bottom:2px;">Бизнес-польза</div>' +
          '<div class="text-xs">' + esc(item.benefit) + "</div>" +
          "</div>" +
          '<div class="panel" style="padding:8px 10px;">' +
          '<div class="text-xs muted" style="font-weight:600;margin-bottom:2px;">Обоснование · Инструменты</div>' +
          '<div class="text-xs">' + esc(item.evidence) + "</div>" +
          '<div class="text-xs text-link mono" style="margin-top:3px;">' + esc(item.tools) + "</div>" +
          "</div>" +
          "</div>" +
          "<details>" +
          "<summary>" +
          "<span>Промпт для запуска агента (AC-001..N + Must NOT)</span>" +
          '<span class="text-link lbl-open">Показать</span>' +
          '<span class="text-link lbl-close">Скрыть</span>' +
          "</summary>" +
          '<div class="details-body">' +
          '<pre class="mono">' + esc(item.prompt) + "</pre>" +
          '<div class="row" style="justify-content:flex-end;">' +
          '<button type="button" class="btn btn-primary copy-trigger" data-copy-key="' + esc(regKey) + '">Копировать промпт (' + esc(item.id) + ")</button>" +
          "</div>" +
          "</div>" +
          "</details>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderKnowledge() {
    const body = document.getElementById("knowledgeBody");
    if (!body) return;
    const q = state.knowledgeQuery.trim().toLowerCase();
    const rows = DATA.knowledge.filter(function (k) {
      return (
        !q ||
        String(k.label).toLowerCase().includes(q) ||
        String(k.category).toLowerCase().includes(q) ||
        String(k.evidence).toLowerCase().includes(q)
      );
    });
    body.innerHTML = rows
      .map(function (k, idx) {
        const dot =
          k.status === "ok"
            ? "dot-ok"
            : k.status === "error"
            ? "dot-err"
            : "dot-warn";
        let actionHtml = '<span class="muted">—</span>';
        if (k.personalizePrompt) {
          const key = "know:" + idx;
          promptRegistry.set(key, { text: k.personalizePrompt, label: "Промпт персонализации скопирован" });
          actionHtml =
            '<button type="button" class="btn copy-trigger" data-copy-key="' + esc(key) + '">Промпт</button>';
        }
        return (
          "<tr>" +
          '<td style="font-weight:500;">' + esc(k.label) + "</td>" +
          '<td><span class="tag">' + esc(k.category) + "</span></td>" +
          '<td><span class="tag tag-strong"><span class="dot ' + dot + '"></span>' + esc(k.statusLabel) + "</span></td>" +
          '<td class="muted">' + esc(k.evidence) + "</td>" +
          "<td>" + actionHtml + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  const CMS_ARCHETYPE_LABELS = {
    store: "Интернет-магазин (E-commerce)",
    crm_b24: "Интернет-магазин + Битрикс24 Коробка (CRM)",
    services: "Сайт услуг / каталог без онлайн-оплаты",
    corporate: "Корпоративный сайт",
    minimal: "Минимальный (Базовое ядро)",
  };
  const CMS_ECOM_BLOCKS = { B04: true, B05: true, B06: true };
  let draftCmsChecklist = JSON.parse(JSON.stringify(DATA.cmsChecklist || { archetype: "store", blocks: [] }));
  const openCmsBlocks = new Set();
  let cmsOpenInitialized = false;

  function recalcDraftCmsSummary() {
    let totalItems = 0, applicableItems = 0, verifiedItems = 0, needsSetupItems = 0, notApplicableItems = 0;
    (draftCmsChecklist.blocks || []).forEach(function (b) {
      let bVer = 0, bNeed = 0, bNa = 0;
      (b.items || []).forEach(function (it) {
        totalItems++;
        if (it.status === "not_applicable") { bNa++; notApplicableItems++; }
        else if (it.status === "verified") { bVer++; verifiedItems++; applicableItems++; }
        else { bNeed++; needsSetupItems++; applicableItems++; }
      });
      const bApp = (b.items || []).length - bNa;
      b.stats = {
        total: (b.items || []).length,
        applicable: bApp,
        verified: bVer,
        needsSetup: bNeed,
        notApplicable: bNa,
        completionPct: bApp > 0 ? Math.round((bVer / bApp) * 100) : 100,
      };
    });
    draftCmsChecklist.summary = {
      blocksCount: (draftCmsChecklist.blocks || []).length,
      totalItems: totalItems,
      applicableItems: applicableItems,
      verifiedItems: verifiedItems,
      needsSetupItems: needsSetupItems,
      notApplicableItems: notApplicableItems,
      completionPct: applicableItems > 0 ? Math.round((verifiedItems / applicableItems) * 100) : 100,
    };
  }

  function renderCmsChecklist() {
    const container = document.getElementById("cmsChecklistBlocks");
    if (!container) return;
    if (!draftCmsChecklist || !Array.isArray(draftCmsChecklist.blocks) || draftCmsChecklist.blocks.length === 0) {
      container.innerHTML = '<div class="subcard text-xs muted">Чеклист модулей 1С-Битрикс недоступен.</div>';
      return;
    }
    recalcDraftCmsSummary();
    const s = draftCmsChecklist.summary;

    const archSel = document.getElementById("cmsArchetypeSelect");
    if (archSel) archSel.value = draftCmsChecklist.archetype || "store";

    const badge = document.getElementById("cmsChecklistBadge");
    if (badge) {
      badge.textContent = draftCmsChecklist.configured
        ? "сохранено · " + s.completionPct + "%"
        : "черновик · " + s.completionPct + "%";
      badge.className = "tag mono " + (s.completionPct >= 80 ? "tag-success" : "tag-strong");
    }

    const progLabel = document.getElementById("cmsProgressLabel");
    if (progLabel) {
      progLabel.textContent =
        "Проверено " + s.verifiedItems + "/" + s.applicableItems + " (" + s.completionPct + "%) · Требует настройки: " +
        s.needsSetupItems + " · Н/П: " + s.notApplicableItems;
    }
    const progBar = document.getElementById("cmsProgressBar");
    if (progBar) {
      progBar.style.width = s.completionPct + "%";
      progBar.style.background = s.completionPct >= 80 ? "var(--success)" : "var(--primary)";
    }

    const filterBox = document.getElementById("cmsFilterBar");
    if (filterBox) {
      const filters = [
        { k: "all", l: "Все (" + s.totalItems + ")" },
        { k: "needs_setup", l: "Требует настройки (" + s.needsSetupItems + ")" },
        { k: "verified", l: "Проверено (" + s.verifiedItems + ")" },
        { k: "not_applicable", l: "Не применимо (" + s.notApplicableItems + ")" },
      ];
      filterBox.innerHTML = filters
        .map(function (f) {
          return (
            '<button type="button" class="filter-btn" data-cms-filter="' + esc(f.k) + '" aria-pressed="' +
            (state.cmsFilter === f.k ? "true" : "false") + '">' + esc(f.l) + "</button>"
          );
        })
        .join("");
    }

    const saveBtn = document.getElementById("saveCmsChecklistBtn");
    if (saveBtn) {
      saveBtn.textContent = vscode ? "Сохранить чеклист" : "Скопировать JSON чеклиста";
    }

    const htmlBlocks = draftCmsChecklist.blocks
      .map(function (b) {
        const visibleItems = (b.items || []).filter(function (it) {
          return state.cmsFilter === "all" || it.status === state.cmsFilter;
        });
        if (visibleItems.length === 0) return "";
        const st = b.stats || { verified: 0, applicable: 0, completionPct: 0, needsSetup: 0 };
        const dot = st.applicable === 0 ? "dot-muted" : st.needsSetup === 0 ? "dot-ok" : "dot-warn";
        if (!cmsOpenInitialized && st.needsSetup > 0) {
          openCmsBlocks.add(b.id);
          cmsOpenInitialized = true;
        }
        const isOpen = openCmsBlocks.has(b.id);

        const pKey = "cms:" + b.id;
        promptRegistry.set(pKey, {
          text: b.blockPrompt || ("Проверь блок " + b.number + " (" + b.title + ") для проекта 1С-Битрикс."),
          label: "Промпт проверки блока " + b.number + " скопирован",
        });

        const itemsHtml = visibleItems
          .map(function (it) {
            const itDot = it.status === "verified" ? "dot-ok" : it.status === "not_applicable" ? "dot-muted" : "dot-warn";
            return (
              '<div class="subcard col" style="gap:5px;">' +
              '<div class="row-between" style="align-items:flex-start;">' +
              '<div class="col" style="gap:2px;flex:1;min-width:220px;">' +
              '<div class="row" style="gap:6px;"><span class="dot ' + itDot + '"></span><strong class="text-xs">' + esc(it.title) + "</strong></div>" +
              '<div class="text-xs muted">' + esc(it.hint || "") + "</div>" +
              '<div class="row" style="gap:5px;margin-top:2px;">' +
              '<span class="tag mono">' + esc(it.adminPath || b.adminPath || "") + "</span>" +
              (it.autoEvidence ? '<span class="tag tag-strong">Автоскан: ' + esc(it.autoEvidence) + "</span>" : "") +
              "</div>" +
              "</div>" +
              '<select class="select cms-item-select" data-cms-block="' + esc(b.id) + '" data-cms-item="' + esc(it.id) + '" style="min-width:160px;">' +
              '<option value="needs_setup"' + (it.status === "needs_setup" ? " selected" : "") + ">Требует настройки</option>" +
              '<option value="verified"' + (it.status === "verified" ? " selected" : "") + ">Проверено</option>" +
              '<option value="not_applicable"' + (it.status === "not_applicable" ? " selected" : "") + ">Не применимо</option>" +
              "</select>" +
              "</div>" +
              "</div>"
            );
          })
          .join("");

        return (
          '<details data-cms-details="' + esc(b.id) + '"' + (isOpen ? " open" : "") + ">" +
          "<summary>" +
          '<span class="row" style="gap:6px;">' +
          '<span class="dot ' + dot + '"></span>' +
          '<strong style="color:var(--foreground);">' + esc(b.number) + ". " + esc(b.title) + "</strong>" +
          '<span class="tag mono">' + esc(b.module) + "</span>" +
          "</span>" +
          '<span class="row" style="gap:6px;">' +
          '<span class="tag mono">' + (st.applicable === 0 ? "Н/П" : esc(st.verified) + "/" + esc(st.applicable) + " (" + esc(st.completionPct) + "%)") + "</span>" +
          '<span class="text-link lbl-open">Показать</span>' +
          '<span class="text-link lbl-close">Скрыть</span>' +
          "</span>" +
          "</summary>" +
          '<div class="details-body">' +
          '<div class="row-between text-xs">' +
          '<span class="muted mono">Админка / путь: ' + esc(b.adminPath || "—") + "</span>" +
          '<button type="button" class="btn copy-trigger" data-copy-key="' + esc(pKey) + '">Промпт автопроверки блока</button>' +
          "</div>" +
          itemsHtml +
          "</div>" +
          "</details>"
        );
      })
      .filter(Boolean)
      .join("");

    container.innerHTML = htmlBlocks || '<div class="subcard text-xs muted">Нет пунктов по выбранному фильтру.</div>';
  }

  function renderBacklogFilters() {
    const qBox = document.getElementById("backlogQuadrantFilters");
    if (qBox) {
      const qc = DATA.backlog.quadrantCounts || {};
      const qDefs = [
        { k: "all", label: "Все", count: DATA.backlog.openTasks.length },
        { k: "Q1", label: "Q1 Важно+Срочно", count: qc.Q1 || 0, dot: "dot-err" },
        { k: "Q2", label: "Q2 Важно", count: qc.Q2 || 0, dot: "dot-warn" },
        { k: "Q3", label: "Q3 Срочно", count: qc.Q3 || 0, dot: "dot-ok" },
        { k: "Q4", label: "Q4 Icebox", count: qc.Q4 || 0, dot: "dot-muted" },
      ];
      qBox.innerHTML = qDefs
        .map(function (d) {
          return (
            '<button type="button" class="filter-btn" aria-pressed="' +
            (state.backlogQuadrant === d.k ? "true" : "false") +
            '" data-bl-quadrant="' + esc(d.k) + '">' +
            (d.dot ? '<span class="dot ' + d.dot + '"></span>' : "") +
            esc(d.label) + ' <span class="mono muted">' + d.count + "</span></button>"
          );
        })
        .join("");
    }

    const sBox = document.getElementById("backlogSizeFilters");
    if (sBox) {
      const sc = DATA.backlog.sizeCounts || {};
      const sDefs = [
        { k: "all", label: "Любая сложность" },
        { k: "S", label: "S (" + (sc.S || 0) + ")" },
        { k: "M", label: "M (" + (sc.M || 0) + ")" },
        { k: "L", label: "L (" + (sc.L || 0) + ")" },
        { k: "XL", label: "XL (" + (sc.XL || 0) + ")" },
      ];
      sBox.innerHTML = sDefs
        .map(function (d) {
          return (
            '<button type="button" class="filter-btn mono" aria-pressed="' +
            (state.backlogSize === d.k ? "true" : "false") +
            '" data-bl-size="' + esc(d.k) + '">' + esc(d.label) + "</button>"
          );
        })
        .join("");
    }
  }

  function renderBacklog() {
    const nsBox = document.getElementById("northStarBox");
    if (nsBox) {
      if (DATA.northStar) {
        nsBox.classList.remove("hidden");
        document.getElementById("northStarText").textContent = DATA.northStar;
      } else {
        nsBox.classList.add("hidden");
      }
    }

    const q = state.backlogQuery.trim().toLowerCase();
    const pct = DATA.backlog.completionPct || 0;
    const estMeta = DATA.backlog.totalEstHours
      ? " · Est " + DATA.backlog.totalEstHours + "ч / Факт " + (DATA.backlog.totalActualHours || 0) + "ч"
      : "";
    document.getElementById("backlogProgressLabel").textContent =
      DATA.backlog.doneCount + " / " + DATA.backlog.totalCount + " (" + pct + "%)" + estMeta;
    const bar = document.getElementById("backlogProgressBar");
    if (bar) bar.style.width = pct + "%";

    renderBacklogFilters();

    let openFiltered = DATA.backlog.openTasks.filter(function (t) {
      if (state.backlogQuadrant !== "all" && t.quadrant !== state.backlogQuadrant) return false;
      if (state.backlogSize !== "all" && t.size !== state.backlogSize) return false;
      return (
        !q ||
        String(t.text).toLowerCase().includes(q) ||
        String(t.id).toLowerCase().includes(q) ||
        String(t.businessValue || "").toLowerCase().includes(q)
      );
    });

    if (state.backlogSort === "quadrant") {
      openFiltered.sort(function (a, b) {
        return quadrantRank(a.quadrant) - quadrantRank(b.quadrant) || sizeRank(a.size) - sizeRank(b.size);
      });
    } else if (state.backlogSort === "size") {
      openFiltered.sort(function (a, b) {
        return sizeRank(a.size) - sizeRank(b.size) || quadrantRank(a.quadrant) - quadrantRank(b.quadrant);
      });
    } else if (state.backlogSort === "progress") {
      openFiltered.sort(function (a, b) {
        const pa = a.checklistTotal ? a.checklistDone / a.checklistTotal : 0;
        const pb = b.checklistTotal ? b.checklistDone / b.checklistTotal : 0;
        return pb - pa;
      });
    }

    const openEl = document.getElementById("openBacklogList");
    if (openFiltered.length === 0) {
      openEl.innerHTML = '<div class="subcard text-xs muted">Открытых задач по фильтру не найдено.</div>';
    } else {
      openEl.innerHTML = openFiltered
        .map(function (t, idx) {
          const key = "bl:" + idx + ":" + t.id;
          promptRegistry.set(key, { text: t.prompt, label: "Промпт для " + t.id + " скопирован" });
          const cbTotal = t.checklistTotal || 0;
          const cbDone = t.checklistDone || 0;
          const cbPct = cbTotal > 0 ? Math.round((cbDone / cbTotal) * 100) : 0;
          const checklistHtml =
            Array.isArray(t.checklist) && t.checklist.length > 0
              ? "<details>" +
                "<summary>" +
                "<span>Чеклист приёмки (DoD): " + cbDone + "/" + cbTotal + " (" + cbPct + "%)</span>" +
                '<span class="text-link lbl-open">Показать</span>' +
                '<span class="text-link lbl-close">Скрыть</span>' +
                "</summary>" +
                '<div class="details-body">' +
                t.checklist
                  .map(function (c) {
                    return (
                      '<div class="row text-xs ' + (c.done ? "muted" : "") + '">' +
                      '<span class="dot ' + (c.done ? "dot-ok" : "dot-muted") + '"></span>' +
                      "<span>" + esc(c.text) + "</span>" +
                      "</div>"
                    );
                  })
                  .join("") +
                "</div>" +
                "</details>"
              : "";
          return (
            '<div class="subcard col" style="gap:7px;">' +
            '<div class="row-between">' +
            '<div class="row">' +
            '<span class="mono text-link" style="font-weight:600;">' + esc(t.id) + "</span>" +
            quadrantBadge(t.quadrant) +
            sizeTimeBadge(t.size, t.estHours, t.actualHours) +
            (t.sprint ? '<span class="tag">' + esc(t.sprint) + "</span>" : "") +
            "</div>" +
            '<button type="button" class="btn copy-trigger" data-copy-key="' + esc(key) + '">Копировать промпт</button>' +
            "</div>" +
            '<div style="font-size:12.5px;font-weight:600;">' + esc(t.text) + "</div>" +
            (t.businessValue ? '<div class="text-xs muted"><strong>Ценность:</strong> ' + esc(t.businessValue) + "</div>" : "") +
            (cbTotal > 0
              ? '<div class="progress-track"><div class="progress-fill" style="width:' + cbPct + '%;background:var(--primary);"></div></div>'
              : "") +
            checklistHtml +
            "</div>"
          );
        })
        .join("");
    }

    const doneFiltered = DATA.backlog.doneTasks.filter(function (t) {
      return !q || String(t).toLowerCase().includes(q);
    });
    const doneEl = document.getElementById("doneBacklogList");
    doneEl.innerHTML =
      doneFiltered.length === 0
        ? '<div class="subcard text-xs muted">Выполненные задачи пока не зафиксированы.</div>'
        : doneFiltered
            .map(function (t) {
              return (
                '<div class="subcard row text-xs muted">' +
                '<span class="dot dot-ok"></span>' +
                "<span>" + esc(t) + "</span>" +
                "</div>"
              );
            })
            .join("");
  }

  function renderGitAndLocal() {
    document.getElementById("gitBranchTitle").textContent = DATA.git.isRepo
      ? "Git Graph · " + DATA.git.branch
      : "Git не инициализирован";
    document.getElementById("gitSummarySub").textContent = DATA.git.isRepo
      ? "Коммитов: " + DATA.git.totalCommits + " · Незакоммиченных: " + DATA.git.uncommittedCount
      : "Рекомендуется инициализировать Git для чекпоинтов и откатов.";

    const treeBadge = document.getElementById("gitTreeBadge");
    if (!DATA.git.isRepo) {
      treeBadge.className = "tag tag-warning";
      treeBadge.textContent = "Нет Git";
    } else if (DATA.git.uncommittedCount === 0) {
      treeBadge.className = "tag tag-success";
      treeBadge.textContent = "Чистое дерево";
    } else {
      treeBadge.className = "tag tag-warning";
      treeBadge.textContent = "Незакоммичено: " + DATA.git.uncommittedCount;
    }

    const tl = document.getElementById("gitTimeline");
    const commits = DATA.git.recentCommits || [];
    if (commits.length === 0) {
      tl.innerHTML = '<div class="subcard text-xs muted">История коммитов отсутствует.</div>';
    } else {
      tl.innerHTML = commits
        .map(function (c, idx) {
          return (
            '<div style="display:flex;gap:9px;align-items:stretch;">' +
            '<div style="display:flex;flex-direction:column;align-items:center;width:12px;">' +
            '<span class="timeline-dot" style="background:' + (idx === 0 ? "var(--primary)" : "var(--muted-foreground)") + ';"></span>' +
            (idx < commits.length - 1 ? '<span class="timeline-line"></span>' : "") +
            "</div>" +
            '<div style="padding-bottom:9px;flex:1;min-width:0;">' +
            '<div class="row text-xs">' +
            '<span class="mono text-link" style="font-weight:600;">' + esc(c.hash) + "</span>" +
            '<span class="mono muted">' + esc(c.date) + "</span>" +
            '<span class="tag mono">' + esc(c.author) + "</span>" +
            "</div>" +
            '<div class="text-xs" style="margin-top:2px;word-break:break-word;">' + esc(c.message || c.msg) + "</div>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    document.getElementById("statClasses").textContent = String(DATA.structure.classesCount || 0);
    document.getElementById("statNamespaces").textContent = String((DATA.structure.namespaces || []).length);
    document.getElementById("statUrlrewrite").textContent = String(DATA.structure.urlrewriteRules || 0);
    document.getElementById("statInitHooks").textContent = String(DATA.structure.initEventsCount || 0);

    document.getElementById("nsBadges").innerHTML =
      (DATA.structure.namespaces || []).length > 0
        ? DATA.structure.namespaces.map(function (n) { return '<span class="tag tag-strong mono">' + esc(n) + "</span>"; }).join("")
        : '<span class="text-xs muted">Не обнаружены</span>';

    document.getElementById("tplList").innerHTML =
      (DATA.structure.templates || []).length > 0
        ? DATA.structure.templates
            .map(function (t) {
              return (
                '<div class="subcard row-between text-xs">' +
                '<span class="mono">' + esc(t.name) + "</span>" +
                '<span class="muted">' + esc(t.componentOverrides) + " переопред.</span>" +
                "</div>"
              );
            })
            .join("")
        : '<div class="text-xs muted">Шаблоны /local/templates/ не найдены</div>';

    document.getElementById("ajaxBadges").innerHTML =
      (DATA.structure.ajaxEndpoints || []).length > 0
        ? DATA.structure.ajaxEndpoints.map(function (a) { return '<span class="tag mono">' + esc(a) + "</span>"; }).join("")
        : '<span class="text-xs muted">Не обнаружены</span>';

    const qaBox = document.getElementById("qaFindingsBox");
    if (DATA.qaPreflight) {
      const items = []
        .concat((DATA.qaPreflight.critical || []).map(function (x) { return Object.assign({ level: "CRITICAL" }, x); }))
        .concat((DATA.qaPreflight.high || []).map(function (x) { return Object.assign({ level: "HIGH" }, x); }))
        .concat((DATA.qaPreflight.medium || []).slice(0, 5).map(function (x) { return Object.assign({ level: "MEDIUM" }, x); }));
      if (items.length === 0) {
        qaBox.innerHTML = '<div class="subcard row text-xs"><span class="dot dot-ok"></span><span>QA Preflight: замечаний уровня CRITICAL/HIGH/MEDIUM не найдено.</span></div>';
      } else {
        qaBox.innerHTML = items
          .map(function (f) {
            const cls = f.level === "CRITICAL" ? "tag-error" : f.level === "HIGH" ? "tag-warning" : "";
            return (
              '<div class="subcard col" style="gap:4px;">' +
              '<div class="row">' +
              '<span class="tag ' + cls + '">' + esc(f.level) + " · " + esc(f.code) + "</span>" +
              '<span class="mono text-xs text-link">' + esc(f.file) + ":" + esc(f.line) + "</span>" +
              "</div>" +
              '<div class="text-xs muted">' + esc(f.message) + "</div>" +
              "</div>"
            );
          })
          .join("");
      }
    } else {
      qaBox.innerHTML = '<div class="subcard text-xs muted">Установите antigravity-bitrix-qa для автоматического preflight-скана.</div>';
    }
  }

  function renderEcosystem() {
    document.getElementById("ecosystemGrid").innerHTML = DATA.ecosystem
      .map(function (p) {
        const dot = p.installed ? "dot-ok" : "dot-muted";
        return (
          '<div class="subcard col" style="gap:7px;">' +
          '<div class="row-between">' +
          '<div><div style="font-weight:600;">' + esc(p.title) + '</div><div class="mono text-xs muted">' + esc(p.name) + "</div></div>" +
          '<span class="tag tag-strong mono"><span class="dot ' + dot + '"></span>' + (p.installed ? "v" + esc(p.version) : "выкл") + "</span>" +
          "</div>" +
          '<div class="row text-xs muted">' +
          "<span>Скиллы: <strong>" + p.skills.length + "</strong></span><span>·</span>" +
          "<span>Агенты: <strong>" + p.agents.length + "</strong></span><span>·</span>" +
          "<span>Правила: <strong>~" + p.rulesTok + " ток.</strong></span>" +
          "</div>" +
          '<div class="row">' +
          p.skills.map(function (s) { return '<span class="tag mono">' + esc(s) + "</span>"; }).join("") +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    const cb = DATA.contextBudget;
    const pct = Math.min(100, Math.round(((cb.totalBaselineOverheadTokens || 0) / 10000) * 100));
    const cbStatusRu = cb.status === "needs_trim" ? "нужна чистка" : "в норме";
    document.getElementById("cbBadge").textContent = "~" + cb.totalBaselineOverheadTokens + " ток. · " + cbStatusRu;
    document.getElementById("cbBadge").className = "tag " + (cb.status === "needs_trim" ? "tag-warning" : "tag-success");
    document.getElementById("cbSummary").textContent =
      "Скиллов: " + cb.skillListingsCount + " · Правила: ~" + cb.alwaysOnRulesTokens + " ток. · Коллизий: " + (cb.duplicateSkillCollisions || []).length;
    document.getElementById("cbBar").style.width = pct + "%";
    document.getElementById("cbBar").style.background = cb.status === "needs_trim" ? "var(--warning)" : "var(--primary)";

    const collBox = document.getElementById("cbCollisions");
    if (cb.duplicateSkillCollisions && cb.duplicateSkillCollisions.length > 0) {
      collBox.innerHTML =
        '<div class="text-xs text-warning" style="font-weight:600;">Обнаружены коллизии скиллов:</div>' +
        '<div class="text-xs muted">' + cb.duplicateSkillCollisions.map(esc).join(" · ") + "</div>";
    } else {
      collBox.innerHTML = '<div class="row text-xs"><span class="dot dot-ok"></span><span>0 коллизий скиллов в активном окружении.</span></div>';
    }

    document.getElementById("modelsTimeBadge").textContent = DATA.modelsSnapshotTime;
    document.getElementById("modelsList").innerHTML = DATA.models
      .map(function (m) {
        const cls = m.status === "error" ? "tag-error" : m.status === "success" ? "tag-success" : m.status === "warning" ? "tag-warning" : "";
        const q = m.quota != null ? esc(m.quota) + "%" : "auto";
        return (
          '<div class="subcard row-between">' +
          '<div><div class="text-xs" style="font-weight:600;">' + esc(m.name) + '</div><div class="text-xs muted">' + esc(m.detail) + "</div></div>" +
          '<span class="tag ' + cls + ' mono">' + q + "</span>" +
          "</div>"
        );
      })
      .join("");

    document.getElementById("mcpBadges").innerHTML =
      DATA.mcps.length > 0
        ? DATA.mcps.map(function (m) { return '<span class="tag tag-strong mono">' + esc(m) + "</span>"; }).join("")
        : '<span class="text-xs muted">MCP-серверы не обнаружены</span>';

    const clPanel = document.getElementById("changelogPanel");
    const clList = document.getElementById("changelogList");
    const clCount = document.getElementById("changelogCountBadge");
    if (clPanel && clList) {
      const rels = (DATA.changelog && Array.isArray(DATA.changelog.releases)) ? DATA.changelog.releases : [];
      if (rels.length === 0) {
        clPanel.classList.add("hidden");
      } else {
        clPanel.classList.remove("hidden");
        if (clCount) clCount.textContent = rels.length + " верс.";
        clList.innerHTML = rels
          .map(function (r, idx) {
            const itemsHtml =
              '<ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;">' +
              (r.items || [])
                .map(function (it) { return '<li class="text-xs">' + esc(it) + "</li>"; })
                .join("") +
              "</ul>";
            if (idx === 0) {
              return (
                '<div class="subcard col" style="gap:6px;">' +
                '<div class="row-between">' +
                '<div class="row"><span class="tag tag-success mono"><span class="dot dot-ok"></span>' + esc(r.version) + "</span>" +
                (r.section ? '<span class="text-xs" style="font-weight:600;">' + esc(r.section) + "</span>" : "") + "</div>" +
                '<span class="text-xs mono muted">' + esc(r.date || "") + "</span>" +
                "</div>" +
                itemsHtml +
                "</div>"
              );
            }
            return (
              "<details>" +
              "<summary>" +
              '<span class="row"><span class="tag mono">' + esc(r.version) + "</span>" +
              '<span>' + esc(r.section || ("Изменения (" + (r.items || []).length + ")")) + "</span></span>" +
              '<span class="row"><span class="mono muted">' + esc(r.date || "") + '</span><span class="text-link lbl-open">Показать</span><span class="text-link lbl-close">Скрыть</span></span>' +
              "</summary>" +
              '<div class="details-body">' + itemsHtml + "</div>" +
              "</details>"
            );
          })
          .join("");
      }
    }
  }

  function renderLearnedSkills() {
    const ls = DATA.learnedSkills || { count: 0, readyCount: 0, blockedCount: 0, excludedCount: 0, skills: [], upstreamRepo: "cash235/antigravity-bitrix-ecosystem" };
    const overview = document.getElementById("skillsOverviewBar");
    if (overview) {
      overview.innerHTML =
        '<span class="tag tag-strong mono">Всего навыков: ' + esc(ls.count) + "</span>" +
        '<span class="tag tag-success mono"><span class="dot dot-ok"></span>Готово к PR: ' + esc(ls.readyCount) + "</span>" +
        '<span class="tag ' + (ls.blockedCount > 0 ? "tag-error" : "") + ' mono"><span class="dot ' + (ls.blockedCount > 0 ? "dot-err" : "dot-ok") + '"></span>Заблокировано Sanitizer: ' + esc(ls.blockedCount) + "</span>" +
        '<span class="tag mono"><span class="dot dot-muted"></span>Исключено: ' + esc(ls.excludedCount) + "</span>" +
        '<span class="tag mono">Репозиторий: ' + esc(ls.upstreamRepo) + "</span>";
    }

    const submitBtn = document.getElementById("submitSkillsPrBtn");
    if (submitBtn) {
      const canSubmit = ls.readyCount > 0 && ls.blockedCount === 0;
      submitBtn.disabled = !canSubmit;
      submitBtn.style.opacity = canSubmit ? "1" : "0.5";
      submitBtn.title = canSubmit
        ? "Создать Pull Request с обезличенными навыками в " + ls.upstreamRepo
        : (ls.blockedCount > 0
            ? "Отправка заблокирована: сначала обезличьте или исключите навыки с предупреждениями Sanitizer"
            : "Добавьте хотя бы один проверенный навык");
    }

    const listEl = document.getElementById("learnedSkillsList");
    if (!listEl) return;
    const skills = Array.isArray(ls.skills) ? ls.skills : [];
    if (skills.length === 0) {
      listEl.innerHTML =
        '<div class="subcard col" style="gap:5px;">' +
        '<strong class="text-xs">В папке .agents/learned-skills/ пока нет накопленных навыков.</strong>' +
        '<div class="text-xs muted">Когда в ходе работы над проектом 1С-Битрикс вы находите полезный паттерн (фикс PHP 8.4, миграция БД, оптимизация D7, SEO-приём) — сохраните его через форму выше или через агента. Перед отправкой на GitHub каждый навык проходит жёсткую проверку PII &amp; Secret Sanitizer.</div>' +
        "</div>";
      return;
    }

    listEl.innerHTML = skills
      .map(function (s) {
        const isBlocked = Boolean(s.blocked);
        const isExcluded = Boolean(s.excluded);
        const verdictTag = isExcluded
          ? '<span class="tag"><span class="dot dot-muted"></span>Исключён из PR</span>'
          : isBlocked
          ? '<span class="tag tag-error"><span class="dot dot-err"></span>Sanitizer: BLOCK (' + esc(s.findingsCount) + ")</span>"
          : '<span class="tag tag-success"><span class="dot dot-ok"></span>Sanitizer: PASS</span>';

        const findingsHtml =
          isBlocked && Array.isArray(s.findings) && s.findings.length > 0
            ? '<div class="panel col" style="gap:4px;border-color:var(--error);">' +
              '<div class="text-xs text-error" style="font-weight:600;">Блокирующие находки PII / секретов / доменов:</div>' +
              s.findings
                .map(function (f) {
                  return (
                    '<div class="text-xs mono">• стр. ' + esc(f.line) + " [" + esc(f.type) + "] " +
                    esc(f.reason) + " (" + esc(f.snippet) + ")</div>"
                  );
                })
                .join("") +
              "</div>"
            : "";

        return (
          '<article class="subcard col" style="gap:7px;' + (isExcluded ? "opacity:0.65;" : "") + '">' +
          '<div class="row-between">' +
          '<div class="row" style="gap:6px;">' +
          '<label class="row text-xs" style="cursor:pointer;gap:5px;">' +
          '<input type="checkbox" class="skill-include-cb" data-skill-file="' + esc(s.filename) + '"' + (!isExcluded ? " checked" : "") + " />" +
          "<strong>" + esc(s.title) + "</strong>" +
          "</label>" +
          '<span class="tag mono">' + esc(s.targetPlugin) + "</span>" +
          '<span class="tag">' + esc(s.category) + "</span>" +
          "</div>" +
          '<div class="row">' +
          verdictTag +
          '<span class="text-xs mono muted">' + esc(s.createdAt || "") + "</span>" +
          "</div>" +
          "</div>" +
          '<div class="text-xs"><span class="muted">Расшифровка:</span> ' + esc(s.summary) + "</div>" +
          findingsHtml +
          "<details>" +
          "<summary>" +
          "<span>Просмотр обезличенного содержимого (" + esc(s.filename) + ")</span>" +
          '<span class="text-link lbl-open">Показать</span>' +
          '<span class="text-link lbl-close">Скрыть</span>' +
          "</summary>" +
          '<div class="details-body"><pre class="mono">' + esc(s.sanitizedBody || s.body || "") + "</pre></div>" +
          "</details>" +
          '<div class="row" style="justify-content:flex-end;">' +
          (isBlocked
            ? '<button type="button" class="btn btn-primary" data-skill-sanitize="' + esc(s.filename) + '">Обезличить и сохранить</button>'
            : "") +
          '<button type="button" class="btn" data-skill-delete="' + esc(s.filename) + '">Удалить</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function switchTab(tabName) {
    state.tab = tabName;
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.setAttribute("aria-selected", btn.dataset.tab === tabName ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      panel.classList.toggle("hidden", panel.id !== "tab-" + tabName);
    });
  }

  // Event delegation — bulletproof across re-renders
  document.addEventListener("click", function (ev) {
    const tabBtn = ev.target.closest(".tab-btn");
    if (tabBtn && tabBtn.dataset.tab) {
      switchTab(tabBtn.dataset.tab);
      return;
    }

    const pillBtn = ev.target.closest("#trackFilters .pill-btn");
    if (pillBtn && pillBtn.dataset.track) {
      state.track = pillBtn.dataset.track;
      renderTrackFilters();
      renderInitiatives();
      return;
    }

    const blQ = ev.target.closest("[data-bl-quadrant]");
    if (blQ && blQ.dataset.blQuadrant) {
      state.backlogQuadrant = blQ.dataset.blQuadrant;
      renderBacklog();
      return;
    }

    const blS = ev.target.closest("[data-bl-size]");
    if (blS && blS.dataset.blSize) {
      state.backlogSize = blS.dataset.blSize;
      renderBacklog();
      return;
    }

    const cmsF = ev.target.closest("[data-cms-filter]");
    if (cmsF && cmsF.dataset.cmsFilter) {
      state.cmsFilter = cmsF.dataset.cmsFilter;
      renderCmsChecklist();
      return;
    }

    const cmsSummary = ev.target.closest("details[data-cms-details] > summary");
    if (cmsSummary && cmsSummary.parentElement) {
      const det = cmsSummary.parentElement;
      const detId = det.dataset.cmsDetails;
      if (detId) {
        if (det.open) openCmsBlocks.delete(detId);
        else openCmsBlocks.add(detId);
      }
      return;
    }

    if (ev.target.closest("#saveCmsChecklistBtn")) {
      if (vscode) {
        vscode.postMessage({
          type: "saveCmsChecklist",
          archetype: draftCmsChecklist.archetype,
          archetypeLabel: CMS_ARCHETYPE_LABELS[draftCmsChecklist.archetype] || draftCmsChecklist.archetype,
          blocks: draftCmsChecklist.blocks,
        });
      } else {
        const jsonStr = JSON.stringify(
          { schemaVersion: "1.0", archetype: draftCmsChecklist.archetype, blocks: draftCmsChecklist.blocks },
          null,
          2
        );
        copyText("Сохрани чеклист в docs/memory/cms-checklist.json:\\n" + jsonStr, "JSON чеклиста 1С-Битрикс скопирован");
      }
      return;
    }

    if (ev.target.closest("#openCmsChecklistBtn")) {
      if (vscode) vscode.postMessage({ type: "openFile", path: "docs/memory/cms-checklist.json" });
      return;
    }

    const copyBtn = ev.target.closest(".copy-trigger");
    if (copyBtn && copyBtn.dataset.copyKey) {
      const entry = promptRegistry.get(copyBtn.dataset.copyKey);
      if (entry) copyText(entry.text, entry.label);
      return;
    }

    const permPresetBtn = ev.target.closest("[data-perm-preset]");
    if (permPresetBtn && permPresetBtn.dataset.permPreset) {
      const pName = permPresetBtn.dataset.permPreset;
      if (PERM_PRESETS[pName]) {
        draftPermissions.profile = pName;
        draftPermissions.rules = JSON.parse(JSON.stringify(PERM_PRESETS[pName]));
        renderPermissionsMatrix();
        showToast("Выбран пресет «" + pName + "» — нажмите «Сохранить»");
      }
      return;
    }

    if (ev.target.closest("#savePermBtn")) {
      if (vscode) {
        vscode.postMessage({ type: "savePermissions", profile: draftPermissions.profile, rules: draftPermissions.rules });
      } else {
        const jsonStr = JSON.stringify({ schemaVersion: "1.0", profile: draftPermissions.profile, rules: draftPermissions.rules }, null, 2);
        copyText("Сохрани этот конфиг в .agents/permissions.json:\\n" + jsonStr, "Конфиг .agents/permissions.json скопирован");
      }
      return;
    }

    if (ev.target.closest("#openPermJsonBtn")) {
      if (vscode) vscode.postMessage({ type: "openFile", path: ".agents/permissions.json" });
      return;
    }

    if (ev.target.closest("#openChangelogBtn")) {
      if (vscode) vscode.postMessage({ type: "openFile", path: "CHANGELOG.md" });
      return;
    }

    if (ev.target.closest("#addLearnedSkillBtn")) {
      const title = ((document.getElementById("skillTitleInput") || {}).value || "").trim();
      const summary = ((document.getElementById("skillSummaryInput") || {}).value || "").trim();
      const targetPlugin = (document.getElementById("skillPluginSelect") || {}).value || "antigravity-bitrix-core";
      const category = (document.getElementById("skillCategorySelect") || {}).value || "d7-backend";
      const body = ((document.getElementById("skillBodyInput") || {}).value || "").trim();
      const autoRedact = Boolean((document.getElementById("skillAutoRedactCb") || {}).checked);
      if (!title || !body) {
        showToast("Заполните название и содержимое навыка");
        return;
      }
      if (vscode) {
        vscode.postMessage({
          type: "addLearnedSkill",
          title: title,
          summary: summary || title,
          targetPlugin: targetPlugin,
          category: category,
          body: body,
          autoRedact: autoRedact,
        });
      } else {
        copyText(
          'Сохрани навык в .agents/learned-skills/ через bitrix-skill-collector.mjs --add --title "' + title + '" --summary "' + (summary || title) + '" --plugin ' + targetPlugin + (autoRedact ? " --redact" : ""),
          "Команда сохранения навыка скопирована"
        );
      }
      return;
    }

    const sanBtn = ev.target.closest("[data-skill-sanitize]");
    if (sanBtn && sanBtn.dataset.skillSanitize) {
      if (vscode) {
        vscode.postMessage({ type: "sanitizeLearnedSkill", filename: sanBtn.dataset.skillSanitize });
      } else {
        copyText("node antigravity-bitrix-core/scripts/bitrix-skill-collector.mjs . --sanitize " + sanBtn.dataset.skillSanitize, "Команда обезличивания скопирована");
      }
      return;
    }

    const delBtn = ev.target.closest("[data-skill-delete]");
    if (delBtn && delBtn.dataset.skillDelete) {
      if (vscode) {
        vscode.postMessage({ type: "deleteLearnedSkill", filename: delBtn.dataset.skillDelete });
      } else {
        showToast("Удаление файла доступно в режиме IDE Webview");
      }
      return;
    }

    if (ev.target.closest("#submitSkillsPrBtn")) {
      const ls = DATA.learnedSkills || { skills: [] };
      const active = (ls.skills || []).filter(function (s) { return !s.excluded; });
      if (active.length === 0) {
        showToast("Не выбрано ни одного навыка");
        return;
      }
      if (active.some(function (s) { return s.blocked; })) {
        showToast("Заблокировано Sanitizer: сначала обезличьте или исключите проблемные навыки");
        return;
      }
      const files = active.map(function (s) { return s.filename; });
      if (vscode) {
        vscode.postMessage({ type: "submitSkillsPr", files: files });
      } else {
        copyText(
          "Выполни Fail-Closed сборку PR для обезличенных навыков (" + files.join(", ") + ") в cash235/antigravity-bitrix-ecosystem через bitrix-skill-collector.mjs --prepare-pr.",
          "Промпт отправки PR скопирован"
        );
      }
      return;
    }

    if (ev.target.closest("#copySkillsBundleBtn")) {
      const ls = DATA.learnedSkills || { skills: [] };
      const active = (ls.skills || []).filter(function (s) { return !s.excluded; });
      if (active.length === 0) {
        showToast("Нет выбранных навыков для копирования");
        return;
      }
      if (active.some(function (s) { return s.blocked; })) {
        showToast("Заблокировано Sanitizer: сначала обезличьте навыки со статусом BLOCK");
        return;
      }
      const text = active
        .map(function (s) {
          return "### " + s.title + " (" + s.targetPlugin + ")\\n> " + s.summary + "\\n\\n" + (s.sanitizedBody || s.body || "");
        })
        .join("\\n\\n---\\n\\n");
      copyText(text, "Обезличенный бандл навыков (" + active.length + ") скопирован");
      return;
    }

    if (ev.target.closest("#saveVelBtn")) {
      const h = Number((document.getElementById("velHoursInput") || {}).value || 2);
      const d = Number((document.getElementById("velDaysInput") || {}).value || 5);
      if (vscode) {
        vscode.postMessage({ type: "saveVelocity", hoursPerDay: h, daysPerWeek: d });
      } else {
        copyText("Обнови docs/memory/velocity.json: targetHoursPerDay=" + h + ", activeDaysPerWeek=" + d, "Промпт обновления ритма скопирован");
      }
      return;
    }

    const ideBtn = ev.target.closest("[data-ide-action]");
    if (ideBtn && vscode) {
      vscode.postMessage({ type: ideBtn.dataset.ideAction });
      return;
    }

    if (ev.target.id === "closeCopyModal" || ev.target.id === "copyModal") {
      const modal = document.getElementById("copyModal");
      if (modal) modal.classList.add("hidden");
    }
  });

  document.addEventListener("change", function (ev) {
    const sel = ev.target.closest(".perm-axis-select");
    if (sel && sel.dataset.permAxis) {
      const axis = sel.dataset.permAxis;
      if (!draftPermissions.rules[axis]) draftPermissions.rules[axis] = { level: sel.value, note: "" };
      draftPermissions.rules[axis].level = sel.value;
      draftPermissions.profile = "custom";
      renderPermissionsMatrix();
      return;
    }
    const cmsSel = ev.target.closest(".cms-item-select");
    if (cmsSel && cmsSel.dataset.cmsBlock && cmsSel.dataset.cmsItem) {
      const bId = cmsSel.dataset.cmsBlock;
      const iId = cmsSel.dataset.cmsItem;
      openCmsBlocks.add(bId);
      (draftCmsChecklist.blocks || []).forEach(function (b) {
        if (b.id !== bId) return;
        (b.items || []).forEach(function (it) {
          if (it.id === iId) it.status = cmsSel.value;
        });
      });
      renderCmsChecklist();
      showToast("Статус обновлён — нажмите «Сохранить чеклист»");
      return;
    }
    if (ev.target && ev.target.id === "cmsArchetypeSelect") {
      const nextArch = ev.target.value;
      draftCmsChecklist.archetype = nextArch;
      draftCmsChecklist.archetypeLabel = CMS_ARCHETYPE_LABELS[nextArch] || nextArch;
      const nonEcom = nextArch === "services" || nextArch === "corporate" || nextArch === "minimal";
      (draftCmsChecklist.blocks || []).forEach(function (b) {
        if (!CMS_ECOM_BLOCKS[b.id]) return;
        (b.items || []).forEach(function (it) {
          if (nonEcom) it.status = "not_applicable";
          else if (it.status === "not_applicable") it.status = "needs_setup";
        });
      });
      renderCmsChecklist();
      showToast("Профиль чеклиста переключён на «" + draftCmsChecklist.archetypeLabel + "»");
      return;
    }
    const skillCb = ev.target.closest(".skill-include-cb");
    if (skillCb && skillCb.dataset.skillFile) {
      const fname = skillCb.dataset.skillFile;
      const excluded = !skillCb.checked;
      if (vscode) {
        vscode.postMessage({ type: "toggleLearnedSkill", filename: fname, excluded: excluded });
      } else if (DATA.learnedSkills && Array.isArray(DATA.learnedSkills.skills)) {
        DATA.learnedSkills.skills.forEach(function (s) {
          if (s.filename === fname) s.excluded = excluded;
        });
        DATA.learnedSkills.excludedCount = DATA.learnedSkills.skills.filter(function (s) { return s.excluded; }).length;
        DATA.learnedSkills.blockedCount = DATA.learnedSkills.skills.filter(function (s) { return !s.excluded && s.blocked; }).length;
        DATA.learnedSkills.readyCount = DATA.learnedSkills.skills.filter(function (s) { return !s.excluded && !s.blocked; }).length;
        renderLearnedSkills();
      }
    }
  });

  window.addEventListener("message", function (ev) {
    if (ev.data && ev.data.type === "switchTab" && ev.data.tab) {
      switchTab(ev.data.tab);
    }
  });

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", function (e) {
      state.sort = e.target.value;
      renderInitiatives();
    });
  }

  const kSearch = document.getElementById("knowledgeSearch");
  if (kSearch) {
    kSearch.addEventListener("input", function (e) {
      state.knowledgeQuery = e.target.value;
      renderKnowledge();
    });
  }

  const bSearch = document.getElementById("backlogSearch");
  if (bSearch) {
    bSearch.addEventListener("input", function (e) {
      state.backlogQuery = e.target.value;
      renderBacklog();
    });
  }

  const bSort = document.getElementById("backlogSortSelect");
  if (bSort) {
    bSort.addEventListener("change", function (e) {
      state.backlogSort = e.target.value;
      renderBacklog();
    });
  }

  // Initial render
  try {
    renderHeader();
    renderSetupPipeline();
    renderBlindSpots();
    renderTrackFilters();
    renderInitiatives();
    renderKnowledge();
    renderCmsChecklist();
    renderVelocityAndSprints();
    renderBacklog();
    renderGitAndLocal();
    renderEcosystem();
    renderPermissionsMatrix();
    renderLearnedSkills();
    switchTab("orchestrator");
  } catch (err) {
    showFatal(err && err.message ? err.message : String(err));
  }
})();
`;

const initBtnHtml = viewModel.setupPipeline.isProjectInitialized
  ? `<button type="button" class="btn" data-ide-action="initProject" title="Проект уже инициализирован — нажмите, чтобы обновить профиль плагинов">
          <span class="dot dot-ok"></span>
          Настроено · Профиль
        </button>`
  : `<button type="button" class="btn" data-ide-action="initProject">
          <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10" stroke-linecap="round"/></svg>
          Инициализировать
        </button>`;

const ideActionBar = isWebview
  ? `
    <div class="row-between panel" style="padding:8px 12px;">
      <div class="row">
        <span class="tag tag-strong">1C-Bitrix · Workspace</span>
        <span class="text-xs muted mono" id="workspacePathBar">${viewModel.rootDir.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>
      </div>
      <div class="row">
        <button type="button" class="btn btn-primary" data-ide-action="refresh">
          <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 8a5.5 5.5 0 1 1-1.4-3.7M13.5 2.5v2.8h-2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Обновить скан
        </button>
        ${initBtnHtml}
        <button type="button" class="btn" data-ide-action="runQaPreflight">
          <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4l5-2z" stroke-linejoin="round"/></svg>
          QA Preflight
        </button>
      </div>
    </div>`
  : "";

const headSection = isWebview
  ? `<style>${webviewCss}\n${sharedUiCss}</style>`
  : `<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    ${sharedUiCss}
  </style>`;

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>1C-Bitrix Command Center v2.1</title>
  ${headSection}
</head>
<body class="bg-[var(--background)] text-[var(--foreground)] antialiased min-h-screen p-0 m-0">
  <div class="container">
    <div id="runtimeError" class="panel hidden text-error text-xs" style="border-color:var(--error);"></div>
    ${ideActionBar}

    <!-- Header -->
    <header class="panel col">
      <div class="row-between" style="align-items:flex-start;">
        <div class="col" style="gap:4px;flex:1;min-width:260px;">
          <div class="row">
            <span class="tag tag-strong">Central Orchestrator v2.5</span>
            <span class="tag">5-Plugin Ecosystem</span>
            <span class="text-xs muted mono" id="scanTimeEl">Скан: —</span>
          </div>
          <h1 class="title-lg">Командный центр 1С-Битрикс · <span class="text-link" id="projectNameEl">—</span></h1>
          <div class="text-xs muted">
            5 треков (Backend, Frontend, SEO &amp; GEO, Маркетинг, QA) · ICE-приоритизация · маршрутизация моделей · контроль контекста.
          </div>
        </div>

        <div class="grid-4" style="min-width:320px;flex:1;max-width:540px;">
          <div class="subcard">
            <div class="text-xs muted">Готовность</div>
            <div class="kpi-val" id="kpiReadiness">0/100</div>
            <div class="text-xs muted" id="kpiMemoryMeta">—</div>
          </div>
          <div class="subcard">
            <div class="text-xs muted">QA Preflight</div>
            <div class="kpi-val" id="kpiQa">—</div>
            <div class="text-xs muted" id="kpiQaMeta">—</div>
          </div>
          <div class="subcard">
            <div class="text-xs muted">Бэклог</div>
            <div class="kpi-val" id="kpiBacklog">0%</div>
            <div class="text-xs muted" id="kpiBacklogMeta">—</div>
          </div>
          <div class="subcard">
            <div class="text-xs muted">Контекст</div>
            <div class="kpi-val" id="kpiContext">—</div>
            <div class="text-xs muted" id="kpiContextMeta">—</div>
          </div>
        </div>
      </div>

      <nav class="tab-bar" role="tablist" aria-label="Разделы дашборда">
        <button type="button" class="tab-btn" role="tab" aria-selected="true" data-tab="orchestrator">Оркестратор</button>
        <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="knowledge">Знания</button>
        <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="backlog">Бэклог</button>
        <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="git">Git и /local/</button>
        <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="ecosystem">Плагины и Границы</button>
        <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="skills">Навыки и PR</button>
      </nav>
    </header>

    <!-- TAB 1: ORCHESTRATOR -->
    <section id="tab-orchestrator" class="tab-panel col">
      <div id="setupPipelineBox" class="panel col hidden"></div>

      <div class="panel col">
        <div class="row-between">
          <h2 class="title-md">Радар «Слепых пятен»</h2>
          <span class="text-xs muted">Детерминированные сигналы автосканеров</span>
        </div>
        <div id="blindSpotsGrid" class="grid-3"></div>
      </div>

      <div class="panel col">
        <div class="row-between">
          <div id="trackFilters" class="row"></div>
          <div class="row text-xs">
            <span class="muted">Сортировка:</span>
            <select id="sortSelect" class="select">
              <option value="ice">ICE (убыв.)</option>
              <option value="quadrant">Матрица Q1 → Q4</option>
              <option value="effort">Быстрые победы (Effort ↑)</option>
              <option value="impact">Макс. польза (Impact ↓)</option>
            </select>
          </div>
        </div>
        <div id="initiativesList" class="col"></div>
      </div>
    </section>

    <!-- TAB 2: KNOWLEDGE & CMS READINESS -->
    <section id="tab-knowledge" class="tab-panel hidden col">
      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">10-блочный Мастер-Чеклист готовности модулей 1С-Битрикс</h2>
            <div class="text-xs muted">Профильная проверка ядра, каталога, магазина, почты, безопасности, SEO/GEO и Read-Only Browser QA.</div>
          </div>
          <span id="cmsChecklistBadge" class="tag mono">—</span>
        </div>
        <div class="row-between">
          <div class="row text-xs">
            <span class="muted">Архетип проекта:</span>
            <select id="cmsArchetypeSelect" class="select">
              <option value="store">Интернет-магазин (E-commerce)</option>
              <option value="crm_b24">ИМ + Битрикс24 Коробка (CRM)</option>
              <option value="services">Сайт услуг (без онлайн-оплаты)</option>
              <option value="corporate">Корпоративный сайт</option>
              <option value="minimal">Минимальный (Базовое ядро)</option>
            </select>
          </div>
          <div class="row">
            <button type="button" id="openCmsChecklistBtn" class="btn">Открыть JSON</button>
            <button type="button" id="saveCmsChecklistBtn" class="btn btn-primary">Сохранить чеклист</button>
          </div>
        </div>
        <div class="col" style="gap:4px;">
          <div class="row-between text-xs">
            <span class="muted">Готовность модулей CMS</span>
            <strong class="mono" id="cmsProgressLabel">—</strong>
          </div>
          <div class="progress-track">
            <div id="cmsProgressBar" class="progress-fill" style="width:0%;background:var(--primary);"></div>
          </div>
        </div>
        <div id="cmsFilterBar" class="row"></div>
        <div id="cmsChecklistBlocks" class="col" style="gap:6px;"></div>
      </div>

      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Матрица знаний и интеграций</h2>
            <div class="text-xs muted">Персонализация правил в docs/memory/ против базовых знаний платформы.</div>
          </div>
          <input id="knowledgeSearch" type="search" class="input" placeholder="Фильтр по домену..." />
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>Домен</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Факты в коде и памяти</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody id="knowledgeBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: BACKLOG -->
    <section id="tab-backlog" class="tab-panel hidden col">
      <div id="northStarBox" class="panel col hidden" style="gap:4px;">
        <div class="title-md">Конечная цель проекта (North Star)</div>
        <div id="northStarText" class="text-xs"></div>
      </div>

      <div id="sprintsPanel" class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Спринты, ритм и дедлайны</h2>
            <div id="velSummaryText" class="text-xs muted">—</div>
          </div>
          <div class="row text-xs">
            <label class="muted">ч/день <input id="velHoursInput" type="number" step="0.5" min="0.5" max="16" class="input mono" style="width:58px;" /></label>
            <label class="muted">дн/нед <input id="velDaysInput" type="number" step="1" min="1" max="7" class="input mono" style="width:48px;" /></label>
            <button type="button" id="saveVelBtn" class="btn">Сохранить ритм</button>
            <span id="velSourceBadge" class="tag mono">—</span>
          </div>
        </div>
        <div id="sprintsOverviewBar" class="row text-xs"></div>
        <div id="sprintsGrid" class="grid-2"></div>
      </div>

      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Бэклог · 2-шкальная матрица (Q1–Q4 × S/M/L)</h2>
            <div class="text-xs muted">Выполнен чеклист приёмки + зафиксирован факт времени = закрыта задача.</div>
          </div>
          <div class="row">
            <select id="backlogSortSelect" class="select">
              <option value="quadrant">Матрица Q1 → Q4</option>
              <option value="size">Сложность S → XL</option>
              <option value="progress">Прогресс чеклиста</option>
            </select>
            <input id="backlogSearch" type="search" class="input" placeholder="Фильтр по задачам..." />
          </div>
        </div>

        <div class="col" style="gap:6px;">
          <div class="row" id="backlogQuadrantFilters"></div>
          <div class="row" id="backlogSizeFilters"></div>
        </div>

        <div class="col" style="gap:4px;">
          <div class="row-between text-xs">
            <span class="muted">Общий прогресс и время</span>
            <strong class="mono" id="backlogProgressLabel">0 / 0 (0%)</strong>
          </div>
          <div class="progress-track">
            <div id="backlogProgressBar" class="progress-fill" style="width:0%;background:var(--primary);"></div>
          </div>
        </div>

        <div class="col">
          <div class="title-md">Открытые задачи</div>
          <div id="openBacklogList" class="col"></div>
        </div>

        <div class="col divider">
          <div class="title-md">Недавно закрытые задачи</div>
          <div id="doneBacklogList" class="grid-2"></div>
        </div>
      </div>
    </section>

    <!-- TAB 4: GIT & LOCAL -->
    <section id="tab-git" class="tab-panel hidden col">
      <div class="grid-2">
        <div class="panel col">
          <div class="row-between">
            <div>
              <h2 class="title-md" id="gitBranchTitle">Git Graph</h2>
              <div class="text-xs muted" id="gitSummarySub">—</div>
            </div>
            <span id="gitTreeBadge" class="tag">—</span>
          </div>
          <div id="gitTimeline" class="col" style="gap:0;"></div>
        </div>

        <div class="panel col">
          <div>
            <h2 class="title-md">Структура D7 (/local/)</h2>
            <div class="text-xs muted">Изолированный кастомный код (ядро /bitrix/ не модифицируется).</div>
          </div>
          <div class="grid-4">
            <div class="subcard"><div class="text-xs muted">Классы PHP</div><div class="kpi-val" id="statClasses">0</div></div>
            <div class="subcard"><div class="text-xs muted">Namespaces</div><div class="kpi-val" id="statNamespaces">0</div></div>
            <div class="subcard"><div class="text-xs muted">urlrewrite</div><div class="kpi-val" id="statUrlrewrite">0</div></div>
            <div class="subcard"><div class="text-xs muted">init хуки</div><div class="kpi-val" id="statInitHooks">0</div></div>
          </div>
          <div class="col" style="gap:5px;">
            <div class="text-xs muted" style="font-weight:600;">Namespaces</div>
            <div id="nsBadges" class="row"></div>
          </div>
          <div class="col" style="gap:5px;">
            <div class="text-xs muted" style="font-weight:600;">Шаблоны сайта</div>
            <div id="tplList" class="col" style="gap:5px;"></div>
          </div>
          <div class="col" style="gap:5px;">
            <div class="text-xs muted" style="font-weight:600;">Публичные AJAX (/local/ajax/)</div>
            <div id="ajaxBadges" class="row"></div>
          </div>
        </div>
      </div>

      <div class="panel col">
        <h2 class="title-md">Сводка QA Preflight (безопасность и статика)</h2>
        <div id="qaFindingsBox" class="col"></div>
      </div>
    </section>

    <!-- TAB 5: ECOSYSTEM & PERMISSIONS -->
    <section id="tab-ecosystem" class="tab-panel hidden col">
      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Визуальная настройка границ и разрешений (.agents/permissions.json)</h2>
            <div class="text-xs muted">Задайте допустимые границы выхода агента и субагентов: файлы вне проекта, интернет, терминал, SSH, БД и деплой.</div>
          </div>
          <span id="permProfileBadge" class="tag mono">—</span>
        </div>
        <div class="row-between">
          <div class="row">
            <span class="text-xs muted">Быстрый пресет:</span>
            <button type="button" class="filter-btn" data-perm-preset="safe_default" aria-pressed="false">Безопасный</button>
            <button type="button" class="filter-btn" data-perm-preset="local_dev" aria-pressed="false">Локальная разработка</button>
            <button type="button" class="filter-btn" data-perm-preset="staging_full" aria-pressed="false">Staging</button>
          </div>
          <div class="row">
            <button type="button" id="openPermJsonBtn" class="btn">Открыть JSON</button>
            <button type="button" id="savePermBtn" class="btn btn-primary">Сохранить в .agents/permissions.json</button>
          </div>
        </div>
        <div id="permissionsGrid" class="grid-3"></div>
      </div>

      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Экосистема 1С-Битрикс (5 плагинов)</h2>
            <div class="text-xs muted">core · seo-geo · qa · marketing · design — независимые модули без npm-зависимостей.</div>
          </div>
          <span class="tag tag-strong">Zero npm · Zero PII</span>
        </div>
        <div id="ecosystemGrid" class="grid-2"></div>
      </div>

      <div class="grid-2">
        <div class="panel col">
          <div class="row-between">
            <h3 class="title-md">Бюджет контекста</h3>
            <span id="cbBadge" class="tag">—</span>
          </div>
          <div class="text-xs muted" id="cbSummary">—</div>
          <div class="progress-track">
            <div id="cbBar" class="progress-fill" style="width:0%;"></div>
          </div>
          <div id="cbCollisions" class="subcard col" style="gap:4px;"></div>
          <div class="text-xs muted">
            <strong>Strategic Compact:</strong> вызывайте <code>/compact</code> на границах фаз (после аудита, реализации и QA).
          </div>
        </div>

        <div class="panel col">
          <div class="row-between">
            <h3 class="title-md">Маршрутизация моделей</h3>
            <span id="modelsTimeBadge" class="tag mono">—</span>
          </div>
          <div id="modelsList" class="col" style="gap:5px;"></div>
          <div class="col divider" style="gap:5px;">
            <div class="text-xs muted" style="font-weight:600;">Подключённые MCP-серверы</div>
            <div id="mcpBadges" class="row"></div>
          </div>
        </div>
      </div>

      <div id="changelogPanel" class="panel col hidden">
        <div class="row-between">
          <div>
            <h3 class="title-md">История версий (Changelog)</h3>
            <div class="text-xs muted">Реализованные возможности по версиям из CHANGELOG.md.</div>
          </div>
          <div class="row">
            <span id="changelogCountBadge" class="tag mono">—</span>
            <button type="button" id="openChangelogBtn" class="btn">Открыть CHANGELOG.md</button>
          </div>
        </div>
        <div id="changelogList" class="col" style="gap:6px;"></div>
      </div>
    </section>

    <!-- TAB 6: LEARNED SKILLS & GITHUB PR CENTER (PLUGIN-001) -->
    <section id="tab-skills" class="tab-panel hidden col">
      <div class="panel col">
        <div class="row-between">
          <div>
            <h2 class="title-md">Накопленные навыки и GitHub PR (.agents/learned-skills/)</h2>
            <div class="text-xs muted">Обезличенный сбор боевого опыта (PHP 8.4, миграции, D7, SEO/QA) с жёсткой защитой PII &amp; Secret Sanitizer.</div>
          </div>
          <div class="row">
            <button type="button" id="copySkillsBundleBtn" class="btn">Скопировать обезличенный бандл</button>
            <button type="button" id="submitSkillsPrBtn" class="btn btn-primary">Отправить в GitHub (PR)</button>
          </div>
        </div>
        <div id="skillsOverviewBar" class="row text-xs"></div>

        <details>
          <summary>
            <span>+ Добавить новый найденный навык в .agents/learned-skills/</span>
            <span class="text-link lbl-open">Открыть форму</span>
            <span class="text-link lbl-close">Скрыть</span>
          </summary>
          <div class="details-body">
            <div class="grid-2">
              <div class="col" style="gap:4px;">
                <label class="text-xs muted" for="skillTitleInput">Название навыка</label>
                <input id="skillTitleInput" type="text" class="input" placeholder="Напр.: Безопасная миграция свойств инфоблока под PHP 8.4" />
              </div>
              <div class="col" style="gap:4px;">
                <label class="text-xs muted" for="skillSummaryInput">Человеческая расшифровка (зачем нужен)</label>
                <input id="skillSummaryInput" type="text" class="input" placeholder="Коротко: какую проблему решает и когда применять" />
              </div>
            </div>
            <div class="grid-2">
              <div class="col" style="gap:4px;">
                <label class="text-xs muted" for="skillPluginSelect">Целевой плагин</label>
                <select id="skillPluginSelect" class="select">
                  <option value="antigravity-bitrix-core">antigravity-bitrix-core (D7 / Архитектура / Память)</option>
                  <option value="antigravity-bitrix-seo-geo">antigravity-bitrix-seo-geo (SEO / GEO / Аналитика)</option>
                  <option value="antigravity-bitrix-qa">antigravity-bitrix-qa (QA / Тесты / Безопасность)</option>
                  <option value="antigravity-bitrix-marketing">antigravity-bitrix-marketing (CRO / Маркетинг / UX)</option>
                  <option value="antigravity-bitrix-design">antigravity-bitrix-design (Дизайн / Motion / Visual Gate)</option>
                </select>
              </div>
              <div class="col" style="gap:4px;">
                <label class="text-xs muted" for="skillCategorySelect">Категория</label>
                <select id="skillCategorySelect" class="select">
                  <option value="d7-backend">D7 Backend</option>
                  <option value="php8">PHP 8.x</option>
                  <option value="migrations">Миграции БД / Инфоблоки</option>
                  <option value="ecommerce-crm">E-commerce / CRM / 1С</option>
                  <option value="seo-geo">SEO / GEO</option>
                  <option value="qa">QA / Производительность</option>
                  <option value="frontend">Frontend / Шаблоны</option>
                </select>
              </div>
            </div>
            <div class="col" style="gap:4px;">
              <label class="text-xs muted" for="skillBodyInput">Описание паттерна / рабочий пример кода (Markdown)</label>
              <textarea id="skillBodyInput" class="input mono" style="height:110px;padding:8px;resize:vertical;" placeholder="Опишите суть приёма, условия применения и чистый D7-пример без клиентских доменов и секретов..."></textarea>
            </div>
            <div class="row-between">
              <label class="row text-xs muted" style="cursor:pointer;gap:5px;">
                <input id="skillAutoRedactCb" type="checkbox" checked />
                Автоматически обезличить найденные домены, пути и секреты перед сохранением
              </label>
              <button type="button" id="addLearnedSkillBtn" class="btn btn-primary">Проверить и сохранить</button>
            </div>
          </div>
        </details>

        <div id="learnedSkillsList" class="col" style="gap:8px;"></div>
      </div>
    </section>
  </div>

  <div id="toast" class="toast hidden" role="status" aria-live="polite">Скопировано</div>

  <div id="copyModal" class="modal-backdrop hidden" role="dialog" aria-modal="true">
    <div class="modal-box">
      <div class="row-between">
        <strong id="copyModalTitle" class="text-xs">Скопируйте промпт (Ctrl+C)</strong>
        <button type="button" id="closeCopyModal" class="btn">Закрыть</button>
      </div>
      <textarea id="copyModalText" readonly class="mono"></textarea>
    </div>
  </div>

  <script id="dashboard-data" type="application/json">${safeJsonPayload}</script>
  <script>${clientScript}</script>
</body>
</html>
`;

// Fail-Closed JS syntax verification before emitting HTML
try {
  // eslint-disable-next-line no-new-func
  new Function(clientScript);
} catch (err) {
  console.error(`Internal dashboard script syntax error: ${err.message}`);
  process.exit(1);
}

if (outPath) {
  const absOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, html, "utf8");
  if (!stdoutMode) {
    console.log(JSON.stringify({ ok: true, mode, out: absOut, bytes: Buffer.byteLength(html, "utf8") }));
  }
}

if (stdoutMode) {
  process.stdout.write(html);
}
