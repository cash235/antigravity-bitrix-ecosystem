---
name: bitrix-regression-tests
description: >
  Practical regression and smoke testing workflow for 1C-Bitrix D7 projects: prove-the-bug-first
  defect workflow, standalone PHP CLI smoke tests for D7 service/API classes, live HTTP/AJAX
  contract verification, and repeatable UAT checklists.
---

# 1C-Bitrix Practical Regression & Smoke Testing

Most 1C-Bitrix projects do not have an isolated test MySQL container locally. This skill provides high-signal, practical verification that catches real regressions without fragile DB mocks.

## 1. Prove-the-Bug-First Rule (For Defect Fixes)
1. Reproduce the failure deterministically before editing code (CLI script, `php` test snippet in scratch dir, HTTP response check, or exact click-path trace).
2. Implement the minimal surgical fix.
3. Re-run the exact reproduction check to prove **Red → Green**, then run syntax + adjacent regression checks.

## 2. 4-Layer Bitrix Verification Pyramid
1. **Static Syntax & Lint (Every Edit)**:
   - `php -l <every-modified-php-file>`
   - `node --check <every-modified-js-file>`
   - `node scripts/bitrix-qa-preflight.mjs .`
2. **Standalone PHP CLI Unit/Contract Smoke Tests (Pure D7 Services & API Clients)**:
   - Place temporary verification scripts in the conversation scratch directory (never commit test secrets or scratch files to the repo).
   - Test pure logic (price/currency math, date clamping, JSON-LD builders, API client parsing, `HttpJsonClient` fallback) directly with `php <scratch-test.php>`.
3. **Live HTTP & Endpoint Contract Checks**:
   - Verify status codes (`200`, `301`, `404` on phantom `PAGEN_1=9999`), headers (`Content-Type`, no `PHPSESSID` on cached anonymous GET, no `:443` redirect leak), and safe read-only AJAX responses.
4. **Structured Manual UAT Scenario**:
   - Always supply a 4–6 step manual UAT checklist covering: preconditions (`Ctrl+F5` / `?clear_cache=Y`), primary happy path, invalid-input error path, mobile viewport, and secondary multisite domain (if applicable).
