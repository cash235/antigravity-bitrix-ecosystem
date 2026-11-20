---
name: bitrix-production-audit
description: >
  Local-evidence Pre-Launch & Post-Merge Production Readiness Audit for 1C-Bitrix sites ("What could
  break in prod?"). Inspects security/RBAC, secret hygiene, DB/iblock migrations & rollback,
  payments/1C webhooks, Composite/Redis/OPcache, mobile forms, and BitrixVM server hygiene without
  uploading repo data externally.
---

# 1C-Bitrix Production Readiness Audit ("What Breaks in Prod?")

Run this skill before launching a new 1C-Bitrix store, after a major merge, or when asked *"is this ready to ship?"*.

## 1. Deterministic Local Evidence First
Run both read-only checks before inspecting code manually:
```bash
node ~/.gemini/config/plugins/antigravity-bitrix-qa/scripts/bitrix-qa-preflight.mjs .
git status --short --branch
git log --oneline -10
```

## 2. 5 Production Risk Lenses for 1C-Bitrix

### Lens 1 — Security, Auth & Secrets
- Public storefront vs `/manager/` / admin AJAX routes strictly separated with server-side `$USER->IsAuthorized()` and group checks (`in_array(1, ...)`).
- State-changing endpoints enforce `check_bitrix_sessid()`; zero raw `$_GET`/`$_POST` inside SQL.
- Zero OAuth tokens, Service Account JSON keys, DB passwords, or `.env` files committed in Git (stored in `b_option` or outside VCS).
- Staging/test domains protected by access guard (`Disallow: /` in `robots.txt`, no production analytics/webhooks).

### Lens 2 — Data, Stock & Migration Integrity
- Schema/iblock migrations are idempotent (`IF NOT EXISTS`) and have a documented rollback plan.
- Stock reservations, deductions, and CRM realizations are idempotent (no double-deduction on retry/refresh).
- Base kernel currency (`b_currency.BASE = 'Y'`) untouched; monetary values rounded cleanly to 2 decimals.

### Lens 3 — External APIs, Payments & 1C Webhooks
- All external HTTP calls use BitrixVM-safe `\Bitrix\Main\Web\HttpClient` (`useCurl => false`) with explicit timeouts and `try/catch` fallbacks.
- Payment/delivery webhooks verify signatures and handle duplicate/out-of-order deliveries idempotently.

### Lens 4 — BitrixVM Operations & Caching
- `RestartWorkarea()` used on 404 (never `RestartBuffer()`).
- Auto-Composite cache excludes `/bitrix/*`, `/manager/*`, `/personal/*`, `/auth/*`, `/local/*`, `/crm/*`.
- File ownership on Linux BitrixVM stays strictly `bitrix:bitrix`; agents run via cron (`check_agents = N`).

### Lens 5 — Launch-Critical UX (Desktop + Mobile)
- Key money paths (catalog → filter → product card → quick order/cart → contacts) work on `375px` mobile without overlap, horizontal scroll, or broken consent checkboxes.
- Clear loading, empty, and validation-error states on every form.

## 3. Output: Ship / Block Decision
Produce a concise risk table (`CRITICAL` / `HIGH` / `MEDIUM` with exact `file:line` and concrete fix) ending with an explicit **Ship / Block** recommendation.
