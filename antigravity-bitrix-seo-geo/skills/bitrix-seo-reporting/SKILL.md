---
name: bitrix-seo-reporting
description: >
  Production-tested architecture for building real-data SEO & Traffic Owner Dashboards inside
  1C-Bitrix D7 (without Composer or php-curl). Covers official REST API pitfalls and best practices
  for Yandex.Metrika Stat API v1, Yandex.Webmaster API v4, GA4 Data API v1beta, Google Search
  Console API v3, RS256 Service Account auth, bot/staff exclusion, first-party sendBeacon telemetry,
  CRM attribution, and business-owner UX (plain-language tooltips, Mobile vs Desktop, AI channels).
---

# Bitrix SEO Reporting & Real Analytics API Architecture (D7 Standard)

Use this skill when building or auditing an internal SEO/marketing analytics dashboard in 1C-Bitrix (e.g., `/manager/seo-report/` or `/local/` admin widgets) powered by live Yandex and Google APIs, first-party telemetry, and Bitrix CRM.

---

## 1. Transport, Security & Caching Architecture (Zero External Dependencies)

1. **BitrixVM-Safe HTTP Client (No `php-curl` Required)**:
   - Many BitrixVM servers ship without the `php-curl` extension. Wrap HTTP requests in a dedicated D7 `HttpJsonClient` using `\Bitrix\Main\Web\HttpClient(['useCurl' => false, 'socketTimeout' => 6, 'streamTimeout' => 15])`, with automatic fallback to `curl_init()` for standalone CLI test scripts.
2. **Zero Secrets in Git (`b_option`)**:
   - Store OAuth tokens (Yandex) and Google Service Account JSON keys strictly in Bitrix `b_option` (via `\Bitrix\Main\Config\Option::get/set` with `SITE_ID = ''` when multiple domains share one DB), editable only by Administrators (Group `1`).
   - Implement Google OAuth2 Service Account JWT (`RS256`) signing natively with PHP `openssl_sign()` — zero Composer packages required; cache the Bearer access token in `\Bitrix\Main\Data\Cache` (~50 min TTL).
3. **Cache Discipline & Versioned Keys**:
   - Cache external API responses for `1800s` (30 min) with a manual `force_refresh` bypass button.
   - Prefix cache keys with schema versions (`ym_v2_`, `gsc_v2_`) so structure changes invalidate old cached payloads cleanly.
   - **Lightweight Previous-Period Queries**: Never invoke a full 6–7 call `fetchReport()` just to compute `% growth` vs the previous period — add a dedicated 1-call `fetchUsersOnly()` method (`ym:s:users` / `activeUsers`) to cut API latency in half and prevent rate-limit timeouts.

---

## 2. Official API Pitfalls & Mandatory Guardrails (Battle-Tested)

### 2.1. Yandex.Metrika Stat API v1 (`/stat/v1/data` & `/bytime`)
- **CRITICAL — `lang=ru` Consistency Trap**: If your bot-country exclusion filter uses localized country names (`NOT(ym:s:regionCountryName=.('Сингапур','Китай',...))`), you **MUST** enforce `'lang' => 'ru'` inside the shared request helper for **EVERY** sub-query (`summary`, `bytime`, `devices`, `channels`, `geo`, `ecom`). Omitting `lang=ru` on a single sub-query causes Metrika to return English country names, silently disabling the bot filter and wildly inflating Direct / Desktop counts!
- **Accuracy Fallback**: Start with `'accuracy' => 'full'` and automatically fall back `'medium' -> 'low'` if Metrika rejects long date ranges as too complex.
- **E-commerce Product Card Views**: Fetch `ym:s:ecommerceDetailsVisits` (fallback `ym:s:productImpressions` / `ym:ev:productImpressions`) in a separate resilient call so counters without E-commerce enabled do not break the main report.
- **Devices & Channels**: Segment by `ym:s:deviceCategory` (`1` = Desktop, `2`/`3` = Mobile/Tablet) and `ym:s:lastsignTrafficSource,ym:s:lastsignSearchEngineRoot`.

### 2.2. Yandex.Webmaster API v4
- **Never request `CTR` on `/search-queries/popular`**: The API rejects `query_indicator=CTR`; request `TOTAL_SHOWS`, `TOTAL_CLICKS`, `AVG_SHOW_POSITION` and compute `CTR = clicks / shows * 100` in PHP.
- **Accurate Totals & Device Splits**: Use `/search-queries/all/history` with `device_type_indicator` (`ALL`, `MOBILE_AND_TABLET`, `DESKTOP`) and **clamp returned points strictly to `$dt >= $dateFrom && $dt <= $dateTo` in PHP**.
- **New Domains (`404 HOST_NOT_LOADED`)**: Handle HTTP `404` on `/summary` gracefully as *"New domain queued for indexing"* rather than an API connection failure.
- **Sitemap Freshness**: Read `last_access_date` from `/user/{uid}/hosts/{host}/sitemaps`.

