---
name: bitrix-design-critique
description: Weighted Visual UX & Design Quality Rubric (Visual Hierarchy 0.35, Conversion Clarity 0.30, Mobile Craft 0.25, Consistency 0.10) for critiquing 1C-Bitrix templates, catalog grids, smart filters, product cards, and checkout flows.
---

# Bitrix Visual UX & Design Critique

Structured, objective visual and UX critique for 1C-Bitrix interfaces — replacing subjective *"make it nicer"* feedback with a weighted scorecard and exact file-level CSS/template fixes.

## When to Use
- Reviewing a newly implemented Bitrix template, product card, smart filter, modal, or manager dashboard.
- Auditing live pages (via `browser` subagent / `chrome-devtools-mcp` screenshots at `1440px`, `768px`, `375px`) before release.
- Diagnosing why a page feels cluttered, outdated, hard to scan on mobile, or fails to convert.

## Step 1: Capture Real Visual Evidence
Do NOT critique from imagination. Inspect either:
1. Live rendered screenshots at **Desktop (`1440×900`)** and **Mobile (`375×812`)** via `browser` / `chrome-devtools-mcp`, AND/OR
2. Actual Bitrix template markup & CSS in `/local/templates/` and `/local/components/`.

## Step 2: Weighted 4-Axis Design Rubric (0–10 Scale)

| Axis | Weight | What to Inspect | Fail / Penalty Triggers (< 6.0) |
|---|---|---|---|
| **1. Visual Hierarchy & Scannability** | **0.35** | Clear F/Z reading flow; distinct typographic scale (`H1 -> H2 -> body -> meta`); generous whitespace; price & primary CTA pop immediately; clean card grouping | Wall of undifferentiated text; competing bright badges everywhere; price buried below secondary specs; cramped padding |
| **2. Conversion Clarity & Trust** | **0.30** | 1 unmistakable primary CTA per screen; stock/delivery/warranty visible near CTA; zero dead-end empty states; form friction minimized | Multiple equal-weight buttons fighting for attention; missing stock/price context; aggressive popups blocking first paint |
| **3. Mobile Craft & Responsiveness** | **0.25** | Zero horizontal scroll (`scrollWidth <= innerWidth`) at `375px`; tap targets >= `44×44px`; thumb-friendly filters/drawers; sticky CTA or easy reach; readable font >= `14–16px` | Overflowing tables/cards; tiny close/filter buttons (`<32px`); sticky headers eating >25% of mobile viewport; layout shift (CLS) |
| **4. System Consistency & Polish** | **0.10** | Cohesive color palette, border radius, button states (`hover`/`focus`/`disabled`/`loading`), consistent icon stroke weight, accessible contrast (WCAG AA >= `4.5:1` text) | Mixed button styles across pages; missing loading spinners on AJAX actions; low-contrast gray text on tinted backgrounds; broken aspect ratios on product photos |

### Compute Weighted Score
$$\text{Score} = 0.35 \times \text{Hierarchy} + 0.30 \times \text{Clarity} + 0.25 \times \text{Mobile} + 0.10 \times \text{Consistency}$$

- **8.5 – 10.0**: Ship-ready — strong commercial craft.
- **7.0 – 8.4**: Good foundation — apply targeted polish items.
- **< 7.0**: Conversion/UX drag — fix top P0/P1 visual issues before scaling ad traffic.

## Step 3: Bitrix-Specific Design & Performance Checks
- **Product Photo Aspect Ratio**: Enforce fixed aspect ratio (`aspect-ratio` + `object-fit: cover/contain` + explicit `width`/`height`) so uneven catalog photos never cause CLS or ragged grid rows.
- **AJAX Feedback States**: Every Bitrix smart filter, pagination, add-to-cart, and lead submit button must display an immediate loading/disabled state to prevent double clicks.
- **Asset Hygiene**: All CSS fixes go into `/local/templates/.../template_styles.css` or component `style.css` loaded via `Asset::getInstance()->addCss()`, never inline `<style>` in PHP.

## Output Format
1. **Weighted Design Scorecard Table** (`Axis | Weight | Score /10 | Key Evidence`) + Total Weighted Score.
2. **Top 3–5 Concrete Visual Fixes** ordered by conversion impact:
   - `[P0/P1/P2] Issue` -> Exact file/selector -> Concrete before/after fix -> Expected UX/CR impact.
3. **Verification Checklist** (`375px` & `1440px` checks to hand off to `antigravity-bitrix-qa` / `bitrix-browser-qa`).
