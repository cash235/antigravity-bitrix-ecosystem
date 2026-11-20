---
name: bitrix-code-review
description: >
  Universal 1C-Bitrix D7 code review checklist covering D7 compliance, /local/ isolation, security
  (CSRF, XSS, SQL injection, RBAC, secret hygiene), component cache safety, clean assets, error
  handling, and database query performance.
---

# Universal 1C-Bitrix D7 Code Review Checklist

Run this audit before shipping or committing any non-trivial Bitrix change (or delegate to `bitrix-architect-reviewer`).

## 1. Architecture & Standards
- [ ] Zero modifications under `/bitrix/`; all custom code resides in `/local/`.
- [ ] Matches approved plan, project ADRs (`docs/memory/decisions.md`), and Red Lines (`docs/memory/status.md`).
- [ ] Uses D7 APIs (`Loader::includeModule`, `DataManager` ORM, `EventManager`, `Asset::getInstance()`, `HttpClient`, `Option`).
- [ ] `declare(strict_types=1);`, PSR-12 formatting, typed parameters/returns, DRY & SOLID separation.
- [ ] User-facing phrases in reusable components extracted to `/lang/<lid>/` where applicable.

## 2. Security (OWASP + Bitrix Specifics)
- [ ] **Auth & RBAC**: Admin/manager pages and AJAX controllers verify `$USER->IsAuthorized()` and exact user group / permission checks (never rely only on UI hiding).
- [ ] **CSRF**: State-changing POST/AJAX endpoints validate `check_bitrix_sessid()` (public anonymous beacons/webhooks must strictly validate payload types/lengths and origin/rate expectations).
- [ ] **SQL Injection**: All ORM filters typed; any raw SQL uses `$connection->getSqlHelper()->forSql()` or integer casts `(int)` — zero raw `$_GET`/`$_POST` interpolation.
- [ ] **XSS**: All dynamic HTML output escaped via `htmlspecialcharsbx()` (PHP) and `esc()` / `textContent` (JS).
- [ ] **Secrets**: Zero API tokens, passwords, private keys, or Service Account JSON committed in code or templates (use `b_option` or external server config).

## 3. Caching, Assets & Lifecycle
- [ ] No `$APPLICATION->SetTitle()`, `SetPageProperty()`, `AddHeadString()`, or uncached user state solely inside cached `template.php` (use `SetResultCacheKeys()` + `component_epilog.php`).
- [ ] No `$APPLICATION->RestartBuffer()` paired with `Tools::process404()` (must use `RestartWorkarea()`).
- [ ] No inline `<style>` or `<script>` blocks in PHP files (except JSON-LD).
- [ ] Auto-Composite compatibility preserved: no per-user PHP output leaked into cached composite HTML without dynamic areas (`createFrame()`) or client-side JS checks.

## 4. Reliability & Performance
- [ ] No N+1 queries inside loops (batch-load by IDs or join via ORM `runtime` fields).
- [ ] Explicit `select` fields (avoid unbounded `select => ['*']` on large catalog/CRM tables).
- [ ] External HTTP/API calls have explicit timeouts, graceful error handling (`try/catch`), and caching where appropriate.
- [ ] Multi-step DB / Catalog / CRM mutations handle partial failures cleanly without leaving inconsistent stock or orphan records.

## 5. Automated Checks, Fail-Closed Verdict & 5-Axis Self-Check
```bash
php -l <modified-php-files>
node --check <modified-js-files>
```

### Fail-Closed Review Contract
Assign an explicit verdict — **never output `APPROVE` if any required check failed to execute**:
- **`APPROVE`**: 0 `CRITICAL`, 0 `HIGH`, all automated syntax/smoke checks executed and passed.
- **`APPROVE WITH COMMENTS`**: Only `MEDIUM`/`LOW` nits; all checks passed.
- **`CHANGES_REQUESTED`**: Any `HIGH` issue or failed test/lint.
- **`BLOCK`**: Any `CRITICAL` security, data-loss, or core-modification issue.
- **`INCOMPLETE`**: A required check could not run (state what failed and what manual confirmation is needed).

Before delivering the final review or implementation, run a quick **5-Axis Self-Check** (`Accuracy`, `Completeness`, `Clarity`, `Actionability`, `Conciseness` — cite concrete evidence for any gap).