### 2.3. Google Analytics 4 Data API v1beta (`:runReport`)
- **Exact `activeUsers`**: Always fetch top-level `activeUsers` in an un-grouped aggregate query. **NEVER sum `users` across `country` or `date` rows** — that double-counts returning visitors and diverges from the GA4 UI.
- **Strict Organic Search Filter**: Filter by `sessionDefaultChannelGroup == 'Organic Search'` AND exclude referral noise (`metrika`, `webmaster`) when isolating Yandex/Google organic visits.
- **AI Search Channel (GEO Tracking)**: Extract AI assistant referrals (`sessionSource` matching `chatgpt`, `perplexity`, `claude`, `gemini`, or `sessionDefaultChannelGroup` containing `ai`) into a dedicated **AI Search** channel. When combining GA4 AI counts with Metrika channels, subtract `ai` from Metrika's `other` bucket to avoid double-counting.

### 2.4. Google Search Console API v3 (`/searchAnalytics/query`, `/sitemaps`)
- **No Bulk Index Count API**: `sitemaps.contents[].indexed` is officially deprecated and always empty/unreliable. Display the honest metric **`pages_with_impressions`** via `dimensions: ['page']` (`rowLimit: 5000`) alongside a direct link to the GSC Indexing UI (`https://search.google.com/search-console/index?resource_id=...`).
- **Sitemap URL Deduplication**: Never sum `submitted` across both `isSitemapsIndex: true` and child sitemaps — use `max($indexUrls, $childUrls)`.
- **Device Breakdown Resilience**: Retry `dimensions: ['device']` once on transient failure, and **do not cache** the response if total `impressions > 0` while both mobile and desktop device buckets are `0`.

---

## 3. Bot & Staff Exclusion (Composite-Safe)

1. **Datacenter Bot Filtering**: Combine `ym:s:isRobot=='No'` with exclusion of non-target 0-second high-bounce bot countries (configurable per target market). Always expose a toggle so owners can inspect excluded traffic in the Geography table.
2. **3-Level Staff Exclusion**:
   - **Cookie (`staff_optout=1`, 365d)** set automatically for logged-in managers/admins (and manually via `?staff_optout=1` link) — read in JS on the storefront to suppress Metrika/GA4/GTM without breaking Auto-Composite HTML caching.
   - **24h Auto-Captured Staff IPs**: Automatically record external IPs on every `/manager/` login (supporting multiple IPs per staff member across office PC, Wi-Fi, and 4G) in `b_option` with 24h TTL.
   - **Permanent Office IP List + Lightweight Check**: Let admins add office IPs in settings; a lightweight `?check_staff=1` check sets the opt-out cookie and suppresses first-party telemetry logging.

---

## 4. First-Party Telemetry & CRM Attribution

- **Why First-Party Telemetry (`navigator.sendBeacon`)**: GA4/Metrika have reporting delays and cannot easily expose arbitrary zero-result search strings (`search_empty`) or per-product funnel rows (`PRODUCT_ID`) without quota/cardinality limits.
- Store lightweight events (`SITE_ID`, `EVENT_TYPE`, `TRAFFIC_SOURCE`, `DEVICE_TYPE`, `PRODUCT_ID`, `SEARCH_QUERY`, `PAGE_URL`) in an auto-migrated custom MySQL table.
- **Honest CRM Revenue Split**: Tag web-originated CRM deals with `SOURCE_ID = 'WEB'` inside the order processor. In the dashboard, display **Website CRM Deals** separately from **Total Company CRM Deals (all channels)** filtered by `MYCOMPANY_ID` per site.

---

## 5. Business-Owner UX Standards

- **Zero-Jargon Presentation**: Pair every technical SEO/analytics metric with a compact hover/click tooltip (`?`) stating **what it measures** and **which direction is better** (e.g., *Bounce Rate: lower % is better*; *Position: smaller number = higher rank, 1–10 = page 1*; *CTR %: higher % is better*; *Search clicks vs Unique visitors: one person may click multiple times*).
- **Synced Colors Across Funnel & Chart**: Match chart series colors 1:1 with funnel steps (`Visitors` → `Product/Service Views` → `Leads/Orders`).
- **Actionable Views**: Provide `Mobile vs Desktop` comparison with automated plain-language diagnosis, `Queries with Clicks > 0` filter + CSV export, and `Zero-Result Site Searches` as a direct procurement/content action list.
