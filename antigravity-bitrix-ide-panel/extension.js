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
    ? `${qa.verdict} (${(qa.critical || []).length} crit / ${(qa.high || []).length} high)`
    : "не запускался";
  const qaClass =
    qa && (qa.critical || []).length > 0
      ? "err"
      : qa && (qa.high || []).length > 0
        ? "warn"
        : "ok";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 12.5px;
      color: var(--vscode-foreground);
      background: transparent;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border, transparent));
      background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.18));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .btn:hover { opacity: 0.92; }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      justify-content: center;
      padding: 10px;
    }
    .card {
      border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.25));
      border-radius: 8px;
      padding: 10px;
      background: var(--vscode-editorWidget-background, rgba(128,128,128,0.08));
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .muted { color: var(--vscode-descriptionForeground); font-size: 11.5px; }
    .mono { font-family: var(--vscode-editor-font-family, monospace); }
    .ok { color: var(--vscode-testing-iconPassed, #22c55e); font-weight: 700; }
    .warn { color: var(--vscode-editorWarning-foreground, #f59e0b); font-weight: 700; }
    .err { color: var(--vscode-editorError-foreground, #ef4444); font-weight: 700; }
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.3));
    }
    .chip.on { border-color: var(--vscode-testing-iconPassed, #22c55e); color: var(--vscode-testing-iconPassed, #22c55e); }
    .chip.off { opacity: 0.65; }
  </style>
</head>
<body>
  <button type="button" class="btn btn-primary" data-cmd="openDashboard">🚀 Открыть Дашборд</button>

  ${errorText
      ? `<div class="card"><div class="err">Ошибка сканирования</div><div class="muted">${esc(errorText)}</div></div>`
      : !rootDir
        ? `<div class="card"><div><strong>Проект не открыт</strong></div><div class="muted">Откройте папку 1С-Битрикс проекта в IDE, чтобы запустить сканер и дашборд.</div></div>`
        : snapshot
          ? `
  <div class="card">
    <div class="row"><strong>${esc(snapshot.projectName)}</strong><span class="ok mono">${esc(snapshot.readinessScore)}/100</span></div>
    <div class="row muted"><span>QA Preflight</span><span class="${qaClass}">${esc(qaText)}</span></div>
    <div class="row muted"><span>Бэклог</span><span class="mono">${esc(snapshot.backlog.doneCount)} done / ${esc(snapshot.backlog.openCount)} open</span></div>
    <div class="row muted"><span>Память / ADR</span><span class="mono">${esc(snapshot.memory.adrCount)} ADR · ${esc(snapshot.memory.dailyCount)} daily</span></div>
    <div class="row muted"><span>Контекст</span><span class="mono">~${esc(snapshot.contextBudget.totalBaselineOverheadTokens)} tok</span></div>
  </div>
  <div class="card">
    <div class="muted" style="font-weight:600;">Экосистема 4 плагинов</div>
    <div class="chips">
      ${badges
            .map(
              (b) =>
                `<span class="chip mono ${b.ver ? "on" : "off"}">${esc(b.label)}${b.ver ? " v" + esc(b.ver) : " OFF"}</span>`
            )
            .join("")}
    </div>
  </div>`
          : `<div class="card muted">Загрузка снапшота проекта...</div>`
    }

  <button type="button" class="btn" data-cmd="refresh">🔄 Обновить скан</button>
  <button type="button" class="btn" data-cmd="initProject">🛠️ Инициализировать проект</button>
  <button type="button" class="btn" data-cmd="runQaPreflight">🛡️ Запустить QA Preflight</button>
  <button type="button" class="btn" data-cmd="copyInitPrompt">📋 Промпт для bitrix-project-init</button>

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
