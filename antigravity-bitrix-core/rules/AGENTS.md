# 1C-Bitrix D7 Core & Central Orchestrator Rules (Always Active)

When working in any 1C-Bitrix project with `antigravity-bitrix-core` enabled, always enforce these standards:

## 1. Fast Grounding & Zero-Hallucination Protocol

- **Start every session with Canonical Project Memory**: Check `AGENTS.md`, `docs/memory/{README,codemap,decisions,status}.md`, and `docs/backlog.md` before proposing architecture or writing code.
- **Unmapped Project Trigger**: If this is a 1C-Bitrix project without `docs/memory/`, proactively offer `bitrix-project-init` (branching Greenfield/Brownfield interview + codebase scan + legacy-style capture).
- **Deterministic Facts First**: Verify real file paths, classes, iblock/property IDs, and method signatures via tools/scripts before referencing or editing them.

## 2. Official Documentation & MCP Verification

- **Bitrix24 REST / CRM / Events**: Query **`b24-dev-mcp`** (`bitrix-search`, `bitrix-method-details`, `bitrix-event-details`, `bitrix-article-details`).
- **1C-Bitrix D7 Core**: Verify against official docs (`dev.1c-bitrix.ru`, `docs.1c-bitrix.ru`) or read-only inspection of `/bitrix/modules/` when present locally.
- **Live UI / QA / Analytics**: Use **`chrome-devtools-mcp`** or the `browser` subagent.

## 3. Smart Orchestration, Cock-up Prevention & Quality Discipline

- **Cock-up Prevention Gate ("Не херню ли я делаю?" — All Levels)**: Applies to the main agent, orchestrator, subagents, and nested subagents of any depth. NEVER start non-trivial work without: (1) a tracked task ID/fixation, (2) clear description, (3) business value, and (4) an explicit Acceptance Checklist (DoD). Pause at logical milestones to verify *"Am I still solving the real goal or drifting?"* — if the goal/scope needs correction, stop and align with the operator before continuing. Pass this gate verbatim into every delegated subagent prompt.
- **Checklist = Done & Scope Triage**: Every task closes ONLY when 100% of its Acceptance Checklist is checked `[x]` and actual time (`Actual`) is logged against the estimate (`Est`). Newly discovered nuances follow Scope Triage: trivial (`<= 15 min`, in-place) -> fix now; medium related -> add to current task checklist; large/separate -> log as a new backlog task with its own checklist and estimate.
- **Anti-Busywork & 2-Scale Priority**: Prioritize via **Scale 1 (Eisenhower `Q1–Q4`: Important × Urgent)** + **Scale 2 (Complexity `S/M/L/XL` + `Est` hours)** + ICE; never propose work without clear business value and project evidence.
- **Optimal Live Quota-Aware Model & Tool Routing**: Use `bitrix-orchestrator` when coordinating multi-track work — resolve live models & quotas via `swarm(action="models", all=true)` (never recommend `0%`-quota families as primary), match reasoning effort (`Low/Medium/High/XHigh`) to task complexity, and map subagents to `flash_lite`/`flash`/`inherit`/`pro` with independent reviewers (`bitrix-architect-reviewer`, `bitrix-qa-verifier`, `bitrix-seo-auditor`).
- **Permissions & Blast-Radius Boundary**: Respect `.agents/permissions.json` (axes: `outside_workspace`, `internet`, `terminal`, `ssh`, `database`, `deploy`) at every agent/subagent level. Never exceed declared read/write/deploy boundaries without explicit operator confirmation.
- **Anti-Loop & Strategic Compaction**: Cap retries at 3 attempts before escalating with diagnosis; suggest `/compact` at clean phase boundaries (never mid-edit).
- **Fail-Closed Verification**: Never report `PASS` or `DONE` if syntax checks (`php -l`, `node --check`) or targeted tests failed or could not run.

## 4. Bitrix D7 Golden Standards

- **D7 Priority & `/local/` Isolation**: Use D7 ORM/APIs (`Bitrix\Main\*`, `Iblock`, `Catalog`, `Sale`, `Crm`, `Highloadblock`). Never modify `/bitrix/` core; all custom code lives in `/local/`.
- **Clean Assets & Cache Safety**: No inline `<style>`/`<script>` (except JSON-LD); use `Asset::getInstance()`. Forward SEO/uncached keys via `SetResultCacheKeys()` into `component_epilog.php`.
- **Clean 404s**: Use `$APPLICATION->RestartWorkarea()` (never `RestartBuffer()`) before `Tools::process404()`.
- **Security & BitrixVM Hygiene**: Prefer D7 `\Bitrix\Main\Web\HttpClient` (no `php-curl` needed), enforce `check_bitrix_sessid()` / RBAC / `htmlspecialcharsbx()`, and NEVER commit tokens, passwords, or Service Account JSON to Git (store in `b_option`).
- **Code Quality**: PSR-12, `declare(strict_types=1);`, SOLID, DRY, typed signatures, explicit `try/catch`.

## 5. Lifecycle & Mandatory Memory Sync

1. **Plan & Approval**: Present a step-by-step plan/Mermaid flow before non-trivial changes; create a Git checkpoint before risky refactors/migrations.
2. **Verify & Sync**: After every completed testable task, update `docs/daily/DD.MM.YY.md`, local `README.md`, `docs/memory/{status,codemap,decisions}.md`, and `docs/backlog.md`, and provide a concise manual UAT checklist.
