---
name: bitrix-product-lens
description: Product Diagnostic, Founder Review, User Journey Friction Audit, and ICE Anti-Busywork Prioritization for 1C-Bitrix e-commerce, B2B catalogs, and service websites. Use before building new features or when prioritizing backlog/CRO work.
---

# Bitrix Product Lens & ICE Prioritization

Pressure-test **why** a feature or change matters before writing PHP/JS/CSS. Stop busywork that polishes low-impact pages while high-intent visitors drop off in search, product cards, or checkout.

## When to Use
- Before starting a new feature, redesign, or marketing initiative on a 1C-Bitrix site.
- When the backlog has 10+ competing tasks and the owner needs an objective ranking.
- When traffic exists (from Yandex/Google/AI) but orders or CRM leads stagnate.
- Called automatically by `bitrix-orchestrator` when scoring initiatives for the Command Center Dashboard.

## Step 1: 4-Stage Bitrix Funnel Diagnostic
Inspect project memory (`docs/memory/status.md`, `docs/backlog.md`), analytics/telemetry (if present), and live templates (`/local/templates/`) across the 4 stages:

| Stage | Bitrix Touchpoints | Core Diagnostic Questions |
|---|---|---|
| **1. Discovery / Landing** | Homepage, catalog sections, smart filter landings, service pages | Does the visitor understand what is sold, for which region/currency, and why to trust this company in **5 seconds**? |
| **2. Search & Selection** | Header search, smart filter, catalog list, SKU/OEM search | What happens on **zero-result search (`search_empty`)**? Are mobile filters usable in 1 thumb? Are stock/price/delivery visible on cards? |
| **3. Product / Lead Capture** | `catalog.element`, cart, one-click order, callback/quote modal | Is there **1 clear primary CTA**? What happens when `QUANTITY <= 0` (out-of-stock)? Does form submission reliably create a Bitrix CRM Lead/Deal with attribution? |
| **4. Post-Order & Retention** | Order confirmation, CRM statuses, email/SMS/messenger triggers | Does the buyer get instant confirmation, clear next steps, and a reason to return or request related services? |

## Step 2: Founder Pressure-Test (6 Brutal Questions)
For every proposed feature or backlog item, answer concisely:
1. **Who is the exact buyer persona** (retail urgent buyer, B2B procurement manager, fleet mechanic, local service client)?
2. **What pain or drop-off does this remove** (backed by code, UX, or analytics evidence)?
3. **What happens if we do NOT build this for 90 days?** (If "almost nothing" -> defer/drop!)
4. **Is there a 10x cheaper MVP** (e.g., an inline lead capture block or smart CTA before building a full custom cabinet)?
5. **How will we measure success in 14–30 days?** (Concrete KPI: `+CR%`, `search_empty -> lead%`, `cart_abandoned recovery`, `mobile bounce%`).
6. **What is the hidden maintenance cost** in 1C-Bitrix (Composite cache, multisite isolation, 1C sync, mobile layout)?

## Step 3: ICE Scoring Formula (Anti-Busywork Gate)
Compute the score consistently with `antigravity-bitrix-core`:

$$\text{ICE} = \frac{\text{Impact} \times \text{Confidence}}{\text{Effort}}$$

- **Impact (`1–10`)**: Direct revenue, lead volume, or critical risk reduction.
  - `9–10`: Unblocks broken checkout/CRM lead capture, recovers high-intent drop-offs, closes critical security/SEO loss.
  - `6–8`: Measurable CR% lift on high-traffic catalog/product/service pages.
  - `1–5`: Cosmetic polish, low-traffic pages, internal nice-to-haves.
- **Confidence (`1–10`)**: Evidence strength.
  - `9–10`: Proven by live analytics, QA preflight, broken click-path, or confirmed owner priority.
  - `6–8`: Strong e-commerce/CRO pattern matched to verified template gaps.
  - `1–5`: Hypothesis without traffic/funnel data yet.
- **Effort (`1–10`)**: Implementation + QA + Bitrix cache/multisite risk.
  - `1–2`: Small template/copy/config fix (<2h).
  - `3–5`: Single component/AJAX handler/modal (0.5–2 days).
  - `6–10`: Cross-module architecture, CRM workflow, multi-template overhaul.

### Action Thresholds
- **ICE ≥ 20**: Execute now (Top Priority in Dashboard).
- **ICE 10–19**: Schedule in current sprint / after top items.
- **ICE < 10**: Challenge or park in backlog — explain explicitly why it is low ROI.

## Output Format
Return a crisp **Product Lens Decision Brief**:
1. **Primary Bottleneck Identified** (1–2 sentences with file/analytics evidence)
2. **ICE Priority Table** (`Task | Funnel Stage | Impact | Conf | Effort | ICE | Verdict: Do Now / Schedule / Defer`)
3. **Recommended MVP Scope** for the #1 item + Precision Prompt (`AC-001..N`, `Must NOT`) ready for `bitrix-orchestrator`.
