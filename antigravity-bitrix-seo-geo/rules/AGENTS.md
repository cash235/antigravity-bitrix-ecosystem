# Bitrix SEO & GEO Guardrails (Always Active)

When working in any 1C-Bitrix project with `antigravity-bitrix-seo-geo` enabled, always enforce these rules:

1. **Preserve Metadata & Component Cache Safety**:
   - Never place `$APPLICATION->SetTitle()`, `SetPageProperty()`, `AddHeadString()`, or canonical links inside cached `template.php` without forwarding data via `$component->SetResultCacheKeys()`. Always execute SEO setters in `component_epilog.php` or uncached page context.
   - Use deferred `OnEpilog` (late priority) for default `og:title` / `og:description` fallback when pages set Title/Description after `header.php`.
2. **Protect `urlrewrite.php` Integrity**:
   - Never introduce duplicate numeric keys in `$arUrlRewrite` (later keys silently overwrite earlier SEF rules). Keep specific rules above catch-all rules.
3. **Preserve 404 Layout & Prevent Quirks Mode**:
   - Never call `$APPLICATION->RestartBuffer()` before `Tools::process404()` on standard HTML pages — it strips `<!DOCTYPE html>` and `<head>`. Use `$APPLICATION->RestartWorkarea()` instead.
4. **Preserve Schema.org, GEO & Semantic HTML5**:
   - Never remove or break existing JSON-LD (`<script type="application/ld+json">`), Schema.org Microdata (`itemscope`, `itemtype`, `itemprop`), or `/llms.txt` endpoints.
   - Keep exactly one `<h1>` per page, valid heading hierarchy (`h1 -> h2 -> h3`), and SSR-rendered key facts so zero-JS AI crawlers can extract passages.
5. **Clean Assets, Analytics & Core Web Vitals**:
   - Avoid inline `<style>` and `<script>` blocks in Bitrix templates/components; use `Bitrix\Main\Page\Asset::getInstance()`.
   - Do not add render-blocking scripts; set explicit `width`/`height`, `alt`, and `loading="lazy"` on below-the-fold images.
   - Never gate `<head>` Google/Yandex tags behind PHP `User-Agent` checks when Auto-Composite cache is enabled, and never commit API tokens or Service Account JSON keys to Git (store in `b_option`).
6. **Prevent Index Bloat & Duplicate Mirrors**:
   - Keep `robots.txt`, `sitemap.xml`, and `llms.txt` valid, HTTPS-canonical, and isolated per site in multisite setups.
   - Ensure smart filter facets (`/filter/.../apply/`), sort/view query params, and phantom pagination (`PAGEN_X > NavPageCount`) do not create uncontrolled indexable duplicates.
7. **Core Isolation**:
   - Never modify `/bitrix/` core files. All SEO, GEO, and analytics customizations belong in `/local/`.
