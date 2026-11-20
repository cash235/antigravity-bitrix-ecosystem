# Changelog

All notable changes to the **1C-Bitrix Antigravity Ecosystem** are documented in this file.

## [v2.1.0] - 2026-11-20

### Added
- **Deterministic Command Center Dashboard Renderer (`antigravity-bitrix-core/scripts/bitrix-dashboard-render.mjs`)**:
  - Safe JSON payload embedding (`<script id="dashboard-data" type="application/json">`) eliminating unescaped backtick / template-literal runtime errors.
  - 3-tier resilient clipboard copy (`vscode.postMessage` → `navigator.clipboard.writeText().catch()` → `execCommand('copy')` → fallback modal).
  - Dual rendering modes: `--mode artifact` (Antigravity Side Pane) and `--mode webview` (offline zero-CDN IDE Webview).
- **Automatic QA Preflight Integration**: `bitrix-dashboard-data.mjs` now automatically invokes `antigravity-bitrix-qa/scripts/bitrix-qa-preflight.mjs` when installed and injects CRITICAL/HIGH signals into the Orchestrator feed.
- **Antigravity IDE / VS Code Activity Bar Extension (`antigravity-bitrix-ide-panel` v1.0.0)**:
  - Dedicated 1C-Bitrix Command Center icon in the left Activity Bar with live project status sidebar, 1-click full 5-tab Webview dashboard, project bootstrapper, and QA Preflight runner.
  - Zero-npm `.vsix` packaging & installation (`install-ide-extension.ps1` / `.sh`).
- **One-Command Ecosystem Installer & Project Bootstrapper**:
  - `install-ecosystem.ps1` / `.sh` for all 4 plugins + IDE panel.
  - `init-bitrix-project.ps1` / `.sh` + `bitrix-bootstrap.mjs` with automatic global version check, `--update-config` (updates only `.agents/plugins.json` without touching project memory), and workspace-local plugin override detection.
- **Open-Source Governance**: `README.md`, `CONTRIBUTING.md`, `QUICKSTART_LIVE_TEST.md`, `.github/CODEOWNERS`, Issue/PR templates, GitHub Actions CI, and `assets/logo.svg` for `antigravity-bitrix-seo-geo`.

### Included Plugins
- `antigravity-bitrix-core` `v2.1.0` (8 skills, 2 subagents, 4 CLI scripts, 7 memory templates)
- `antigravity-bitrix-seo-geo` `v2.1.0` (9 skills, 2 subagents, 5 CLI scripts)
- `antigravity-bitrix-qa` `v1.0.0` (4 skills, 1 subagent, 1 CLI script)
- `antigravity-bitrix-marketing` `v1.0.0` (4 skills, 1 subagent)
- `antigravity-bitrix-ide-panel` `v1.0.0` (Antigravity IDE Activity Bar extension)
