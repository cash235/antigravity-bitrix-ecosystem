# Changelog

All notable changes to the **1C-Bitrix Antigravity Ecosystem** are documented in this file.

## [v3.0.0] - 2026-11-24

### Added (Sprint 7: Marketing v2.0, Auto-Stack Detection, SHA-256 Lock & Prompt-Injection CI — 100% Roadmap Complete!)
- **`PLUGIN-015` — `antigravity-bitrix-marketing` v2.0.0**:
  - Added **`bitrix-landing-audit`** (39-point landing/product/checkout conversion audit matrix for 1C-Bitrix).
  - Added **`bitrix-paid-ab-analytics`** (CPA/ROAS & wasted spend diagnostics for Yandex.Direct/Google Ads, Composite-safe A/B test rigor, plain-language owner reports with confirm-gate).
  - Enhanced `bitrix-growth-strategist` with **AI Brand Visibility / Citation Gap** synergy (`bitrix-seo-content-gaps`) and Structured Verdict Contract.
- **`PLUGIN-016` — Auto-Stack Detection, SHA-256 Lockfile & Skill Security CI**:
  - `bitrix-bootstrap.mjs` now auto-detects 1C-Bitrix stack (`sale/catalog`, `crm`, `1C`, multisite, templates) with `--profile auto` & `--dry-run`, and writes deterministic **`.agents/plugins-lock.json`** (SHA-256 bundle hashes).
  - `bitrix-dashboard-data.mjs` + `bitrix-dashboard-render.mjs` verify live SHA-256 integrity (`SHA-256 Lock: OK`).
  - Added zero-npm **`scripts/skill-security-scan.mjs`** (Prompt-Injection, pipe-to-shell, encoded PowerShell, Trojan Source BiDi, covert exfiltration scanner) wired into `.github/workflows/ci.yml`.

## [v2.7.0] - 2026-11-24

### Added (Sprint 6: Next-Gen Orchestration & Memory v2.0)
- **`PLUGIN-013` — Beads + Ralph-Loop + Git Worktree Isolation + Typed Contracts**:
  - Upgraded `bitrix-orchestrator` with atomic Bead decomposition (`15–45 min`), 3-iteration Fail-Closed Ralph-Loop, isolated Git worktree / human-gated merge protocol, and unified `Marvin`-style JSON contracts.
  - Embedded unified **Structured Verdict Contract (`schemaVersion: "1.0"`)** across all 5 review subagents (`bitrix-architect-reviewer`, `bitrix-qa-verifier`, `bitrix-seo-auditor`, `bitrix-schema-validator`, `bitrix-design-director`).
  - Added live **Git Worktrees** & **Ralph-Loop Pipeline Telemetry** block on the «Git и /local/» Dashboard tab.
- **`PLUGIN-014` — Memory v2.0 (`manifest.json`, Local Memory Search & Antigravity Hooks)**:
  - Introduced `docs/memory/manifest.json` separating template infrastructure files from user-owned memory (safe `--update-config` upgrades in `bitrix-bootstrap.mjs`).
  - Added zero-npm `antigravity-bitrix-core/scripts/bitrix-memory-search.mjs` (`--brief` session startup digest + ranked full-text search across `docs/memory/`, `docs/daily/`, ADR).
  - Added Antigravity lifecycle hooks (`antigravity-bitrix-core/hooks/hooks.json` + `scripts/bitrix-hook-runner.mjs`: `/bitrix/` core isolation PreToolUse guard, PostToolUse syntax check, PreCompact state snapshot).

## [v2.6.0] - 2026-11-24

### Added (Sprint 5: `antigravity-bitrix-seo-geo` v3.0.0 & New 5th Plugin `antigravity-bitrix-design` v1.0.0)
- **`PLUGIN-011` — `antigravity-bitrix-seo-geo` v3.0.0**:
  - New skills: **`bitrix-seo-agentic`** (Lighthouse Agentic Browsing, WebMCP contracts, `/llms.txt` + `/llms-full.txt`), **`bitrix-seo-local`** (`b_catalog_store` branch pages, NAP, Yandex.Business / 2GIS / GBP + confirm-gated review triage), and **`bitrix-seo-content-gaps`** (SXO semantic clusters, demand-vs-supply content gap graph, smart-filter cannibalization & programmatic SEO).
  - Hardened live scripts (`fetch-seo.mjs`, `geo-check.mjs`, `seo-drift.mjs`) with zero-npm **SSRF & Egress Guard** (`scripts/ssrf-guard.mjs`: blocks private/loopback/6to4/cloud metadata endpoints, validates DNS + every redirect hop, redacts credentials in URL/proxy errors).
- **`PLUGIN-012` — New 5th Plugin `antigravity-bitrix-design` v1.0.0**:
  - Dedicated Design Engineering & Anti-AI-Slop plugin combining `tasteskill.dev` / `Leonxlnx/taste-skill` and `emilkowalski/skills` practices for 1C-Bitrix D7 templates and `/manager/` cabinets.
  - 3 new skills (**`bitrix-design-taste`**, **`bitrix-motion-craft`**, **`bitrix-visual-gate`**), 1 subagent (**`bitrix-design-director`** with Cock-up Prevention Gate), and zero-npm CLI **`scripts/bitrix-design-gate.mjs`** (`--deal` deterministic art direction + Fail-Closed static visual/motion gate `GATE: PASS / FAIL / SETUP`).
  - Integrated across `install-ecosystem`, `init-bitrix-project`, `bitrix-bootstrap.mjs`, Dashboard (`5-Plugin Ecosystem`), IDE sidebar (`Плагины (5)`), and GitHub Actions CI.

