---
name: bitrix-click-path-audit
description: >
  Behavioral Click-Path & State-Conflict Audit for 1C-Bitrix frontends (JS, AJAX, BX.addCustomEvent,
  smart filters, modals, consent checkboxes, and /manager/ dashboards). Traces every button/touchpoint
  through its complete handler chain to catch silent state resets, async race conditions, and double
  analytics/AJAX firing.
---

# 1C-Bitrix Click-Path & State-Conflict Audit

Use this skill when static debugging finds no syntax errors yet users report "broken buttons", flickering UI, stale filter results, double form submissions, or duplicate analytics events.

## 1. Common Bitrix Click-Path Bug Patterns
1. **Sequential Undo**: Handler A opens a modal or checks a consent box, then Bitrix core `user_consent.js` or a secondary listener silently resets it back.
2. **Async Fetch Race (Missing `AbortController`)**: User clicks Filter A then rapidly clicks Filter B; slower Response A arrives second and overwrites Filter B's UI!
3. **BX Composite / AJAX Re-render Lost Listeners**: `BX.ajax` replaces a DOM container, detaching direct `addEventListener` bindings instead of using delegated listeners (`document.addEventListener`).
4. **Duplicate Analytics / Beacon Firing**: Both GTM and direct `gtag.js` fire `page_view`, or an unguarded `detail`/`view_item` hook fires twice on modal/tab transitions.
5. **Double Submit on Slow Network**: Submit button is not disabled during async `fetch('/local/ajax/order.php')`, creating duplicate CRM deals/orders.

## 2. Step-by-Step Audit Method
For every interactive touchpoint (`button`, `checkbox`, `select`, `form`, `tab`) in scope:
1. **Identify all listeners**: Find inline handlers, `addEventListener`, jQuery `.on()`, and `BX.addCustomEvent` attached to the element or its ancestors.
2. **Trace state mutations in order**: List every DOM attribute, JS `state.*` field, `localStorage`/cookie, and `fetch`/`sendBeacon` call executed in sequence.
3. **Check for conflicts**:
   - Does step N undo step N-1?
   - Can rapid double-clicks trigger race conditions?
   - Does the final visible UI match what the button label promises?
   - Are error/loading/empty states handled cleanly?
4. **Output**: Compact table of `Touchpoint | File:Line | State Sequence | Conflict/Risk | Concrete Fix`.
