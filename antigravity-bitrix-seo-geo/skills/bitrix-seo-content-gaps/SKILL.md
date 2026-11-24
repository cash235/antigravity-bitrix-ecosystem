---
name: bitrix-seo-content-gaps
description: >
  SXO, Semantic Clusters, Content Gap Graph, Cannibalization Audit, and Programmatic Smart-Filter
  SEO for 1C-Bitrix catalogs and service sites. Integrates live SEO data workflows (Semrush MCP,
  Ahrefs MCP, Bing/Yandex Webmaster, GSC) with Bitrix iblock sections, smart filter facets, and
  citation-gap optimization for AI search.
---

# 1C-Bitrix Semantic Clusters, Content Gaps & Programmatic Filter SEO (`bitrix-seo-content-gaps`)

Use this skill to discover high-ROI missing pages, eliminate keyword cannibalization between catalog sections and smart filters, and design safe programmatic SEO landing pages in 1C-Bitrix without creating thin/duplicate index bloat.

---

## 1. Demand vs. Supply Gap Graph (InfraNodus / Semantic Cluster Methodology)

1. **Map Existing Supply**:
   - Extract current indexable catalog sections (`b_iblock_section`), service pages, blog/FAQ articles, and curated filter landing pages from the workspace (`urlrewrite.php`, `sitemap.xml`, or Screaming Frog export via `scripts/sf-analyze.mjs`).
2. **Pull Real Search Demand (Live MCP First — Never Guess Volumes)**:
   - If **`semrush_mcp`** is connected: run `organic_research`, `keyword_research`, and `competitors_research` (or pair with `competitor-gap` / `keyword-research` skills).
   - If **Ahrefs MCP / GSC / Yandex.Webmaster / Bing Webmaster** data or CSV exports are available: ingest top queries, impressions, low-CTR positions (`4–20`), and zero-click AI answers.
3. **Identify Structural Content & Citation Gaps**:
   - **Missing Commercial Clusters**: high-intent queries (`купить <товар> <бренд/модель/город>`, OEM/артикул queries) that have NO dedicated section or curated filter page.
   - **Missing Informational / SXO Bridges**: comparison/compatibility/installation queries (`как подобрать`, `отличия`, `аналоги`) that competitors rank for and AI engines cite, bridging visitors into commercial catalog categories.
   - **Citation Source Gaps**: topics where AI search (Yandex Neuro, Google AI Overviews, Perplexity) cites third-party directories instead of your site due to missing concise 40–60 word answer blocks or spec tables (`bitrix-seo-content-geo`).

---

## 2. Keyword Cannibalization Audit in 1C-Bitrix

Check for the 3 most common Bitrix cannibalization traps:
1. **Section vs. Smart Filter Facet**: e.g., `/catalog/dvigateli/bmw/` competes with `/catalog/dvigateli/filter/brand-is-bmw/apply/`. **Fix**: pick ONE canonical URL; `noindex, follow` + canonical-to-section on the redundant facet URL.
2. **Duplicate SKU / Used-Unit Cards**: dozens of nearly identical items sharing identical `<title>` / `<h1>`. **Fix**: enforce unique differentiating attributes (OEM code, year, engine code, condition, warehouse/city) in `b_iblock_iproperty` templates (`bitrix-seo-ecommerce`).
3. **Pagination & Sort Mirrors**: `?PAGEN_1=2`, `?sort=price`, `?view=list` indexed alongside page 1. **Fix**: strip sort/view params in canonical, return `404` (`RestartWorkarea()`) on phantom `PAGEN_X > NavPageCount`.

---

## 3. Programmatic Smart-Filter Landing Pages (Safe Bitrix Pattern)

Only promote a smart-filter combination to an indexable landing page when **ALL 4 gates pass**:
1. **Verified Demand**: real search demand (GSC / Webmaster / Semrush / Wordstat) or proven internal search volume.
2. **Inventory Threshold**: `>= 3` active in-stock items (auto-switch to `noindex, follow` or fallback-analog UX if stock drops to 0; never 404 URLs with steady backlinks/demand).
3. **Unique Metadata & SSR Copy**: unique `<title>`, `description`, `<h1>`, breadcrumb label, and a concise 120–180 word expert intro/FAQ block stored in a dedicated Highload-block (`SeoFilterLanding`) and applied inside `component_epilog.php` (cache-safe!).
4. **Clean SEF URL & Sitemap Inclusion**: human-readable URL mapped via `urlrewrite.php` (no duplicate numeric keys!) and included in automated `sitemap.xml` only when active & indexable.

---

## 4. Deliverable Format

- **Cluster & Gap Matrix** (`Cluster | Intent | Target URL (Existing or New) | Cannibalization Risk | ICE Score | Priority Q1–Q4`).
- Concrete Bitrix D7 implementation plan (`HL-block` schema, `component_epilog.php` wiring, canonical/robots rules, and `AC-001..N` acceptance criteria).
