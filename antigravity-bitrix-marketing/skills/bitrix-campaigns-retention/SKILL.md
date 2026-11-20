---
name: bitrix-campaigns-retention
description: End-to-end marketing campaigns and Bitrix CRM retention playbooks — campaign brief, positioning, landing/email/messenger/ads sequences, plus automated recovery flows for abandoned carts and zero-result catalog searches.
---

# Bitrix Campaigns, Lead Recovery & Retention

Design structured, measurable acquisition and retention campaigns tightly connected to **1C-Bitrix Sale, Catalog, Telemetry, and CRM (Leads/Deals/Contacts)**.

## When to Use
- Launching a seasonal promo, new product category, regional expansion (new `SITE_ID`), or B2B outreach campaign.
- Turning existing site telemetry (`cart_abandoned`, `search_empty`, out-of-stock requests, repeat customers) into structured CRM recovery flows.
- Preparing coordinated copy across landing page + email + messenger (WhatsApp/Telegram/Viber) + paid search ads.

## Step 1: Compact Campaign Brief (Always Align First)
Fill in (using verified project facts; tag unknowns as `[NEEDS OWNER CONFIRMATION]`):
1. **Goal & KPI**: e.g., *+25 qualified B2B leads/month* or *recover 10% of abandoned carts*.
2. **Target Segment & Region**: exact `SITE_ID`/domain, currency, buyer persona (retail vs B2B).
3. **Core Offer & Proof**: concrete value (in-stock guarantee, fixed diagnostic fee, B2B volume terms, warranty) — never fake discounts.
4. **Landing URL & Tracking**: dedicated Bitrix URL + strict UTM convention:
   - `utm_source` (`yandex`, `google`, `telegram`, `email`, `crm`)
   - `utm_medium` (`cpc`, `messenger`, `retention`, `promo`)
   - `utm_campaign` (`<region>_<category>_<yyyymm>`)
   - Verify UTM parameters are passed into Bitrix CRM Lead/Deal fields (without breaking canonical URLs!).

## Step 2: High-ROI Bitrix Retention & Recovery Playbooks

### Playbook 1: Zero-Result Search Recovery (`search_empty`)
- **Trigger**: Visitor searches SKU/part/keyword -> `0` catalog matches.
- **On-site action**: Inline 2-field recovery form capturing `query`, `site_id`, `phone/messenger`.
- **Bitrix CRM action**: Auto-create CRM Lead tagged `SOURCE = search_empty` with the exact searched string in comments so the manager checks offline stock/suppliers and replies within SLA.
- **Monthly merchandising loop**: Export top 20 `search_empty` queries -> add synonyms/transliterations or source high-demand SKUs.

### Playbook 2: Abandoned Cart & Incomplete Quote Recovery (`cart_abandoned`)
- **Trigger**: Authorized user or captured phone/email adds item to basket (`b_sale_fuser`) and leaves without ordering.
- **Sequence** (respecting opt-in / cookie consent & working hours):
  1. **T + 1–2 hours** (soft help, no pushy sales): *"Your items are still reserved/available — need compatibility confirmation or shipping estimate?"* + direct link back to cart.
  2. **T + 24 hours** (risk reversal): Warranty, delivery timeline, or B2B invoice option + direct specialist contact.
- **Bitrix guardrail**: Never send recovery messages for already-completed orders or out-of-stock items; verify staging guard (`SITE_ENV` / domain check) so test orders NEVER message real customers!

### Playbook 3: Repeat Buyer & Maintenance Reminder (CRM Deals)
- **Trigger**: Closed-Won Deal in Bitrix CRM (e.g., 30 / 90 / 180 days post-purchase depending on niche).
- **Message**: Value-first check-in (warranty check, consumable/related part reminder, or B2B restock inquiry) rather than generic "buy again" spam.

## Step 3: Multi-Channel Asset Pack (When Requested)
Generate cohesive assets sharing ONE core promise:
- **Landing / Promo Block** (Hero H1/subhead, 3 proof bullets, CTA, FAQ)
- **Search Ads (Yandex Direct / Google Ads)** (3 headline variants <= 35/56 chars, 2 descriptions <= 81/90 chars, sitelinks, negative keyword starter list)
- **Messenger / Email Sequence** (3 concise messages: Immediate Value -> Proof/FAQ -> Final Gentle Reminder)
- **CRM Attribution & Analytics Checklist** (verify GA4/Yandex.Metrika goal fires once, CRM lead stores UTM + `SITE_ID`, canonical tag strips `utm_*`).

## Output Format
Deliver:
1. **Campaign Blueprint & KPI Target**
2. **Channel Assets** (copy-ready, concise, zero placeholders except explicit `[NEEDS OWNER CONFIRMATION]`)
3. **Bitrix Technical Integration Checklist** (UTM -> CRM fields, canonical safety, staging email/SMS guard, QA test steps).
