---
name: bitrix-seo-analytics
description: >
  Universal Web Analytics (GTM, GA4, Yandex.Metrika), Google Search Console, Cookie Consent,
  Staff Opt-Out, and Funnel Bottleneck Tracking for any 1C-Bitrix D7 site (corporate to multisite
  E-commerce). Covers Composite-safe <head> Google Tag & hybrid gtag.js, _ga_* deduplication,
  non-blocking consent UX, E-commerce & lead goals, and Chrome DevTools MCP (--autoConnect) auditing.
---

# Bitrix Web Analytics, Consent & Funnel Tracking Standard

## 1. Golden Architecture: Google Tag (`GTM` / `GA4`) + Yandex.Metrika in 1C-Bitrix D7

### 1.1. Single Google Tag in `<head>` & Hybrid GTM/gtag Pattern
- **Case A — GTM only (with full triggers configured inside GTM)**:
  - Load `gtm.js?id=GTM-XXXXXXX` once immediately after `<head>` in `header.php` (controlled by site config so staging/dev domains stay clean). Place `<noscript><iframe>` right after `<body>`.
  - Never load a second independent `gtag('config', 'G-...')` that also fires `page_view`, or you will double-count page views and create conflicting `_ga_*` cookies.
- **Case B — Hybrid GTM + Direct `gtag.js` (when GTM only triggers `page_view` and lacks custom event triggers)**:
  - Load `gtag/js?id=G-XXXXXXXXXX` alongside GTM and configure it with **`{'send_page_view': false}`**:
    ```js
    gtag('config', 'G-XXXXXXXXXX', { send_page_view: false });
    ```
  - This guarantees custom events (`view_item`, `add_to_cart`, `purchase`, `search_empty`, phone/messenger clicks) always reach GA4 directly without duplicating `page_view`!
- **Auto-Composite Cache Compatibility**:
  - Do **NOT** hide `<head>` analytics tags behind PHP `User-Agent` checks when Bitrix Auto-Composite (`AUTO_COMPOSITE = Y`) is active, or a bot-warmed composite cache page will omit the tag for Google's verification scanner and human visitors.
  - Check staff opt-out (`cookie`) strictly on the client side in JS before initializing tags so Composite HTML stays 100% shared and fast.
- **Yandex.Metrika Best Practices**:
  - Provide a lightweight early `window.ym` queue stub so early user clicks before `tag.js` finishes loading are never lost.
  - Keep `tag.js` deferred via first-interaction + `2000ms` post-`load` fallback (skipping headless Lighthouse/PageSpeed bots if desired) and expose a clean global init hook (e.g. `window.SiteAnalyticsInit`).
  - Always include a non-empty `alt="Yandex.Metrika"` on the `<noscript><img src="https://mc.yandex.ru/watch/..."></noscript>` pixel so SEO crawlers never flag a missing image `alt`.

---

## 2. Non-Blocking Sticky Cookie Consent Banner (GDPR / 152-ФЗ / 99-З)

1. **UX & Bounce Rate Protection**:
   - Render as a compact floating bottom bar (`position: fixed; bottom: 18px; z-index: 1035`), never as a screen-blocking modal overlay; shift upward dynamically on mobile above sticky call/chat bars.
2. **Triple Storage Persistence**:
   - Persist consent (`site_cookie_consent_accepted = 'Y'`, 365 days) across `document.cookie` (`SameSite=Lax; Secure`), `localStorage`, and `sessionStorage`.
3. **Consent Event Tracking**:
   - On accept, invoke the analytics init hook and emit `cookie_accepted` to GA4, Yandex.Metrika (`reachGoal`), and `dataLayer`.

---

## 3. Universal Funnel Bottleneck Event Matrix

Adapt the stages below to either **Lead-Gen / Corporate / Service** sites or **E-commerce Catalogs**:

| Funnel Stage | Event / Goal Name (`GA4` / `YM`) | Purpose / Bottleneck Detected |
|---|---|---|
| **1. Consent** | `cookie_accepted` | Share of visitors accepting analytics/cookies |
| **2. Trust / Info Pages** | `visit_about`, `visit_delivery`, `visit_contacts` | Engagement with E-E-A-T, pricing, delivery, and contact pages |
| **3. Site Search** *(Catalogs)* | `site_search`, `view_search_results`, `search_empty` | Search adoption vs **zero-result queries** (unmet demand / catalog gaps) |
| **4. Product / Service View** | E-commerce `detail` / GA4 `view_item` | Product/service card impressions (guard with a per-page dedup flag against double firing) |
| **5. Direct Contact** | `phone_click_card` vs `contact_click` | Separate high-intent phone clicks inside product/service buy-blocks from general header/footer calls & messengers |
| **6. Cart / Order Modal** | E-commerce `add` + `add_to_cart`, `order_modal_open` | Clicking *"Buy"*, *"Order"*, or *"Request Quote"* |
| **7. Form Friction** | `order_validation_error`, `cart_abandoned` | Validation errors vs **Abandoned Form** (user typed input then closed modal or navigated away without submitting) |
| **8. Conversion Completed** | E-commerce `purchase` + `order_submit` / `lead_submit` | Completed checkout or lead submission with `transaction_id` and value |

---

## 4. Accessible Icon Links & Core Hygiene

- Every icon-only `<a>` (`tel:`, `/auth/`, `/account/`, messengers) MUST include `title`, `aria-label`, and a screen-reader `<span class="sr-only">` so crawlers never report `Image/SVG Link without Alt Text`.
- Use `navigator.sendBeacon` for outbound `tel:` / messenger clicks so navigation never cancels the analytics hit.

---

## 5. Live Browser Auditing Workflow (Chrome DevTools MCP)

When inspecting live analytics consoles via Chrome DevTools MCP (`--autoConnect` in Chrome 144+ with `chrome://inspect/#remote-debugging`):
- Verify active GTM tags/triggers (`tagmanager.google.com`) and live Realtime events in GA4 (`analytics.google.com`).
- Check Google Search Console (`search.google.com/search-console`) for Indexing, Merchant Listings, and Sitemaps status.
- Check Yandex.Webmaster (`webmaster.yandex.ru`) for `optimization/checklist/`, `indexing/double-descriptions/`, and `indexing/sitemap/`.
- Verify JS event goals in Yandex.Metrika (`metrika.yandex.ru`).
- Run CLI checks:
  ```bash
  node scripts/bitrix-code-audit.mjs <project-root>
  node scripts/fetch-seo.mjs https://example.com/
  node scripts/geo-check.mjs https://example.com/
  ```
