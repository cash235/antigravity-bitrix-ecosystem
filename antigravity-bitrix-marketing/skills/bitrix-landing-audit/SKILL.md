---
name: bitrix-landing-audit
description: >
  39-point Landing Page, Product Card & Conversion Path Audit for 1C-Bitrix D7 storefronts and
  service pages. Adapted from marketing-skills (landing-page-audit-39 + conversion-path-analysis)
  to eliminate above-the-fold confusion, checkout friction, mobile drop-off, and dead-end OOS flows
  without harming SEO or Core Web Vitals.
---

# 1C-Bitrix 39-Point Landing & Conversion Path Audit (`bitrix-landing-audit`)

Use this skill to systematically audit any 1C-Bitrix landing page, catalog category, product card (`catalog.element`), or checkout path (`sale.order.ajax`) and turn drop-offs into ICE-prioritized engineering fixes.

---

## The 39-Point Audit Matrix (6 Blocks)

### A. Above-the-Fold Clarity & Value Proposition (Points 1–7)
1. **5-Second Test**: Visitor understands *what is sold, for whom, and why here* without scrolling.
2. **Single `<h1>` Message Match**: Matches the incoming search/ad query (Yandex.Direct / Google / organic).
3. **One Primary CTA**: High-contrast action button (`В корзину` / `Рассчитать стоимость`) visible on both `1440px` and `390px`.
4. **Subordinate Secondary CTA**: At most one quiet secondary option (`Позвонить` / `Мессенджер`).
5. **Visual Proof**: Real product/warehouse/work photo (explicit `width`/`height`/`alt`), zero generic stock clichés.
6. **Price & Currency Transparency**: Clear price (`tabular-nums`), unit, VAT/discount math, and stock/delivery timing.
7. **Zero First-Paint Obstruction**: No blocking full-screen promo popups or uncloseable cookie walls hiding the offer.

### B. Trust, Risk Reversal & Local Proof (Points 8–14)
8. Real company NAP (address, phone, working hours, legal entity) consistent with `LocalBusiness` JSON-LD.
9. Concrete warranty / return policy (e.g., 14-day return, check-on-delivery, OEM fitment guarantee).
10. Real delivery & pickup conditions (cities, couriers, free-shipping threshold, real dispatch time).
11. Authentic reviews/cases (no fabricated 5.0 stars or fake countdown timers).
12. Payment method clarity (cards, SBP, B2B invoice with VAT, cash on delivery).
13. Security & consent hygiene (HTTPS, clean 152-FZ / 99-Z / GDPR checkbox copy).
14. Direct expert contact for complex B2B/auto-parts selection (VIN/OEM lookup, spec consultation).

### C. Product Card & Catalog Usability (Points 15–22)
15. Scannable technical spec table (SSR HTML — helps both buyers and AI search citation!).
16. Clear SKU/OEM code with 1-click copy for technical buyers.
17. Out-of-Stock recovery: keeps HTTP 200 and replaces disabled Buy button with *«Под заказ / Найти аналог / Сообщить»*.
18. Zero-Result Search recovery: offers popular categories, OEM hint, or instant manager request.
19. Smart filter clarity: applied filters visible as removable chips + instant count feedback.
20. Clean gallery zoom/swipe on mobile without layout shift (CLS).
21. Honest urgency only (real warehouse stock count from `b_catalog_store`, never fake timers).
22. Internal cross-links to compatible accessories / analogs without cluttering the primary CTA.

### D. Conversion Path & Form Friction (Points 23–30)
23. Minimum required checkout/lead fields (phone or email + name; defer optional details).
24. Clear inline validation with human Russian error messages (never silent submit failure).
25. Phone mask & numeric keyboard (`inputmode="tel"`, `autocomplete="tel"`).
26. Guest checkout / 1-click quick order option without forced registration.
27. Transparent cart summary (subtotal + delivery + final total updated reliably without AJAX races).
28. Explicit loading state + double-submit guard on CTA buttons (`bitrix-click-path-audit`).
29. Clear confirmation page/toast with order number and next step (*«Менеджер свяжется в течение 15 мин»*).
30. Verified analytics goal firing once per real lead/order (`GA4` + `Yandex.Metrika`).

### E. Mobile Craft & Performance (Points 31–35)
31. Zero horizontal overflow at `375px` / `390px`.
32. Tap targets `>= 44×44px` with breathing room.
33. Input font size `>= 16px` (prevents iOS Safari auto-zoom).
34. Fast LCP (`< 2.5s`) — no heavy unoptimized hero banners or render-blocking chat widgets.
35. Sticky mobile CTA bar on long product/service pages (non-overlapping with cookie/messenger widgets).

### F. SEO, GEO & Technical Preservation (Points 36–39)
36. Semantic headings (`h1 -> h2 -> h3`) preserved after CRO edits.
37. `Product`/`Offer`/`Service`/`FAQPage` JSON-LD intact.
38. All CSS/JS registered via `Asset::getInstance()` in `/local/templates/`.
39. Post-change baseline verified via `bitrix-seo-drift` & `bitrix-visual-gate`.

---

## Deliverable Format

Score each block (`Pass / Partial / Fail` → total `/39`), name the funnel stage (`Discovery → Consideration → Cart/Lead`), cite observed page/template evidence, and output top 5–8 fixes ranked by **ICE** + **Q1–Q4 × S/M/L** with exact `/local/templates/` paths.
