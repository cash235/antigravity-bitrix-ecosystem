---
name: bitrix-browser-qa
description: >
  Automated live visual, console, network, responsive (375/768/1440px), and Core Web Vitals
  testing for 1C-Bitrix sites and admin cabinets via Antigravity browser subagent / chrome-devtools-mcp.
  Read-only by default with explicit blast-radius protection and Fail-Closed verdicts.
---

# 1C-Bitrix Live Browser Visual & Interaction QA

Use this skill after deploying changes to staging/production or before launching a new Bitrix template, filter, checkout modal, or `/manager/` page.

## 1. Blast-Radius Safety Rule (Mandatory)
- **Read-Only by Default**: NEVER submit real checkout orders, trigger real payments, delete CRM deals, or modify warehouse stock on a **production** URL.
- Mutating flows require BOTH a **staging/test URL** AND **explicit operator opt-in**, using test credentials only. Redact any sensitive data from screenshots.

## 2. 4-Phase Bitrix Browser QA Protocol

### Phase 1 — Smoke, Console & Network
1. Open target URLs via the `browser` subagent (homepage, catalog section, product/service detail, search, contacts, `/manager/` page if in scope).
2. Capture console errors (distinguish real app JS errors from blocked third-party adblock noise).
3. Verify zero `4xx`/`5xx` network responses (check AJAX endpoints, CSS/JS assets, images/WebP).
4. Check Core Web Vitals signals (`LCP < 2.5s`, `CLS < 0.1`, `INP < 200ms`).

### Phase 2 — Responsive Breakpoints (`375px`, `768px`, `1440px`)
1. Test mobile (`375px`), tablet (`768px`), and desktop (`1440px`).
2. Flag horizontal overflow (`document.documentElement.scrollWidth > window.innerWidth`), clipped tables, overlapping sticky call bars vs Cookie Consent banners, or unusable mobile menus/filters.

### Phase 3 — Bitrix Interactive Surfaces (Read-Only Safe Checks)
1. **Catalog Smart Filter & Search**: Apply filter/search query → verify results update cleanly with valid URL and zero JS errors.
2. **Product / Service Buy Block**: Open quick-order / request modal → verify validation on empty/invalid phone → close modal cleanly without submitting on prod.
3. **Consent Checkboxes**: Verify mandatory personal-data checkbox is NOT pre-checked, optional marketing checkbox works independently, and legal modal opens cleanly.
4. **Manager / Admin Tables**: Switch tabs, filters, tooltips, and verify no horizontal scroll breaks.

### Phase 4 — Accessibility Basics
- Verify `<h1>` count (`=== 1`), non-empty `alt` on images, `aria-label` on icon-only links (`tel:`, messengers, auth), and keyboard focus visibility.

## 3. Fail-Closed Verdict Format
- **`SHIP`**: 0 console errors, 0 broken network requests, 0 layout overflows across 375/768/1440px.
- **`SHIP WITH FIXES`**: Minor visual/a11y nits, zero functional blockers.
- **`DO NOT SHIP`**: Any broken core user flow, 500 error, horizontal mobile breakage, or JS crash.
- **`INCOMPLETE`**: Target unreachable, auth blocked, or required breakpoint skipped.
