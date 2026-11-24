---
name: bitrix-design-taste
description: >
  Anti-AI-Slop design engineering and visual craft workflow for 1C-Bitrix D7 templates, catalog grids,
  product cards, service landings, and /manager/ cabinets. Combines Brief Inference, deterministic
  art-direction generation (tasteskill.dev / Leonxlnx/taste-skill), and precision UI engineering
  details (emilkowalski/skills: learn-taste, ui-cheatsheet) while preserving Bitrix D7 & SEO hygiene.
---

# 1C-Bitrix Design Taste & Anti-AI-Slop Craft (`bitrix-design-taste`)

Use this skill whenever designing, redesigning, or styling any `/local/templates/*/` page, catalog component, product detail card, checkout flow, or internal `/manager/` interface in 1C-Bitrix.

---

## Step 1: Brief Inference ("Read the Room") — Before Writing CSS/PHP

Extract concrete project facts instead of asking for abstract style adjectives:
1. **Business Archetype**: Auto-parts / B2B technical catalog (`auto-parts`), Retail E-commerce (`retail`), Local Services (`services`), Corporate B2B (`b2b`), or Internal CRM/Manager Console (`manager`).
2. **Primary Visitor Action (1 Main CTA)**: e.g., *Find part by OEM/VIN*, *Add to Cart*, *Request Quote*, *Book Service*.
3. **Hard Facts & Real Assets**: Real product photos, OEM tables, stock/branch locations, delivery windows, warranty terms. Never invent fake testimonials or placeholder copy.
4. **Draw Deterministic Art Direction** (zero-dependency CLI):
   ```bash
   node ~/.gemini/config/plugins/antigravity-bitrix-design/scripts/bitrix-design-gate.mjs --deal auto-parts
   ```
   *(Archetypes: `auto-parts`, `retail`, `services`, `b2b`, `manager`. Use `--seed <name>` for deterministic repeatability per project.)*

---

## Step 2: Anti-AI-Slop Rules (What to Eliminate Immediately)

- **NO generic 3-column icon-in-tinted-circle "Why Choose Us" filler blocks** above real catalog/product content.
- **NO rainbow status badges or thick neon borders** — use monochrome surfaces + 1 primary brand accent + small semantic status dots (`6px`).
- **NO `Lorem ipsum`, fake stock placeholders, or uncropped stretched images** — use real catalog media or clean structured spec cards when a SKU lacks a photo.
- **NO centered walls of marketing fluff** — left-align scannable technical specs, pricing, availability, and delivery terms.

---

## Step 3: Precision UI Craft Cheatsheet (`emilkowalski/skills` Principles)

1. **Borders & Depth**:
   - Prefer crisp subtle borders (`1px solid rgba(...)` or `color-mix`) and layered low-opacity shadows over harsh solid borders.
   - Keep **concentric radii**: if outer card is `8px` with `8px` padding, inner button/media should be `4px–6px` (never `9999px` pills inside sharp IDE/catalog cards).
2. **Typography & Numbers**:
   - Strong visual hierarchy via weight + size + muted secondary tone (not 5 different colors).
   - Apply `font-variant-numeric: tabular-nums` to ALL prices, discounts, OEM numbers, quantities, stock counters, and table columns so digits align vertically.
   - Keep body prose line length `55–72ch`; never put `font-size < 14px` on primary mobile body text (prevents iOS auto-zoom on inputs: keep `<input>` `>= 16px` on mobile!).
3. **Interactive States & Touch Craft**:
   - Define explicit `:hover`, `:focus-visible` (accessible outline), `:active` (subtle `scale(0.98)` tactile press where appropriate), and `:disabled` states for every button and filter chip.
   - Mobile tap targets `>= 44×44px` with `>= 8px` gap between adjacent controls (cart +/-, filter reset, phone CTA).
4. **Bitrix D7 & SEO Invariants**:
   - Register styles/scripts via `Bitrix\Main\Page\Asset::getInstance()->addCss()` / `addJs()` inside `/local/templates/<tpl>/`.
   - Preserve exact single `<h1>`, semantic `<main>/<article>/<section>/<nav>`, Schema.org microdata/JSON-LD, and explicit `width`/`height`/`alt` on `<img>`.

---

## Step 4: Mandatory Hand-Off to Visual Finish Gate

Before marking any UI task complete, run **`bitrix-visual-gate`** (`scripts/bitrix-design-gate.mjs` + `1440px` / `390px` browser verification).
