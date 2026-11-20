# antigravity-bitrix-core

**Central 1C-Bitrix D7 Project Orchestrator, Interactive Command Center Dashboard & Living Memory Foundation for Google Antigravity IDE.**

Install once globally — use across **every 1C-Bitrix project** (from a fresh corporate site or online store to an existing high-load Bitrix24 + E-commerce + CRM codebase) without duplicating framework rules into project repositories.

---

## Modular 4-Plugin Bitrix Ecosystem

`antigravity-bitrix-core` acts as the **Central Hub** and coordinates 3 optional specialist plugins (enable only what a project needs to protect your Context Budget):

1. **`antigravity-bitrix-core` (v2.0.0 — Always On)**: Central Orchestrator (ICE prioritization, Model/Quota Router, Precision Prompt Builder, Anti-Loop), Command Center Dashboard v2.0, Greenfield/Brownfield onboarding + legacy style capture, D7 architecture, memory/ADR governance, Fail-Closed code review, Git checkpoints & UAT.
2. **`antigravity-bitrix-seo-geo` (v2.1.0)**: Technical SEO, GEO (AI Search), Schema.org, E-commerce SEO, Multisite, Analytics, Owner REST API Reporting, Drift Monitoring.
3. **`antigravity-bitrix-qa` (v1.0.0)**: Browser Visual QA (`375/768/1440px`), Click-Path State Audit (buttons/AJAX/forms), Pre-Launch Production Audit, Regression Smoke Checks.
4. **`antigravity-bitrix-marketing` (v1.0.0)**: Product Lens (ICE ROI), Conversion Copywriting, Campaigns & Abandoned-Cart Retention, Visual UX & Design Critique.

---

## Bundle Contents (`antigravity-bitrix-core` v2.0.0)

- **Always-On Rules**: `rules/AGENTS.md` (lean <50 lines for optimal Context Budget)
- **8 Modular Skills**:
  - `bitrix-orchestrator` — Central Orchestrator: ICE anti-busywork scoring, native Antigravity Model/Quota Router (`flash_lite`/`flash`/`inherit`/`pro`), 5 typed pipelines, Precision Prompt Builder (`AC-001..N` + `Must NOT`), anti-loop damping, 5-axis self-evaluation, Strategic Compact.
  - `bitrix-project-dashboard` — 5-tab interactive Side-Pane Command Center v2.0.
  - `bitrix-project-init` — Branching Greenfield / Brownfield onboarding interview + legacy-style inheritance + memory/backlog generator.
  - `bitrix-d7-architecture` — D7 ORM, Cache, EventManager, Asset, HighloadBlock, HttpClient, `component_epilog.php`, official docs & MCP verification.
  - `bitrix-memory-governance` — Living documentation (`docs/memory/*`), Michael Nygard ADRs, daily logs, module `README.md`, and backlog hygiene.
  - `bitrix-code-review` — Universal D7 code quality, security (CSRF/XSS/SQLi/RBAC), cache safety, and Fail-Closed review contract.
  - `bitrix-ecommerce-crm-patterns` — Store/Catalog/Sale/CRM D7 patterns, stock reservations & realizations, multicurrency, user-contact sync, 1C exchange safety.
  - `bitrix-deploy-and-uat` — Release planning, Git safety checkpoints, BitrixVM/Redis/OPcache/Composite deploy hygiene, and UAT checklists.
- **2 Specialized Subagents**: `bitrix-architect-reviewer`, `bitrix-codebase-mapper`.
- **4 Zero-Dependency CLI Tools (Node.js 18+)**:
  - `scripts/bitrix-project-scan.mjs` — Fast structural Bitrix scanner.
  - `scripts/bitrix-dashboard-data.mjs` — Real JSON collector for Dashboard v2.1 (with auto-integration of `bitrix-qa-preflight.mjs`).
  - `scripts/bitrix-dashboard-render.mjs` — Deterministic HTML/JS Dashboard v2.1 renderer (`--mode artifact` for Side Pane and `--mode webview` for the Antigravity IDE Activity Bar extension).
  - `scripts/bitrix-bootstrap.mjs` — One-command new/existing project initializer (`.agents/plugins.json`, `.gitignore`, `AGENTS.md`, `docs/memory/*`, `docs/backlog.md`).
- **7 Scaffolding Templates**: `templates/` (`AGENTS.project.md`, `memory-*.md`, `backlog.md`, `daily-log.md`).

---

## Installation

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\antigravity-bitrix-core\install.ps1
```

### Linux / macOS
```bash
bash ./antigravity-bitrix-core/install.sh
```

---

## License

MIT License — see [LICENSE](LICENSE).
