"use strict";

const vscode = require("vscode");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const PLUGINS_ROOT = path.join(os.homedir(), ".gemini", "config", "plugins");
const CORE_SCRIPTS = path.join(PLUGINS_ROOT, "antigravity-bitrix-core", "scripts");
const QA_SCRIPT = path.join(PLUGINS_ROOT, "antigravity-bitrix-qa", "scripts", "bitrix-qa-preflight.mjs");

function getWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0].uri.fsPath;
}

function runNodeScript(scriptPath, scriptArgs, cwd) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Скрипт не найден: ${scriptPath}. Установите экосистему через install-ecosystem.ps1.`));
      return;
    }
    execFile(
      "node",
      [scriptPath, ...scriptArgs],
      { cwd: cwd || process.cwd(), maxBuffer: 10 * 1024 * 1024, timeout: 30000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message || "Node script error").trim()));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSidebarHtml(snapshot, errorText, rootDir) {
  const eco = snapshot && snapshot.ecosystem ? snapshot.ecosystem : {};
  const badges = [
    { label: "core", ver: eco.core },
    { label: "seo-geo", ver: eco.seoGeo },
    { label: "qa", ver: eco.qa },
    { label: "marketing", ver: eco.marketing },
  ];

  const qa = snapshot && snapshot.qaPreflight ? snapshot.qaPreflight : null;
  const qaText = qa
    ? `${qa.verdict} (${(qa.critical || []).length}/${(qa.high || []).length})`
    : "—";
  const qaDot =
    qa && (qa.critical || []).length > 0
      ? "dot-err"
      : qa && (qa.high || []).length > 0
        ? "dot-warn"
        : qa
          ? "dot-ok"
          : "dot-muted";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 10px 12px 16px;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: 12px;
      line-height: 1.4;
      color: var(--vscode-foreground);
      background: transparent;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-descriptionForeground));
      padding-bottom: 4px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    }
    .btn {
      width: 100%;
      height: 28px;
      padding: 0 9px;
      border-radius: 3px;
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border, rgba(128,128,128,0.22)));
      background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.12));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 7px;
      transition: background-color 0.12s;
    }
    .btn:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground, rgba(128,128,128,0.2))); }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
      justify-content: center;
      font-weight: 600;
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground, var(--vscode-button-background)); opacity: 0.94; }
    .ico { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.9; }
    .kv-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
    }
    .meter-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 2px 0;
    }
    .meter-track {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: var(--vscode-panel-border, rgba(128,128,128,0.22));
      overflow: hidden;
    }
    .meter-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--vscode-button-background, #3d59a1);
    }
    .meter-fill.ok { background: var(--vscode-testing-iconPassed, #73daca); }
    .meter-fill.warn { background: var(--vscode-editorWarning-foreground, #e0af68); }
    .muted { color: var(--vscode-descriptionForeground); }
    .mono { font-family: var(--vscode-editor-font-family, ui-monospace, Consolas, monospace); font-size: 11.5px; }
    .status-inline { display: inline-flex; align-items: center; gap: 5px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .dot-ok { background: var(--vscode-testing-iconPassed, #73daca); }
    .dot-warn { background: var(--vscode-editorWarning-foreground, #e0af68); }
    .dot-err { background: var(--vscode-editorError-foreground, #f7768e); }
    .dot-muted { background: var(--vscode-descriptionForeground); opacity: 0.5; }
    .err-box {
      padding: 7px 9px;
      border-radius: 3px;
      border: 1px solid var(--vscode-editorError-foreground, rgba(247,118,142,0.5));
      font-size: 11.5px;
    }
    .actions-col { display: flex; flex-direction: column; gap: 5px; }
  </style>
</head>
<body>
  <button type="button" class="btn btn-primary" data-cmd="openDashboard">
    <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
    Открыть Дашборд
  </button>

  ${errorText
      ? `<div class="err-box"><div style="font-weight:600;margin-bottom:2px;">Ошибка сканирования</div><div class="muted">${esc(errorText)}</div></div>`
      : !rootDir
        ? `<div class="section"><div class="section-title">Проект</div><div class="muted">Откройте папку проекта в IDE.</div></div>`
        : snapshot
          ? (() => {
              const readyPct = Math.max(0, Math.min(100, Number(snapshot.readinessScore || 0)));
              const blPct = Math.max(0, Math.min(100, Number(snapshot.backlog.completionPct || 0)));
              const sp = snapshot.setupPipeline || null;
              const spPct = sp && sp.totalSteps ? Math.round((sp.completedCount / sp.totalSteps) * 100) : 0;
              const vel = snapshot.velocity || null;
              const allSprints = vel && Array.isArray(vel.allSprints) && vel.allSprints.length > 0
                ? vel.allSprints
                : (vel && Array.isArray(vel.sprints) ? vel.sprints : []);
              const totalSprints = vel && vel.totalSprints != null ? vel.totalSprints : allSprints.length;
              const doneSprints = vel && vel.doneSprints != null
                ? vel.doneSprints
                : allSprints.filter((s) => s.status === "done").length;
              const sprintsPct = totalSprints > 0 ? Math.round((doneSprints / totalSprints) * 100) : 0;
              const nextSprint = allSprints.find((s) => s.status === "active")
                || (vel && Array.isArray(vel.sprints) && vel.sprints.length > 0 ? vel.sprints[0] : null);
              const permLabels = {
                safe_default: "безопасный",
                local_dev: "локальная разр.",
                staging_full: "staging",
                custom: "свой профиль",
              };
              const permText = snapshot.permissions && snapshot.permissions.configured
                ? (permLabels[snapshot.permissions.profile] || snapshot.permissions.profile)
                : "не настроен";
              return `
  <div class="section">
    <div class="section-title">Сводка · ${esc(snapshot.projectName)}</div>
    <div class="kv-list">
      <div class="meter-block">
        <div class="kv-row"><span class="muted">Готовность проекта</span><span class="mono">${readyPct}/100</span></div>
        <div class="meter-track"><div class="meter-fill ${readyPct >= 80 ? "ok" : readyPct >= 50 ? "" : "warn"}" style="width:${readyPct}%"></div></div>
      </div>
      <div class="meter-block">
        <div class="kv-row"><span class="muted">Бэклог</span><span class="mono">${esc(snapshot.backlog.doneCount)} выполн. / ${esc(snapshot.backlog.openCount)} откр. (${blPct}%)</span></div>
        <div class="meter-track"><div class="meter-fill ok" style="width:${blPct}%"></div></div>
      </div>
      ${sp && !sp.allDone ? `
      <div class="meter-block">
        <div class="kv-row"><span class="muted">Настройка проекта</span><span class="mono">${esc(sp.completedCount)}/${esc(sp.totalSteps)} шагов</span></div>
        <div class="meter-track"><div class="meter-fill" style="width:${spPct}%"></div></div>
      </div>` : ""}
      <div class="kv-row"><span class="muted">QA Preflight</span><span class="status-inline mono"><span class="dot ${qaDot}"></span>${esc(qaText)}</span></div>
      <div class="kv-row"><span class="muted">Память</span><span class="mono">${esc(snapshot.memory.adrCount)} ADR · ${esc(snapshot.memory.dailyCount)} логов</span></div>
      <div class="kv-row"><span class="muted">Ритм</span><span class="mono">${vel ? esc(vel.weeklyCapacityHours) + " ч/нед" : "—"}</span></div>
      <div class="kv-row"><span class="muted">Границы</span><span class="mono">${esc(permText)}</span></div>
      <div class="kv-row"><span class="muted">Контекст</span><span class="mono">~${esc(snapshot.contextBudget.totalBaselineOverheadTokens)} ток.</span></div>
    </div>
  </div>

  ${totalSprints > 0 ? `
  <div class="section">
    <div class="section-title">Спринты · ${esc(doneSprints)}/${esc(totalSprints)} завершено</div>
    <div class="kv-list">
      <div class="meter-block">
        <div class="kv-row"><span class="muted">Дорожная карта</span><span class="mono">${vel && vel.overallDeadline ? "до " + esc(vel.overallDeadline) : "100%"}</span></div>
        <div class="meter-track"><div class="meter-fill ok" style="width:${sprintsPct}%"></div></div>
      </div>
      ${allSprints
            .map((s) => {
              const isDone = s.status === "done";
              const isActive = s.status === "active";
              const dot = isDone ? "dot-ok" : isActive ? "dot-warn" : "dot-muted";
              const shortTitle = String(s.name || "").split(/[—–-]/)[0].trim() || s.name;
              const right = isDone
                ? `${s.doneCount}/${s.tasksCount} · готово`
                : `${s.openCount} зад. · до ${s.projectedDeadline || "—"}`;
              return `<div class="kv-row" title="${esc(s.name)}"><span class="status-inline"><span class="dot ${dot}"></span><span style="${isActive ? "font-weight:600;" : ""}">${esc(shortTitle)}</span></span><span class="mono muted">${esc(right)}</span></div>`;
            })
            .join("")}
      ${nextSprint && Array.isArray(nextSprint.tasks) && nextSprint.tasks.length > 0 ? `
      <div style="margin-top:4px;padding-top:5px;border-top:1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));display:flex;flex-direction:column;gap:3px;">
        <div class="kv-row"><span class="muted">Активный (${esc(nextSprint.startDate || "сегодня")} → ${esc(nextSprint.projectedDeadline || "—")})</span><span class="mono">${esc(nextSprint.loadPct)}% нед.</span></div>
        ${nextSprint.tasks
          .filter((t) => !t.done)
          .slice(0, 4)
          .map((t) => `<div class="mono muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.id + " — " + t.text)}">• ${esc(t.id ? t.id + " " : "")}${esc(t.text)}</div>`)
          .join("")}
      </div>` : ""}
      <button type="button" class="btn" data-cmd="openSprints" style="margin-top:4px;">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 1.5v3M11 1.5v3M2 6.5h12" stroke-linecap="round"/></svg>
        Все спринты и сроки
      </button>
    </div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Плагины (4)</div>
    <div class="kv-list">
      ${badges
            .map(
              (b) =>
                `<div class="kv-row"><span class="status-inline mono"><span class="dot ${b.ver ? "dot-ok" : "dot-muted"}"></span>${esc(b.label)}</span><span class="mono muted">${b.ver ? "v" + esc(b.ver) : "выкл"}</span></div>`
            )
            .join("")}
    </div>
  </div>`;
            })()
          : `<div class="muted">Загрузка снапшота...</div>`
    }

  <div class="section">
    <div class="section-title">Действия</div>
    <div class="actions-col">
      <button type="button" class="btn" data-cmd="openPermissions">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>
        Настроить границы и права
      </button>
      <button type="button" class="btn" data-cmd="refresh">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 8a5.5 5.5 0 1 1-1.4-3.7M13.5 2.5v2.8h-2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Обновить скан
      </button>
      <button type="button" class="btn" data-cmd="initProject">
        ${snapshot && snapshot.setupPipeline && snapshot.setupPipeline.isProjectInitialized
          ? `<span class="dot dot-ok"></span>Настроено (профиль)`
          : `<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10" stroke-linecap="round"/></svg>Инициализировать проект`
        }
      </button>
      <button type="button" class="btn" data-cmd="runQaPreflight">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4l5-2z" stroke-linejoin="round"/></svg>
        Запустить QA Preflight
      </button>
      <button type="button" class="btn" data-cmd="copyInitPrompt">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="9" rx="1"/><path d="M3 11V3a1 1 0 0 1 1-1h6" stroke-linecap="round"/></svg>
        Промпт bitrix-project-init
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-cmd]");
      if (btn) vscode.postMessage({ type: btn.dataset.cmd });
    });
  </script>
