---
name: bitrix-memory-governance
description: >
  Project memory, Architecture Decision Records (ADR), daily changelogs, module READMEs, and
  backlog governance for long-lived 1C-Bitrix projects. Prevents documentation rot and context loss
  between sessions.
---

# Bitrix Living Memory, Documentation & Backlog Governance

## 1. Canonical Project Memory Structure
Every initialized 1C-Bitrix project maintains a compact, authoritative memory tree:

| File | Role | When to Update |
|---|---|---|
| `AGENTS.md` (root) | 15–30 line fast-grounding pointer + critical project invariants | Only when core project invariants or memory paths change |
| `docs/memory/README.md` | Master index linking all memory files, ADRs, and key docs | When adding a new ADR or major subsystem |
| `docs/memory/codemap.md` | Single Source of Truth for sites (`SITE_ID`), `/local/` classes, iblocks, HL-blocks, routes, integrations, and diagrams | Whenever classes, iblocks, properties, routes, or integrations are added/renamed |
| `docs/memory/decisions.md` | Index table + detailed ADR cards (Michael Nygard format) | Whenever a non-trivial architectural decision, constraint, or tradeoff is accepted |
| `docs/memory/status.md` | Active focus, chronological table of completed tasks, and **Red Lines** | After **every** completed testable task |
| `docs/backlog.md` | Prioritized task queue (`Ближайший спринт` / `В очереди` / `Техдолг и идеи`) with stable IDs `#001..#NNN` | When completing a task, discovering tech debt, or capturing new operator requests |
| `docs/daily/DD.MM.YY.md` | Detailed daily changelog of exact changes, root causes, and files touched | After **every** completed testable task |
| `<module>/README.md` | Local module/directory documentation (files, purpose, dependencies, data flow, AJAX contract) | Whenever creating or materially changing a module/component |

---

## 2. ADR Standard (Michael Nygard)
Every decision in `docs/memory/decisions.md` MUST include:
1. Entry in the top **ADR Index Table** (`ADR-NN | Title | Category | Status | Date`).
2. Full card with 4 mandatory sections:
   - **Контекст (Context)**: What problem or constraint forced a decision?
   - **Решение (Decision)**: What concrete architecture was chosen?
   - **Отклонённые альтернативы (Rejected Alternatives)**: What else was considered and *why* it was rejected (prevents future sessions from re-proposing bad ideas!).
   - **Последствия и риски (Consequences)**: Tradeoffs and maintenance guardrails.

---

## 3. Maintenance Protocol (Mandatory Task Closure Checklist)
**Rule: Checklist 100% `[x]` + `Actual` time logged = Task Done.** Never declare a non-trivial task complete until:
1. Every item in the task's **Acceptance Checklist (DoD)** in `docs/backlog.md` is verified and checked `[x]` (newly found nuances routed via Scope Triage: inline `<= 15m` / added to current checklist / new backlog task with its own checklist and `Est`).
2. **Actual time (`Actual`)** is recorded next to `Est` in `docs/backlog.md` and `docs/daily/DD.MM.YY.md`.
3. `docs/daily/DD.MM.YY.md` records what changed, why, and session duration.
4. Affected directory `README.md` is created or updated.
5. `docs/memory/status.md` includes the completed task (`Est / Actual`) in Recent Changes.
6. `docs/memory/codemap.md` and `docs/memory/decisions.md` are synced (if structure or architecture changed).
7. Manual UAT steps are provided to the operator.

---

## 4. Preventing Context Bloat
- Never copy generic 1C-Bitrix framework rules into project `AGENTS.md` — they live globally in `antigravity-bitrix-core`.
- Keep `AGENTS.md` short and factual; keep deep details in `docs/memory/` and local module `README.md` files.
- Never let `docs/memory/codemap.md` contain guessed IDs or unverified classes — mark unknowns explicitly until verified.
