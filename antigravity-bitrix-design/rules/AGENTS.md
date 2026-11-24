# 1C-Bitrix Design Taste, Motion Craft & Visual Gate Guardrails (Always Active)

When `antigravity-bitrix-design` is enabled, enforce these frontend craft standards on every `/local/templates/*/` and `/manager/` UI edit:

1. **Anti-AI-Slop & Brief First**:
   - Never default to generic centered hero stacks, symmetrical 3-column icon-in-circle feature grids, gratuitous gradients, or `Lorem ipsum` / placeholder stock boxes.
   - Start non-trivial UI work with **Brief Inference** (`bitrix-design-taste`) or `scripts/bitrix-design-gate.mjs --deal <archetype>` to lock a domain-authentic palette, typographic scale, spacing rhythm, and surface hierarchy.
2. **UI Craft & Precision Details**:
   - Prefer crisp subtle translucent borders and restrained elevation over thick colored boxes; maintain concentric border-radius (`innerRadius = outerRadius - padding`).
   - Use `font-variant-numeric: tabular-nums` on prices, OEM/SKU codes, stock counts, and dashboard KPIs; ensure mobile tap targets are `>= 44×44px` and text contrast meets WCAG AA (`>= 4.5:1`).
3. **Motion Performance & Restraint**:
   - Use `ease-out` for entering elements and `ease-in-out` for in-place state morphs (`150–260ms`); animate ONLY GPU-composited properties (`transform`, `opacity`). Never use `transition: all` or animate `width`/`height`/`top`/`left`.
   - Always include `@media (prefers-reduced-motion: reduce)`. Remove decorative animations from high-frequency manager tables, search inputs, and rapid catalog filters.
4. **Bitrix D7, SEO & CWV Preservation**:
   - Keep all CSS/JS inside `/local/templates/*/` and load via `Bitrix\Main\Page\Asset::getInstance()` (zero inline `<style>`/`<script>` in PHP templates).
   - Never break single `<h1>`, Schema.org JSON-LD/Microdata, or Core Web Vitals (always set explicit `width`/`height` + `alt` on `<img>` to avoid CLS).
5. **Fail-Closed Visual Finish Gate**:
   - Never report a template/UI task as `DONE` until `scripts/bitrix-design-gate.mjs` + `1440px` and `390px` viewport verification pass (`GATE: PASS`, max 3 fix rounds before escalating as `GATE: OPEN`).