</body>
</html>`;
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("1C-Bitrix Command Center");
  let dashboardPanel = null;
  let sidebarView = null;
  let lastSnapshot = null;

  async function refreshSnapshot() {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
      lastSnapshot = null;
      if (sidebarView) sidebarView.webview.html = renderSidebarHtml(null, null, null);
      return null;
    }
    try {
      const dataScript = path.join(CORE_SCRIPTS, "bitrix-dashboard-data.mjs");
      const raw = await runNodeScript(dataScript, [rootDir, "--json"], rootDir);
      lastSnapshot = JSON.parse(raw);
      if (sidebarView) sidebarView.webview.html = renderSidebarHtml(lastSnapshot, null, rootDir);
      return lastSnapshot;
    } catch (err) {
      if (sidebarView) sidebarView.webview.html = renderSidebarHtml(null, err.message, rootDir);
      return null;
    }
  }

  async function renderDashboardIntoPanel(panel, initialTab) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
      panel.webview.html = `<body style="font-family:sans-serif;padding:24px;"><h2>Откройте папку проекта</h2><p>Выберите workspace в Antigravity IDE и нажмите «Обновить».</p></body>`;
      return;
    }
    panel.webview.html = `<body style="font-family:sans-serif;padding:24px;opacity:0.85;"><h3>Сканирование проекта и сборка Command Center Dashboard...</h3></body>`;
    try {
      const renderScript = path.join(CORE_SCRIPTS, "bitrix-dashboard-render.mjs");
      const html = await runNodeScript(renderScript, [rootDir, "--mode", "webview", "--stdout"], rootDir);
      panel.webview.html = html;
      if (initialTab) {
        setTimeout(() => {
          panel.webview.postMessage({ type: "switchTab", tab: initialTab });
        }, 120);
      }
      refreshSnapshot();
    } catch (err) {
      panel.webview.html = `<body style="font-family:sans-serif;padding:24px;color:#ef4444;"><h3>Ошибка сборки дашборда</h3><pre>${esc(err.message)}</pre></body>`;
    }
  }

  async function savePermissionsToWorkspace(profile, rules) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) return;
    const target = path.join(rootDir, ".agents", "permissions.json");
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      schemaVersion: "1.0",
      profile: profile || "custom",
      updatedAt: today,
      rules: rules || {},
      notes: "Настроено визуально через 1C-Bitrix Command Center. Агент и все субагенты обязаны соблюдать эти границы.",
    };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
    vscode.window.showInformationMessage(`Границы и разрешения сохранены в .agents/permissions.json (${payload.profile}).`);
    await refreshSnapshot();
    if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel, "ecosystem");
  }

  async function saveVelocityToWorkspace(hoursPerDay, daysPerWeek) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) return;
    const target = path.join(rootDir, "docs", "memory", "velocity.json");
    const payload = {
      schemaVersion: "1.0",
      targetHoursPerDay: Math.max(0.5, Math.min(16, Number(hoursPerDay) || 2)),
      activeDaysPerWeek: Math.max(1, Math.min(7, Number(daysPerWeek) || 5)),
      sprintLengthDays: 7,
      autoCalibrateFromHistory: true,
      notes: "Настроено через Command Center Dashboard для расчёта ёмкости спринтов и дедлайнов.",
    };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
    vscode.window.showInformationMessage(
      `Ритм обновлён: ${payload.targetHoursPerDay} ч/день × ${payload.activeDaysPerWeek} дн/нед (docs/memory/velocity.json).`
    );
    await refreshSnapshot();
    if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel, "backlog");
  }

  async function saveCmsChecklistToWorkspace(archetype, archetypeLabel, blocks) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) return;
    const target = path.join(rootDir, "docs", "memory", "cms-checklist.json");
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      schemaVersion: "1.0",
      archetype: archetype || "store",
      archetypeLabel: archetypeLabel || archetype || "store",
      updatedAt: today,
      blocks: Array.isArray(blocks)
        ? blocks.map((b) => ({
            id: b.id,
            number: b.number,
            title: b.title,
            module: b.module,
            adminPath: b.adminPath,
            items: Array.isArray(b.items)
              ? b.items.map((it) => ({
                  id: it.id,
                  title: it.title,
                  status: it.status || "needs_setup",
                  note: it.note || "",
                }))
              : [],
          }))
        : [],
    };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n", "utf8");
    vscode.window.showInformationMessage(
      `Мастер-чеклист 1С-Битрикс сохранён в docs/memory/cms-checklist.json (профиль: ${payload.archetype}).`
    );
    await refreshSnapshot();
    if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel, "knowledge");
  }

  async function loadSkillCollector() {
    const collectorPath = path.join(CORE_SCRIPTS, "bitrix-skill-collector.mjs");
    if (!fs.existsSync(collectorPath)) {
      throw new Error("bitrix-skill-collector.mjs не найден. Переустановите antigravity-bitrix-core.");
    }
    return import(pathToFileURL(collectorPath).href);
  }

  async function handleLearnedSkillAction(msg) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) return;
    try {
      const mod = await loadSkillCollector();
      if (msg.type === "addLearnedSkill") {
        const res = mod.saveLearnedSkill(rootDir, {
          title: msg.title,
          summary: msg.summary,
          targetPlugin: msg.targetPlugin,
          category: msg.category,
          body: msg.body,
          autoRedact: Boolean(msg.autoRedact),
        });
        vscode.window.showInformationMessage(
          `Навык сохранён в ${res.relPath} (Sanitizer: ${res.verdict}${res.findings.length ? ", замечаний: " + res.findings.length : ""}).`
        );
      } else if (msg.type === "toggleLearnedSkill") {
        mod.setLearnedSkillExcluded(rootDir, msg.filename, Boolean(msg.excluded));
      } else if (msg.type === "sanitizeLearnedSkill") {
        const res = mod.sanitizeExistingSkill(rootDir, msg.filename);
        vscode.window.showInformationMessage(`Обезличивание выполнено (${res.filename}) → Sanitizer: ${res.verdict}.`);
      } else if (msg.type === "deleteLearnedSkill") {
        const confirm = await vscode.window.showWarningMessage(
          `Удалить накопленный навык ${msg.filename} из .agents/learned-skills/?`,
          { modal: true },
          "Удалить"
        );
        if (confirm !== "Удалить") return;
        mod.deleteLearnedSkill(rootDir, msg.filename);
        vscode.window.showInformationMessage(`Навык ${msg.filename} удалён.`);
      } else if (msg.type === "submitSkillsPr") {
        const bundle = mod.prepareSkillsPrBundle(rootDir, msg.files);
        if (!bundle.ok || bundle.blocked) {
          vscode.window.showErrorMessage(bundle.error || "Отправка заблокирована Sanitizer.");
          return;
        }
        const confirm = await vscode.window.showWarningMessage(
          `Создать Pull Request (${bundle.skillsCount} обезличенных навыков, Sanitizer: PASS) в ${bundle.upstreamRepo}?`,
          { modal: true },
          "Создать Pull Request"
        );
        if (confirm !== "Создать Pull Request") return;
        const res = mod.submitSkillsPullRequest(rootDir, msg.files);
        if (res.ok && res.prUrl) {
          const openAction = await vscode.window.showInformationMessage(
            `Pull Request создан (${res.skillsCount} навыков): ${res.prUrl}`,
            "Открыть PR в браузере"
          );
          if (openAction === "Открыть PR в браузере") {
            vscode.env.openExternal(vscode.Uri.parse(res.prUrl));
          }
        } else {
          if (res.bundle && res.bundle.prBody) {
            await vscode.env.clipboard.writeText(`# ${res.bundle.prTitle}\n\n${res.bundle.prBody}`);
          }
          vscode.window.showWarningMessage(
            `${res.error || "Не удалось создать PR автоматически."} Обезличенный бандл скопирован в буфер обмена.`
          );
        }
      }
      await refreshSnapshot();
      if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel, "skills");
    } catch (err) {
      vscode.window.showErrorMessage(`Ошибка Skill Collector: ${err.message}`);
    }
  }

  async function openWorkspaceFile(relPath) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir || !relPath) return;
    const full = path.resolve(rootDir, relPath);
    if (!full.startsWith(path.resolve(rootDir))) return;
    if (!fs.existsSync(full)) {
      vscode.window.showWarningMessage(`Файл ${relPath} ещё не создан — сначала нажмите «Сохранить».`);
      return;
    }
    const doc = await vscode.workspace.openTextDocument(full);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }

  async function openDashboardCommand(initialTab) {
    if (dashboardPanel) {
      dashboardPanel.reveal(vscode.ViewColumn.One);
      await renderDashboardIntoPanel(dashboardPanel, initialTab);
      return;
    }
    dashboardPanel = vscode.window.createWebviewPanel(
      "bitrixCommandCenterDashboard",
      "1C-Bitrix Command Center",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    dashboardPanel.onDidDispose(() => {
      dashboardPanel = null;
    });
    dashboardPanel.webview.onDidReceiveMessage(async (msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === "copy" && typeof msg.text === "string") {
        await vscode.env.clipboard.writeText(msg.text);
        vscode.window.showInformationMessage(msg.label || "Скопировано в буфер обмена");
      } else if (msg.type === "refresh") {
        await renderDashboardIntoPanel(dashboardPanel);
      } else if (msg.type === "initProject") {
        await initProjectCommand();
      } else if (msg.type === "runQaPreflight") {
        await runQaPreflightCommand();
      } else if (msg.type === "savePermissions") {
        await savePermissionsToWorkspace(msg.profile, msg.rules);
      } else if (msg.type === "saveVelocity") {
        await saveVelocityToWorkspace(msg.hoursPerDay, msg.daysPerWeek);
      } else if (msg.type === "saveCmsChecklist") {
        await saveCmsChecklistToWorkspace(msg.archetype, msg.archetypeLabel, msg.blocks);
      } else if (
        msg.type === "addLearnedSkill" ||
        msg.type === "toggleLearnedSkill" ||
        msg.type === "sanitizeLearnedSkill" ||
        msg.type === "deleteLearnedSkill" ||
        msg.type === "submitSkillsPr"
      ) {
        await handleLearnedSkillAction(msg);
      } else if (msg.type === "openFile") {
        await openWorkspaceFile(msg.path);
      }
    });
    await renderDashboardIntoPanel(dashboardPanel, initialTab);
  }

  async function initProjectCommand() {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
      vscode.window.showWarningMessage("Сначала откройте папку 1С-Битрикс проекта в IDE.");
      return;
    }
    const picked = await vscode.window.showQuickPick(
      [
        { label: "full", description: "Все 4 плагина (core + seo-geo + qa + marketing)" },
        { label: "store", description: "Интернет-магазин / CRM (все 4 плагина)" },
        { label: "corporate", description: "Корпоративный сайт / услуги (core + seo-geo + qa)" },
        { label: "minimal", description: "Минимальный (только core, минимальный контекст)" },
      ],
      { placeHolder: "Выберите профиль плагинов 1С-Битрикс для этого проекта" }
    );
    if (!picked) return;

    const bootstrapScript = path.join(CORE_SCRIPTS, "bitrix-bootstrap.mjs");
    try {
      const out = await runNodeScript(
        bootstrapScript,
        [rootDir, "--profile", picked.label, "--update-config", "--json"],
        rootDir
      );
      const res = JSON.parse(out);
      outputChannel.appendLine(`=== Bootstrap applied (${res.profile}) ===`);
      outputChannel.appendLine(`Created: ${(res.actions.created || []).join(", ") || "none"}`);
      outputChannel.appendLine(`Updated: ${(res.actions.overwritten || []).join(", ") || "none"}`);
      outputChannel.appendLine(`Skipped: ${(res.actions.skipped || []).join(", ") || "none"}`);
      const overrides = (res.envCheck && res.envCheck.localPluginOverrides) || [];
      if (overrides.length > 0) {
        outputChannel.appendLine(
          `WARNING: Workspace-local plugin copies override global plugins: ${overrides.map((o) => o.path).join(", ")}`
        );
        vscode.window.showWarningMessage(
          `Внимание: внутри проекта найдены локальные копии плагинов (${overrides.map((o) => o.path).join(", ")}), они перекрывают глобальные версии!`
        );
      }
      outputChannel.show(true);

      await vscode.env.clipboard.writeText(res.nextPrompt);
      vscode.window.showInformationMessage(
        `Проект инициализирован (${res.detectedStage}, профиль ${res.profile}). Промпт для bitrix-project-init скопирован в буфер — вставьте его в чат Antigravity!`
      );
      await refreshSnapshot();
      if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel);
    } catch (err) {
      vscode.window.showErrorMessage(`Ошибка инициализации: ${err.message}`);
    }
  }

  async function runQaPreflightCommand() {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
      vscode.window.showWarningMessage("Сначала откройте папку проекта в IDE.");
      return;
    }
    try {
      const out = await runNodeScript(QA_SCRIPT, [rootDir], rootDir);
      outputChannel.clear();
      outputChannel.appendLine(out);
      outputChannel.show(true);
      await refreshSnapshot();
      if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel);
    } catch (err) {
      vscode.window.showErrorMessage(`Ошибка QA Preflight: ${err.message}`);
    }
  }

  const sidebarProvider = {
    resolveWebviewView(webviewView) {
      sidebarView = webviewView;
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = renderSidebarHtml(lastSnapshot, null, getWorkspaceRoot());
      webviewView.webview.onDidReceiveMessage(async (msg) => {
        if (!msg || !msg.type) return;
        if (msg.type === "openDashboard") await openDashboardCommand();
        else if (msg.type === "openSprints") await openDashboardCommand("backlog");
        else if (msg.type === "openPermissions") await openDashboardCommand("ecosystem");
        else if (msg.type === "refresh") {
          await refreshSnapshot();
          if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel);
        } else if (msg.type === "initProject") await initProjectCommand();
        else if (msg.type === "runQaPreflight") await runQaPreflightCommand();
        else if (msg.type === "copyInitPrompt") {
          const prompt =
            "Запусти bitrix-project-init: просканируй проект, проведи короткое интервью (Greenfield/Brownfield), заполни AGENTS.md, docs/memory/* и docs/backlog.md, затем открой Command Center Dashboard.";
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage("Промпт bitrix-project-init скопирован — вставьте его в чат Antigravity.");
        }
      });
      refreshSnapshot();
    },
  };

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider("bitrixCommandCenter.sidebar", sidebarProvider),
    vscode.commands.registerCommand("bitrixCommandCenter.openDashboard", openDashboardCommand),
    vscode.commands.registerCommand("bitrixCommandCenter.refresh", async () => {
      await refreshSnapshot();
      if (dashboardPanel) await renderDashboardIntoPanel(dashboardPanel);
    }),
    vscode.commands.registerCommand("bitrixCommandCenter.initProject", initProjectCommand),
    vscode.commands.registerCommand("bitrixCommandCenter.runQaPreflight", runQaPreflightCommand)
  );
}

function deactivate() { }

module.exports = { activate, deactivate };
