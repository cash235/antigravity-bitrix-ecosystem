---
name: bitrix-visual-gate
description: >
  Fail-Closed Visual Finish Gate & Break-UI stress testing for 1C-Bitrix templates and webviews.
  Combines deterministic static design linting (scripts/bitrix-design-gate.mjs) with live 1440px
  and 390px viewport verification (overflow, overlap, contrast, broken images, long-text stress)
  ending on a single verdict: GATE: PASS, GATE: FAIL, or GATE: OPEN (max 3 rounds).
---

# 1C-Bitrix Fail-Closed Visual Finish Gate (`bitrix-visual-gate`)

Adapted from `tasteskill.dev` (`gate.mjs`) and `emilkowalski/skills` (`break-ui`). Run this gate before closing ANY template, component CSS, landing page, or `/manager/` UI task.

---

## Phase 1: Deterministic Static Design & Motion Gate (CLI)

Run the zero-dependency static gate on the workspace or target template folder:

```bash
node ~/.gemini/config/plugins/antigravity-bitrix-design/scripts/bitrix-design-gate.mjs <project-or-template-dir>
```
*(Add `--json` for machine-readable output.)*

Checks:
- Inline `<style>` / `<script>` tags inside PHP templates (violates `Asset::getInstance()`).
- Missing `<meta name="viewport">` in `header.php`.
- Layout-thrashing CSS (`transition: all`, animating `width`/`height`/`top`/`left`/`margin`).
- Missing `@media (prefers-reduced-motion: reduce)` when animations/transitions exist.
- AI-slop placeholders (`Lorem ipsum`, `via.placeholder`, broken mock copy).
- Images missing explicit `alt` or `width`/`height` (a11y + CLS guard).

---

## Phase 2: Live Viewport & `break-ui` Stress Check (`1440px` + `390px`)

Delegate to the `browser` subagent (read-only) at **`1440×900`** (Desktop) and **`390×844`** (Mobile) to verify:
1. **Zero Horizontal Overflow**: `document.documentElement.scrollWidth <= window.innerWidth` at both `1440px` and `390px`.
2. **Zero Element Overlap / Clipping**: Sticky header, cookie banner, filter button, price, and primary CTA never collide or cover clickable controls.
3. **No Broken Media / Unstyled Fallback**: Every visible `<img>` has `complete && naturalWidth > 0`.
4. **Above-the-Fold 5-Second Clarity**: `<h1>`, core offer/product title, price/value, and 1 primary CTA are immediately legible at `opacity: 1` without scrolling.
5. **`break-ui` Edge-Case Audit**:
   - Extra-long Russian product titles / OEM strings (no broken card height or text bleed — use `overflow-wrap: anywhere` / clean clamping).
   - Missing product photo / Out-of-Stock state (clean fallback + CTA, never collapsed empty box).
   - Touch targets `>= 44×44px` on `390px` and input font-size `>= 16px` (no iOS zoom).

---

## Phase 3: Strict Fail-Closed Verdict (Max 3 Rounds)

End every Visual Gate report with **exactly one** verdict line:
- **`GATE: PASS`** — Static gate passed (`0` critical/fail issues) AND both `1440px` + `390px` live checks passed cleanly.
- **`GATE: FAIL`** — One or more blocking defects found (list exact file/selector/viewport, fix immediately, and re-run).
- **`GATE: OPEN`** — 3 fix rounds exhausted without reaching `PASS`; escalate to the operator with exact remaining defects and screenshots.
- **`GATE: SETUP`** — Target URL / local template not reachable yet (never fabricate `PASS`!).
