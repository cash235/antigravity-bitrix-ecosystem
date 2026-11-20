# antigravity-bitrix-qa

**Dedicated QA, Live Browser Visual Testing, Click-Path State Auditing & Pre-Launch Production Readiness Plugin for 1C-Bitrix Projects in Google Antigravity IDE.**

Designed to pair cleanly with **`antigravity-bitrix-core`** (Central Orchestrator) while staying completely modular — enable it whenever testing, pre-release auditing, or fixing tricky frontend/AJAX state bugs.

---

## Bundle Contents

- **Always-On QA Rules**: `rules/AGENTS.md` (Read-Only-by-Default browser safety, Fail-Closed verdicts, zero secret exposure)
- **4 Modular Skills**:
  - `bitrix-browser-qa` — Live visual, console, network, form, and CWV (`LCP`/`CLS`/`INP`) testing across `375px / 768px / 1440px`.
  - `bitrix-click-path-audit` — Traces interactive Bitrix buttons, modals, filters, and AJAX handlers end-to-end to uncover silent state cancellations, async races, and double-firing events.
  - `bitrix-production-audit` — Local-evidence pre-launch triage (*"What breaks in production?"*): RBAC, CSRF, secrets, migrations/rollback, 1C/payment webhooks, mobile UX, BitrixVM hygiene.
  - `bitrix-regression-tests` — Practical PHP CLI smoke tests, HTTP/AJAX contract verification, and prove-the-bug-first regression workflow.
- **1 Specialized Subagent**: `bitrix-qa-verifier` (independent Fail-Closed QA auditor).
- **1 Zero-Dependency CLI Scanner**: `scripts/bitrix-qa-preflight.mjs` (Node.js 18+ static scan for leaked secrets, SQL interpolation, unchecked AJAX endpoints, debug leftovers, and `RestartBuffer` 404 traps).

---

## Installation

```powershell
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File .\antigravity-bitrix-qa\install.ps1
```

```bash
# Linux / macOS
bash ./antigravity-bitrix-qa/install.sh
```

---

## CLI Usage

```bash
node scripts/bitrix-qa-preflight.mjs /path/to/bitrix-project
node scripts/bitrix-qa-preflight.mjs /path/to/bitrix-project --json
```

---

## License

MIT License — see [LICENSE](LICENSE).
