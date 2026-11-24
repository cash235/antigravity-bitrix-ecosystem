---
name: bitrix-seo-audit
description: >
  Full 1C-Bitrix SEO & GEO audit orchestrator for any Bitrix site (corporate, service, landing,
  single-site store, or multisite E-commerce). Combines static codebase inspection (urlrewrite.php,
  component_epilog.php, robots.txt, sitemap.xml, llms.txt), live URL checks (headers, redirects,
  OpenGraph, JSON-LD, GEO score), Screaming Frog CSV analysis, and unified SEO + GEO Health Score (0-100).
---

# Bitrix SEO & GEO Audit Orchestrator

Use this skill when auditing any 1C-Bitrix website — from a brochure/corporate site to a multisite E-commerce catalog — via codebase inspection, live URLs, or Screaming Frog exports.

## Workflow

1. **Identify Site Archetype**:
   - **Simple / Corporate / Service site**: Focus on Technical SEO, On-Page, `Organization`/`LocalBusiness`/`Service`/`FAQPage` Schema, GEO (`/llms.txt`, citability), Agentic Readiness (`bitrix-seo-agentic`), Local SEO (`bitrix-seo-local`), Analytics, and Core Web Vitals.
   - **Single-Site or Multisite E-commerce**: Add `bitrix-seo-ecommerce` (smart filter facets, pagination, out-of-stock, duplicate SKUs, `Product`+`Offer` Merchant Listings), `bitrix-seo-content-gaps` (SXO clusters, cannibalization, programmatic smart-filter landings), `bitrix-seo-local` (`b_catalog_store` branches/maps), and `bitrix-seo-multisite` (per-domain `robots.txt`/`sitemap.xml`/`llms.txt`, `hreflang`, isolated NAP/currency).

2. **Static Codebase Audit** (run from plugin `scripts/`):
   ```bash
   node scripts/bitrix-code-audit.mjs <project-root>
   ```
   Checks `urlrewrite.php` duplicate keys, `template.php` SEO setters, `RestartBuffer()` 404 traps, `robots.txt`, `sitemap.xml`, `llms.txt`/`llms.php`, and inline `<style>`/`<script>` blocks.

3. **Live URL SEO + GEO Inspection**:
   ```bash
   node scripts/fetch-seo.mjs <url>
   node scripts/geo-check.mjs <url>
   ```
   Checks HTTP status, redirect chain (`http` -> `https`, `www` -> canonical), `X-Powered-CMS`, anonymous `PHPSESSID`, `title`, `description`, `canonical`, `hreflang`, `og:title`/`og:description`, `twitter:card`, `favicon` (120×120/SVG), `H1–H3`, `img[alt]`, `application/ld+json`, AI crawler policies, `/llms.txt`, and GEO Readiness Score (`0–100`).

4. **Screaming Frog Export Analysis** (if `internal_all.csv` is available):
   ```bash
   node scripts/sf-analyze.mjs <path-to-internal_all.csv>
   ```

5. **Parallel Subagent Delegation** (for deep audits):
   - Delegate static code + live SEO/GEO checks to `bitrix-seo-auditor`.
   - Delegate JSON-LD / Microdata / OpenGraph verification to `bitrix-schema-validator`.
   - Use the built-in `browser` subagent when JS-rendered DOM, Cookie banner UX, or mobile layout inspection is required.

6. **Output Format (Central Orchestrator Compatible)**:
   - **Unified SEO & GEO Health Score (0–100)** with category breakdown: Technical, On-Page, Schema.org, GEO / AI Search, E-commerce (if applicable), Analytics, Performance/CWV.
   - **Prioritized Action Plan**: `Critical` → `High` → `Medium` → `Low` with exact file paths, line numbers, and Bitrix D7 remediation steps.
   - **ICE & Model Routing Tags** (when `antigravity-bitrix-core` Orchestrator / Command Center Dashboard is active):
     - Score each finding with `ICE = (Impact × Confidence) / Effort` (`1–10` each) and `Track: SEO & GEO`.
     - Attach recommended Antigravity model tier (`flash` for meta/robots/llms/single-file fixes, `inherit` for multi-template/Schema/Analytics changes, `pro` for multisite routing/Composite cache architecture) plus observable `AC-001..N` and `Must NOT` guardrails.
