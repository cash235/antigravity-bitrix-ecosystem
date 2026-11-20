---
name: bitrix-seo-technical
description: >
  Technical SEO for 1C-Bitrix D7 (corporate sites to high-load multisite catalogs): component cache
  safety (component_epilog.php vs template.php), urlrewrite.php integrity, RestartWorkarea 404
  handling, canonical/301 redirects, automated sitemap.xml & IndexNow, Auto-Composite cache,
  BX_PULL_SKIP_INIT guest JS diet, deferred OpenGraph, and Core Web Vitals (LCP, INP, CLS).
---

# 1C-Bitrix Technical SEO (D7 Standard)

## 1. Component Cache & Metadata (`component_epilog.php`)
- **Rule**: `$APPLICATION->SetTitle()`, `SetPageProperty()`, `SetCanonicalUrl()`, and `AddHeadString()` MUST NOT rely solely on cached `template.php`.
- **Pattern**:
  1. In `result_modifier.php` or `template.php`, forward required keys via `$this->__component->SetResultCacheKeys(['NAME', 'IPROPERTY_VALUES', 'SEO_JSONLD', 'CANONICAL_URL', ...])`.
  2. Execute `$APPLICATION->SetTitle(...)` / `SetPageProperty(...)` and JSON-LD injection inside `component_epilog.php`.
  3. When core components or parent templates overwrite Title/Description later in the lifecycle, register a late `OnEpilog` handler (priority `9999`) for final authoritative values.

## 2. `urlrewrite.php` Integrity
- Never allow duplicate numeric keys in `$arUrlRewrite` (a later duplicate key silently overwrites the earlier rule).
- Place exact/specific regex rules (e.g., `/llms.txt`, `/filter/.../apply/`, `/disk/showFile/`) above generic catch-all rules.

## 3. Clean 404 Handling & Preventing Quirks Mode
- **NEVER call `$APPLICATION->RestartBuffer()` before `\Bitrix\Iblock\Component\Tools::process404()`** on HTML pages — `RestartBuffer()` discards `<!DOCTYPE html>`, `<head>`, and CSS, forcing browsers into Quirks Mode and breaking layout.
- Always use **`$APPLICATION->RestartWorkarea()`** followed by `Tools::process404('', true, true, true, '/404.php')`.

## 4. Canonical URLs, 301 Redirects & Phantom Pagination Protection
- **Single Source of Truth**: Output `<link rel="canonical">` once in `header.php` via `$APPLICATION->ShowProperty('canonical_url', ...)` stripping UTM/tracking params (`utm_*`, `yclid`, `gclid`, `fbclid`) and normalizing `/index.php` -> `/`.
- **Early `OnPageStart` 301 Redirects (`init.php`)**:
  - Redirect `/index.php` and `/section/index.php` -> `/` and `/section/` (preserving useful GET params, excluding POST/AJAX/`/bitrix/`/CLI).
  - Enforce canonical protocol + host (`https://domain.tld/`) without leaking `:443` in `Location` headers.
  - Enforce consistent trailing slash policy on SEF directories.
  - Strip parasitic `?PAGEN_*` params on static pages and detail cards via 301 redirect to the clean URL.
- **Phantom Pagination HTTP 404**:
  - In listing templates (`catalog.section`, `news.list`), compare requested `PAGEN_X` against `NavPageCount`; if `PAGEN_X > NavPageCount`, return genuine **HTTP 404** (`RestartWorkarea()` + `Tools::process404()`).
  - Set `<meta name="robots" content="noindex, follow">` on valid paginated pages `PAGEN_X > 1` (or align with your pagination strategy consistently).

## 5. Crawlability, Automated `sitemap.xml` & Instant Indexing
- **`robots.txt`**: Must return `200 OK`, allow CSS/JS/images and AI crawlers (see `bitrix-seo-content-geo`), disallow `/bitrix/`, `/local/`, `/search/`, `/personal/`, `/auth/`, `/crm/`, and declare HTTPS `Sitemap: https://domain.tld/sitemap.xml`.
- **Automated `sitemap.xml` Generation**:
  - Watch out for CLI/cron generators defaulting to `http://` when `$_SERVER['HTTPS']` is unset — explicitly lock `https://`.
  - Trigger non-blocking sitemap regeneration via D7 `Application::getInstance()->addBackgroundJob()` on `OnAfterIBlockElementAdd/Update/Delete` + a daily Bitrix agent (`86400s`).
  - For fast-moving inventory (unique items, classifieds, news), pair sitemap regeneration with **IndexNow** ping for instant Yandex/Bing discovery.

## 6. Deferred OpenGraph, Favicons & Server Signals
- **Deferred `og:title` / `og:description`**: Register an `OnEpilog` handler (priority `10000`) in `header.php` so static pages that call `$APPLICATION->SetTitle()` after `require header.php` never render empty `og:title` / `og:description`. Include `twitter:card` (`summary_large_image`).
- **Favicon (`120×120` PNG or SVG)**: Provide `<link rel="icon" href=".../favicon-120x120.png" sizes="120x120" type="image/png">` (or SVG) and `apple-touch-icon` to pass Yandex.Webmaster checklist recommendations.
- **Server & Composite Cache Hygiene**:
  - Enable Bitrix Auto-Composite (`AUTO_COMPOSITE = Y`) + Redis cache (`CacheEngineRedis`) to achieve TTFB `< 100ms` and eliminate anonymous `Set-Cookie: PHPSESSID` on cached GET hits.
  - Hide `X-Powered-CMS` / `X-DevSrv-CMS` / `X-Powered-By` via Nginx `headers-more` and add `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.
  - Include `webp|avif` in Nginx `expires max;` static locations.
  - Define both `BX_PULL_DISABLED` and `BX_PULL_SKIP_INIT` in `init.php` for public anonymous storefront visits on Bitrix24 boxes so `pull`/`protobuf`/`dexie` bundles do not bloat guest pages.
- **Core Web Vitals & Clean Assets**:
  - Target **LCP < 2.5s**, **INP < 200ms**, **CLS < 0.1**.
  - Load CSS/JS via `Bitrix\Main\Page\Asset::getInstance()`. Never add inline `<style>` or render-blocking `<script>`. Set explicit `width`/`height`, `alt`, and `loading="lazy"` on below-the-fold images.
