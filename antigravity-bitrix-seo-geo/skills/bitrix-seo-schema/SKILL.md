---
name: bitrix-seo-schema
description: >
  Universal Schema.org structured data (JSON-LD and Microdata) for any 1C-Bitrix website:
  WebSite + SearchAction, Organization, LocalBusiness (Store/OnlineStore/Service/vertical subtypes),
  CollectionPage + ItemList, Product + Offer (Merchant Listings fallbacks), BreadcrumbList,
  FAQPage, Service, and Article.
---

# Bitrix Schema.org & Structured Data Standard

## 1. Preferred Format & Cache Safety
- Prefer **JSON-LD** (`<script type="application/ld+json">`) rendered in `component_epilog.php` or uncached page context using `json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`.
- If Microdata (`itemscope`, `itemtype`) already exists in legacy templates, avoid competing/duplicate top-level entities (e.g., remove global footer `LocalBusiness` Microdata if it conflicts with `Product` on detail pages, and use clean `@graph` JSON-LD instead).

## 2. Core Schemas by Site Type

### A. Any Bitrix Site (Homepage, Info & Service Pages)
1. **Homepage `@graph` (`WebSite` + `Organization`/`LocalBusiness`)**:
   - `WebSite` with `url`, `name`, and `potentialAction` (`SearchAction` pointing to site search URL if search exists).
   - `Organization` or `LocalBusiness` (or the most accurate vertical subtype: `Store`, `OnlineStore`, `ProfessionalService`, `MedicalClinic`, `AutoPartsStore`, `AutoRepair`, etc.) with `@id`, `name`, `url`, `logo`, `telephone`, `address` (`PostalAddress`), `geo` (`GeoCoordinates`), `openingHoursSpecification`, `sameAs`.
2. **`BreadcrumbList`**:
   - Mirror Bitrix breadcrumb chain (`$APPLICATION->GetNavChain`) with **absolute HTTPS** `item` URLs (never relative paths).
3. **`Service` / `FAQPage` / `Article`**:
   - `Service`: `name`, `provider` (`@id`), `areaServed`, `offers` (if price range exists).
   - `FAQPage`: Use only when matching Q&A blocks are visibly rendered on the page.
   - `Article` / `NewsArticle`: `headline`, `image`, `datePublished`, `dateModified`, `author`, `publisher`.

### B. Bitrix E-Commerce (Catalog Sections & Product Cards)
4. **`CollectionPage` + `ItemList` (Catalog Sections)**:
   - Forward compact item array (`SEO_ITEM_LIST`) via `SetResultCacheKeys()` in `result_modifier.php` and output `CollectionPage` + `ItemList` (`ListItem` with `position`, `url`, `name`) in `component_epilog.php`.
5. **`Product` + `Offer` (Catalog Detail — Google Merchant Listings Safe)**:
   - Required & strongly recommended: `@type: "Product"`, `name`, `image` (non-empty fallback to default placeholder if product lacks photos), `description`, `sku`, `mpn` (fallback to SKU/ID when manufacturer code is absent), `brand` (`@type: "Brand"` with store/manufacturer fallback so Merchant Listings never flags missing `brand`).
   - `offers`: `@type: "Offer"`, `price` (numeric dot-formatted), `priceCurrency` (ISO 4217), `availability` (`InStock` / `PreOrder` / `OutOfStock`), `url` (canonical HTTPS), `seller` (`@type` matching business entity), plus optional `itemCondition`, `hasMerchantReturnPolicy`, `shippingDetails`.

## 3. Validation
- Never leave placeholder values (`[URL]`, `[Phone]`, empty `price`, or `http://` links).
- Verify live pages with:
  ```bash
  node scripts/fetch-seo.mjs https://example.com/ --json
  ```
