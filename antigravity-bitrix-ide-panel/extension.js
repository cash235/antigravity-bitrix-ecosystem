"use strict";

const vscode = require("vscode");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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
        ? `<div class="section"><div class="section-title">Проект</div><div class="muted">Откройте папку 1С-Битрикс проекта в IDE.</div></div>`
        : snapshot
          ? `
  <div class="section">
    <div class="section-title">Сводка · ${esc(snapshot.projectName)}</div>
    <div class="kv-list">
      <div class="kv-row"><span class="muted">Готовность</span><span class="mono">${esc(snapshot.readinessScore)}/100</span></div>
      <div class="kv-row"><span class="muted">QA Preflight</span><span class="status-inline mono"><span class="dot ${qaDot}"></span>${esc(qaText)}</span></div>
      <div class="kv-row"><span class="muted">Бэклог</span><span class="mono">${esc(snapshot.backlog.doneCount)} done / ${esc(snapshot.backlog.openCount)} open</span></div>
      <div class="kv-row"><span class="muted">Память</span><span class="mono">${esc(snapshot.memory.adrCount)} ADR · ${esc(snapshot.memory.dailyCount)} daily</span></div>
      <div class="kv-row"><span class="muted">Ритм</span><span class="mono">${snapshot.velocity ? esc(snapshot.velocity.weeklyCapacityHours) + " ч/нед" : "—"}</span></div>
      <div class="kv-row"><span class="muted">Границы</span><span class="mono">${snapshot.permissions ? esc(snapshot.permissions.profile) : "safe"}</span></div>
      <div class="kv-row"><span class="muted">Контекст</span><span class="mono">~${esc(snapshot.contextBudget.totalBaselineOverheadTokens)} tok</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Плагины (4)</div>
    <div class="kv-list">
      ${badges
            .map(
              (b) =>
                `<div class="kv-row"><span class="status-inline mono"><span class="dot ${b.ver ? "dot-ok" : "dot-muted"}"></span>${esc(b.label)}</span><span class="mono muted">${b.ver ? "v" + esc(b.ver) : "off"}</span></div>`
            )
            .join("")}
    </div>
  </div>`
          : `<div class="muted">Загрузка снапшота...</div>`
    }

  <div class="section">
    <div class="section-title">Действия</div>
    <div class="actions-col">
      <button type="button" class="btn" data-cmd="refresh">
        <svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 8a5.5 5.5 0 1 1-1.4-3.7M13.5 2.5v2.8h-2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Обновить скан
      </button>
      <button type="button" class="btn" data-cmd="initProject">
        ${snapshot && snapshot.setupPipeline && snapshot.setupPipeline.isProjectInitialized
          ? `<span class="dot dot-ok"></span>Инициализирован (профиль)`
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

  async function renderDashboardIntoPanel(panel) {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
      panel.webview.html = `<body style="font-family:sans-serif;padding:24px;"><h2>Откройте папку проекта 1С-Битрикс</h2><p>Выберите workspace в Antigravity IDE и нажмите «Обновить».</p></body>`;
      return;
    }
    panel.webview.html = `<body style="font-family:sans-serif;padding:24px;opacity:0.85;"><h3>⏳ Сканирование проекта и сборка Command Center Dashboard...</h3></body>`;
    try {
      const renderScript = path.join(CORE_SCRIPTS, "bitrix-dashboard-render.mjs");
      const html = await runNodeScript(renderScript, [rootDir, "--mode", "webview", "--stdout"], rootDir);
      panel.webview.html = html;
      refreshSnapshot();
    } catch (err) {
      panel.webview.html = `<body style="font-family:sans-serif;padding:24px;color:#ef4444;"><h3>Ошибка сборки дашборда</h3><pre>${esc(err.message)}</pre></body>`;
    }
  }

  async function openDashboardCommand() {
    if (dashboardPanel) {
      dashboardPanel.reveal(vscode.ViewColumn.One);
      await renderDashboardIntoPanel(dashboardPanel);
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
      }
    });
    await renderDashboardIntoPanel(dashboardPanel);
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