## [v2.5.0] - 2026-11-24

### Added (Sprint 4: Live Anonymized Skill Collector & 1-Click GitHub PR Center)
- **`PLUGIN-001` — Live Anonymized Skill Collector (`antigravity-bitrix-core/scripts/bitrix-skill-collector.mjs`)**: stores project-discovered reusable 1C-Bitrix patterns (PHP 8.4, migrations, D7 fixes) in `.agents/learned-skills/*.md` with human-readable summaries, categories, and target plugin routing.
- **Fail-Closed PII & Secret Sanitizer**: 10 deterministic blocking/redaction detectors (PEM private keys, GitHub/OpenAI/Google/AWS/Slack/Yandex/JWT tokens, hardcoded credentials, connection strings, SSH targets, real emails, phone numbers, local user paths, server IPs, client domains, and prompt-injection patterns) with zero false positives on clean Bitrix D7 code.
- **Dashboard Tab «Навыки и PR» + IDE PR Gate**: interactive tab to capture new patterns, review sanitized content previews, toggle include/exclude checkboxes, run 1-click auto-redaction, delete entries, copy sanitized bundles, and submit confirmed Pull Requests to `cash235/antigravity-bitrix-ecosystem` (hard-blocked when any selected skill fails Sanitizer).

## [v2.4.0] - 2026-11-24

### Added (Sprint 3: 10-Block CMS Readiness Master Checklist, Release Tooling & Full Sprint Roadmap)
- **`PLUGIN-005` — 10-Block 1C-Bitrix CMS Readiness Master Checklist**: zero-dependency generator & local auto-inspector (`antigravity-bitrix-core/scripts/bitrix-cms-checklist.mjs`) tailored to 5 project archetypes (`store`, `crm_b24`, `services`, `corporate`, `minimal`), covering Environment/Cron, `main`, `iblock`, `catalog/currency`, `sale`, Payments/Delivery, `b_event` Mail/SMS, Production Audit, SEO/GEO, and Read-Only Browser QA (`375/768/1440px`). Interactive Dashboard editor on «Знания и CMS» tab with live status toggles, archetype switching, 1-click block audit prompts, and direct saving to `docs/memory/cms-checklist.json`.
- **`PLUGIN-017` — Release Automation & In-Dashboard Changelog**: zero-dependency `scripts/prepare-release.mjs` (`--dry-run` / `--json` / `--out`) validating version consistency and generating GitHub Release notes, plus «История версий (Changelog)» viewer in the Dashboard and version feature table in `README.md`.
- **Full Sprint Roadmap & Visual Controls**: Dashboard and IDE Activity Bar sidebar now display all sprints (completed, active, planned) with date windows (`startDate → projectedDeadline`), per-sprint task lists, visual `.agents/permissions.json` & `velocity.json` editors, progress bars, and Russian UI localization.

## [v2.3.0] - 2026-11-24

### Added (Sprint 2: Permissions Matrix, Adaptive Sprints/Velocity & Setup UX)
- **`PLUGIN-010` — Project Permissions & Blast-Radius Policy (`.agents/permissions.json`)**: 6-axis boundary control (`outside_workspace`, `internet`, `terminal`, `ssh`, `database`, `deploy`) with `safe_default`, `local_dev`, and `staging_full` profiles, enforced in `rules/AGENTS.md`, scaffolded by `bitrix-bootstrap.mjs`, and displayed in the Dashboard ("Плагины и Границы") + IDE sidebar.
- **`PLUGIN-006` — Operator Velocity Tracker & Adaptive Sprint Deadlines**: auto-observes `docs/memory/velocity.json`, `docs/daily/*.md`, 28-day `git log` active days/sessions, and `Actual/Est` calibration factor to project realistic sprint capacity & deadlines in the Dashboard.
- **`PLUGIN-003` — Auto-Deactivation of Completed One-Time Actions**: once a project has `.agents/plugins.json` and canonical memory, init buttons in the IDE sidebar and Dashboard automatically switch to a quiet "Настроено · Профиль" status.
- **`PLUGIN-004` — Step-by-Step Setup Pipeline**: 6-step deterministic onboarding stepper on the main Dashboard tab that auto-collapses to a single summary bar once all 6 steps pass.

## [v2.2.0] - 2026-11-24

### Added (Sprint 1: Governance, Cock-up Prevention & 2-Scale Priorities)
- **`PLUGIN-007` — Multi-Level Cock-up Prevention Gate**: embedded mandatory `Pre-Flight` / `Mid-Flight` / `Pre-Close` sanity checks and goal-recalibration rules across `antigravity-bitrix-core/rules/AGENTS.md`, `bitrix-orchestrator/SKILL.md`, and **all 6 subagents** across the 4 plugins (with mandatory inheritance into nested subagents of depth 2+).
- **`PLUGIN-008` — Rich Task Standard (North Star + Business Value + Acceptance Checklist = DoD + Scope Triage + `Est/Actual`)**: upgraded `templates/backlog.md`, `templates/memory-status.md`, `templates/daily-log.md`, `bitrix-memory-governance`, `bitrix-project-init`, `bitrix-bootstrap.mjs`, and `bitrix-dashboard-data.mjs` (`schemaVersion 2.2`).
- **`PLUGIN-009` — 2-Scale Priority Matrix (`Q1–Q4` Eisenhower × `S/M/L/XL` Complexity & Hours)**: added interactive quadrant & complexity filters, checklist progress bars, North Star card, and `Est / Actual` tracking to `bitrix-dashboard-render.mjs` in native Antigravity IDE styling.

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
