---
name: bitrix-conversion-copy
description: Conversion-focused copywriting and messaging audit for 1C-Bitrix pages — 5-second above-the-fold clarity test, product/category/service copy, trust/warranty/delivery blocks, out-of-stock CTAs, and Copy Review checklist.
---

# Bitrix Conversion Copy & 5-Second Clarity

Turn technical catalog templates and generic corporate text into clear, credible, high-converting copy — without hype, fluff, or breaking Bitrix SEO/Schema.org structure.

## When to Use
- Auditing or rewriting Homepage heroes, Category intros, Product cards (`catalog.element`), Service landing pages, Cart/Checkout headers, or Lead Modals.
- Fixing high bounce rates on landing pages despite strong search rankings.
- Designing out-of-stock (`QUANTITY <= 0`) or zero-result search (`search_empty`) microcopy.

## Step 1: The 5-Second Above-the-Fold Clarity Test
Evaluate the first viewport (Desktop `1440×900` AND Mobile `375×812`) on 4 binary checks:
1. **What**: Can a cold visitor tell in 2 seconds what exact product/service is offered? (Specifics beat slogans: *"Original & Tested Diesel Engine Parts with 30-Day Warranty"* beats *"Quality Solutions for Your Business"*.)
2. **Where & How Fast**: Is delivery geography / pickup availability / lead time clear?
3. **Why Trust**: Is there at least one verifiable trust anchor near the CTA (warranty period, real stock indicator, B2B VAT/invoice availability, phone/messenger response time)?
4. **Next Action**: Is there ONE unmistakable primary CTA button with action-verb copy (*"Add to Cart"*, *"Request Quote by VIN/SKU"*, *"Book Diagnostics"*) instead of vague *"Submit"* or *"Send"*?

## Step 2: Page-Type Copy Blueprints for 1C-Bitrix

### A. Product Card (`catalog.element`)
- **Price & Currency Clarity**: Always clarify VAT/tax or regional currency (especially in multisite Bitrix setups).
- **Stock-State Microcopy**:
  - **In stock**: Specific availability (*"In stock — ships today / pickup available"*) + Primary CTA (*"Add to Cart"*) + Subordinate CTA (*"Buy in 1 Click / Ask Specialist"*).
  - **Out of stock / Under order**: NEVER show a dead disabled button alone. Keep HTTP 200 and show: *"Currently out of stock — we can source this exact part or verify an OEM analog"* + Primary CTA (*"Request Analog / Delivery Time"*).
- **Risk Reversal Strip** (3 compact factual items right below CTA):
  1. Warranty / return terms (verified from project docs).
  2. Delivery / carrier / pickup options.
  3. Payment options (card, cash, B2B wire invoice).

### B. Category & Smart Filter Pages (`catalog.section`)
- **Above grid**: Clean `<h1>` + 1–2 concise sentences of buyer-helpful framing (avoid walls of SEO text pushing products below the fold!).
- **Empty filter / Zero-result search (`search_empty`)**:
  - State clearly what wasn't found (`"No exact match for «{query}»"`).
  - Offer 2 immediate recovery paths: (1) relax filter / try SKU without spaces, (2) inline 2-field form (*"Phone/Messenger + Part/OEM needed — we'll check warehouse stock in 15 min"*).

### C. Service / B2B Lead Pages
- Follow **Problem -> Proof -> Process (3–4 steps) -> Transparent Pricing/Factors -> Single Lead Form -> FAQ (GEO-ready 40–60 word answers)**.
- Place a low-friction field count (max 2–3 required fields: Phone/Contact + Comment/VIN/SKU).

## Step 3: Anti-Fluff Copy Review Checklist
Before approving any text, verify:
- [ ] Zero empty clichés (*"individual approach"*, *"high quality"*, *"best prices"*, *"dynamic team"*).
- [ ] Zero unverified claims — any missing business fact is tagged `[NEEDS OWNER CONFIRMATION]`.
- [ ] Every CTA button states the **outcome**, not the mechanical action (*"Get Quote in 15 Min"* vs *"Submit Form"*).
- [ ] Mobile readability: headlines <= 2–3 lines on `375px`, bullet points scannable, tap targets >= `44×44px`.
- [ ] SEO/GEO intact: single `<h1>`, valid `h2/h3` hierarchy, Schema.org attributes untouched, no inline `<script>`/`<style>`.

## Output Format
Provide a **Before -> After Copy Diff Table** per template/block (`Location | Current Copy / Issue | Proposed Copy | Conversion Rationale | File Path`).
