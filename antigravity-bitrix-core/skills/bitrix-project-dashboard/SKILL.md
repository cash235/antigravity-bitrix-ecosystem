---
name: bitrix-project-dashboard
description: >
  Generates the interactive 1C-Bitrix Central Orchestrator Command Center Dashboard v2.0 in
  Antigravity's Side Pane (Standalone HTML Artifact). Displays Readiness Score, Context Budget,
  5-track Orchestrator Initiatives (Backend / Frontend / SEO-GEO / Marketing / QA) with ICE ROI,
  business benefit, optimal Antigravity model tier + quota fallback, expandable precision prompts
  (AC-001..N + Must NOT), Knowledge Matrix, Backlog, Git Graph, and 4-plugin ecosystem status.
---

# 1C-Bitrix Central Orchestrator Command Center Dashboard (v2.1)

Use this skill whenever the operator asks to **"open the project dashboard"**, **"show orchestrator recommendations"**, **"audit project status & next tasks"**, or immediately after `bitrix-project-init`.

---

## Step 1: Deterministic Fact Collection (Zero Guesswork)

Run the collector against the workspace root (it automatically integrates `antigravity-bitrix-qa/scripts/bitrix-qa-preflight.mjs` when installed):

- **Windows PowerShell**:
  ```powershell
  node "$env:USERPROFILE\.gemini\config\plugins\antigravity-bitrix-core\scripts\bitrix-dashboard-data.mjs" . --json
  ```
- **Linux / macOS**:
  ```bash
  node ~/.gemini/config/plugins/antigravity-bitrix-core/scripts/bitrix-dashboard-data.mjs . --json
  ```

Never fabricate metrics, commit hashes, or file paths.

Also call `swarm(action: "models", all: true)` once before synthesis to capture the operator's **live available models**, **reasoning effort levels (`Low`/`Medium`/`High`/`XHigh`)**, and **current `quota_remaining` %** (auto-excluding any `0%` quota model family from Primary recommendations).

---

## Step 2: Central Orchestrator Synthesis (`bitrix-orchestrator`)

Apply the `bitrix-orchestrator` rules to the collected JSON snapshot + `docs/memory/status.md` + `docs/backlog.md`, and write a compact JSON overlay file (e.g., `<artifact_dir>/scratch/dashboard_overlay.json`) containing:

1. **`initiatives`** — **5–8 high-ROI, zero-busywork initiatives** across all relevant tracks (`Backend`, `Frontend`, `SEO & GEO`, `Маркетинг`, `QA`), each with:
   - `id`, `track`, `pipeline`, `tier`, `title`, `impact`, `confidence`, `effort`
   - `uiModel`, `uiQuota`, `fallbackModel`, `fallbackQuota`, `subagent`, `tools`
   - `benefit` (plain Russian business value), `evidence` (exact observed fact), `prompt` (precision copy-ready prompt with `AC-001..N` and `Must NOT`).
2. **`blindSpots`** — up to 3 highest-signal blind spots (`severity`, `badge`, `metric`, `title`, `detail`).
3. **`models`** + **`modelsSnapshotTime`** — live models & quotas resolved from `swarm(action: "models", all: true)`.

---

## Step 3: Deterministic Render & Safe Side-Pane Delivery (Zero Broken Buttons!)

**NEVER hand-write 900 lines of HTML/JS inline** (hand-escaped template literals easily break button interactivity on unescaped backticks). Always render via the built-in zero-dependency generator `bitrix-dashboard-render.mjs`, which safely embeds JSON via `<script id="dashboard-data" type="application/json">`, escapes all HTML, uses a 3-tier resilient clipboard fallback, and self-verifies JS syntax:

- **Windows PowerShell**:
  ```powershell
  node "$env:USERPROFILE\.gemini\config\plugins\antigravity-bitrix-core\scripts\bitrix-dashboard-render.mjs" . --overlay "<overlay.json>" --out "<scratch>/bitrix_project_dashboard.html" --mode artifact
  ```
- **Linux / macOS**:
  ```bash
  node ~/.gemini/config/plugins/antigravity-bitrix-core/scripts/bitrix-dashboard-render.mjs . --overlay "<overlay.json>" --out "<scratch>/bitrix_project_dashboard.html" --mode artifact
  ```

Then publish the rendered HTML into `<appDataDir>/brain/<conversation-id>/bitrix_project_dashboard.html` using `write_file` with `ArtifactMetadata: { UserFacing: true, RequestFeedback: false, Summary: "..." }` so Antigravity opens it cleanly as a **Standalone Side-Pane Artifact** (no `<agent-embed>`).

*(Note: The companion Antigravity IDE Activity Bar extension runs the exact same `bitrix-dashboard-render.mjs --mode webview` locally in 1 click without needing an LLM turn.)*

### Mandatory 5 Tabs:

1. **🧠 Оркестратор и Инициативы** — Readiness Score, Context Budget badge, 5-track filter pills (`Все` / `Backend` / `Frontend` / `SEO & GEO` / `Маркетинг` / `QA`), ICE-sorted initiative cards with **Business Value**, **Model + Fallback Badge**, **Tool Chain Badge**, expandable **Precision Prompt preview** + 1-click **«Копировать промпт»**, and **Blind-Spot Radar**.
2. **📚 Знания и Интеграции** — Personalized vs Basic-Only matrix with filters + 1-click personalization prompts.
3. **📋 Бэклог и Прогресс** — Completion bar, searchable open tasks with 1-click «Запустить через Оркестратор» prompt copy, and recently completed archive.
4. **🌿 Git Graph и Структура `/local/`** — Vertical Git commit timeline, uncommitted files alert, checkpoints, namespaces, templates, and AJAX endpoints.
5. **🧩 Экосистема 4 Плагинов и Бюджет Контекста** — Live status of `core`, `seo-geo`, `qa`, `marketing` (plus duplicate warnings), connected MCP servers (`b24-dev-mcp`, `chrome-devtools-mcp`), Context Budget breakdown, and **Strategic Compact (`/compact`)** advisor.
