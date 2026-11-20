# antigravity-bitrix-seo-geo

**Universal SEO, GEO (Generative Engine Optimization), Web Analytics, Schema.org, E-commerce, Drift Monitoring & 1C-Bitrix D7 Static Analysis Plugin for Google Antigravity.**

Works out of the box for **any 1C-Bitrix project** — from a single-domain corporate or service website to a high-load multisite E-commerce catalog with CRM integration.

Adapted and expanded for **Antigravity IDE** and **1C-Bitrix (D7)** from [claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT License), combining universal SEO & AI-search (GEO) methodology with Bitrix D7 architectural patterns and zero-dependency Node.js CLI utilities.

---

## Key Capabilities

- **Bitrix D7 Technical SEO**:
  - Detects `urlrewrite.php` duplicate numeric keys & SEF rule shadowing.
  - Detects `$APPLICATION->SetTitle()` / `SetPageProperty()` inside cached `template.php` instead of `component_epilog.php`.
  - Flags `RestartBuffer()` + `process404()` (Bitrix Quirks Mode trap; enforces `RestartWorkarea()`).
  - Audits `robots.txt`, `sitemap.xml`, `llms.txt` / `llms.php`, HTTP headers (`X-Powered-CMS`, anonymous `PHPSESSID`, Auto-Composite cache), canonical mirrors, and deferred `OnEpilog` OpenGraph tags.
- **Generative Engine Optimization (GEO / AI Search)**:
  - Readiness scoring (`0–100`) for Yandex Neuro, Google AI Overviews, ChatGPT Search, Perplexity, and Claude.
  - AI crawler policy checks, `/llms.txt` (static or multisite PHP router), passage-level citability (40–60 word direct answers, 134–167 word passages, question headings, spec tables), Schema.org grounding, and AI referral tracking.
- **Analytics, Funnel Telemetry & Owner SEO Reporting**:
  - Composite-safe `<head>` GTM / `gtag.js` (`send_page_view: false` hybrid) + Yandex.Metrika architecture, non-blocking Cookie Consent, and funnel bottleneck tracking (`search_empty`, `cart_abandoned`, phone/messenger clicks).
  - Production-tested REST API integration patterns for **Yandex.Metrika Stat API v1**, **Yandex.Webmaster API v4**, **GA4 Data API v1beta**, and **Google Search Console API v3** using pure Bitrix D7 (`\Bitrix\Main\Web\HttpClient`, zero Composer / `php-curl` dependencies), bot/staff exclusion, and business-owner UX.
- **5 Zero-Dependency CLI Tools (`scripts/`, Node.js 18+ built-ins only)**:
  - `bitrix-code-audit.mjs` — static audit of Bitrix codebase (`/local/`, `urlrewrite.php`, `robots.txt`, `sitemap.xml`, `llms.txt`, `RestartBuffer` 404 checks).
  - `fetch-seo.mjs` — live HTTP + HTML + headers + OpenGraph + hreflang + favicon + JSON-LD + analytics inspector.
  - `geo-check.mjs` — universal GEO & AI search readiness scorer (`0–100`) with `--json` support.
  - `seo-drift.mjs` — capture pre-deploy SEO/GEO baselines and detect post-deploy regressions.
  - `sf-analyze.mjs` — parse and compare Screaming Frog `internal_all.csv` exports.
- **9 Modular Skills + 2 Specialized Agents**:
  - Skills: `bitrix-seo-audit` (orchestrator), `bitrix-seo-technical`, `bitrix-seo-content-geo`, `bitrix-seo-schema`, `bitrix-seo-ecommerce`, `bitrix-seo-multisite`, `bitrix-seo-analytics`, `bitrix-seo-reporting`, `bitrix-seo-drift`.
  - Agents: `bitrix-seo-auditor`, `bitrix-schema-validator`.
- **Modular 4-Plugin Ecosystem Integration (`v2.1.0`)**:
  - Emits ICE-scored (`Impact × Confidence ÷ Effort`) findings with recommended Antigravity model tiers and `AC-001..N` acceptance criteria that plug directly into `antigravity-bitrix-core` (Central Orchestrator & Command Center Dashboard v2.0), alongside `antigravity-bitrix-qa` and `antigravity-bitrix-marketing`.

---

## Installation

### Requirements
- **Node.js 18+** (built-in `fetch`, `fs`, `path` — no `npm install` needed).
- **Google Antigravity IDE**.

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\antigravity-bitrix-seo-geo\install.ps1
```

### Linux / macOS
```bash
bash ./antigravity-bitrix-seo-geo/install.sh
```

The installer copies the plugin into `~/.gemini/config/plugins/antigravity-bitrix-seo-geo/`. Enable it in Antigravity Customizations UI.

---

## Quick CLI Usage

```bash
# 1. Static Bitrix codebase audit
node scripts/bitrix-code-audit.mjs /path/to/bitrix-project

# 2. Live URL SEO, OpenGraph, Analytics & JSON-LD check
node scripts/fetch-seo.mjs https://example.com/

# 3. Live URL GEO & AI Search readiness score (0-100)
node scripts/geo-check.mjs https://example.com/

# 4. Capture pre-deploy baseline & detect post-deploy SEO/GEO drift
node scripts/seo-drift.mjs baseline https://example.com/
node scripts/seo-drift.mjs compare https://example.com/

# 5. Analyze or diff Screaming Frog CSV exports
node scripts/sf-analyze.mjs docs/internal_all.csv
node scripts/sf-analyze.mjs docs/old_internal_all.csv docs/new_internal_all.csv
```

---

## Attribution & License

- MIT License — see [LICENSE](LICENSE).
- Incorporates SEO audit methodology and workflow concepts adapted from [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT).
