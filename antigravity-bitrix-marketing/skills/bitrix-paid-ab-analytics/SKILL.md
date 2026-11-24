---
name: bitrix-paid-ab-analytics
description: >
  Paid Traffic Diagnostics (Yandex.Direct / Google Ads CPA, ROAS, wasted spend), A/B Test Design
  & Statistical Evaluation, and Owner-Friendly Marketing Reports for 1C-Bitrix sites. Adapted from
  marketing-skills (ab-test-analyzer, cpa-diagnostics, ad-spend-allocator, client-report-narratives)
  with strict read-only default and confirm-gate before any live ad account write.
---

# 1C-Bitrix Paid Traffic Diagnostics, A/B Testing & Owner Reports (`bitrix-paid-ab-analytics`)

Use this skill when analyzing paid acquisition efficiency (Yandex.Direct, Google Ads, VK/Meta), designing or evaluating A/B experiments on 1C-Bitrix templates, or preparing plain-language ROI reports for the business owner.

---

## 1. Wasted Spend & CPA/ROAS Diagnostics (Evidence-First)

When provided with campaign exports (CSV/JSON), Yandex.Metrika / GA4 data, CRM deal logs, or live MCP connectors:
1. **Attribution Reality Check**:
   - Cross-check ad clicks vs. actual Bitrix `b_sale_order` / CRM leads (exclude staff/bot sessions and duplicate goal fires per `bitrix-seo-analytics`).
   - Verify UTM params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`) are captured into hidden form fields / Bitrix CRM deals AND stripped from canonical URLs.
2. **Wasted Spend Triage**:
   - **Zero-conversion high-spend queries/placements**: flag search queries/RSY/Display placements spending `> 2× target CPA` with `0` leads.
   - **Out-of-Stock Ad Leakage**: cross-check paid landing URLs against Bitrix catalog stock (`CATALOG_AVAILABLE = N`) — stop burning budget on unavailable SKUs without analog recovery!
   - **Device & Time Splits**: isolate Mobile vs. Desktop CPA spikes (often caused by mobile checkout bugs rather than bad ads — route technical bugs to `bitrix-browser-qa`).
   - **Creative Fatigue**: flag rising CPA + dropping CTR over 14–28 day rolling windows.
3. **Mandatory Confirm-Gate**: Never pause campaigns, change bids, or push budget changes automatically — present an exact change table with projected CPA/ROAS impact and require explicit operator approval.

---

## 2. A/B Test Setup & Statistical Discipline (No Premature Calls)

Before launching a template/CTA experiment on 1C-Bitrix:
1. **Hypothesis Contract**: *"Changing [X] on [page/template] for [segment] will improve [CR% / AOV / Lead Volume] because [observed evidence]."*
2. **Composite Cache Safety**: Never split A/B variants via cached PHP `rand()` — use edge/cookie bucketing or lightweight non-blocking client variant assignment that avoids LCP flicker.
3. **Sample Size & Guardrails**:
   - Require minimum `>= 14 days` (2 full business weeks) and sufficient conversions per variant (`>= 100` preferred; for lower-volume B2B/auto-parts sites use micro-conversions + qualitative validation instead of pretending `p < 0.05` on 8 leads).
   - Track guardrail metrics alongside the primary metric: bounce rate, page load (LCP/INP), and order cancellation rate (higher leads with garbage quality is a loss!).

---

## 3. Plain-Language Business Owner Narrative (`client-report-narratives`)

Translate raw metrics into 4 crisp executive sections (zero agency jargon):
1. **Bottom Line (3 bullets)**: Revenue/Leads, Real CPA/ROAS, vs. previous period.
2. **Where Money Worked Best**: Top 3 channels/categories/cities with real CRM conversions.
3. **Where Money Leaked**: Exact wasted segments/broken mobile funnels with ruble/dollar impact.
4. **Next 3 Decisions (ICE-Ranked)**: Concrete actions (budget shift, landing fix, OOS analog CTA) with owner and expected payoff.
