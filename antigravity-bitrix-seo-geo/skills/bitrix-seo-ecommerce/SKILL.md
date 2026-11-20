---
name: bitrix-seo-ecommerce
description: >
  Universal E-commerce & catalog SEO for 1C-Bitrix (new retail, B2B, and unique/used-unit catalogs):
  smart filter indexation, facet rules, pagination canonicals, out-of-stock UX, duplicate SKU/OEM
  meta-tag uniqueness, Merchant Listings fallbacks, section meta inheritance, and colloquial queries.
---

# Bitrix E-Commerce & Catalog SEO

Applies to any 1C-Bitrix catalog (`iblock` + `catalog` modules) — both standard multi-quantity retail stores and unique-unit / B2B / OEM catalogs.

## 1. Smart Filter & Facets (`/filter/.../apply/`)
- Index only validated high-demand SEO landing combinations (via dedicated SEO filter router or curated landing pages with unique `H1`, `Title`, `Description`, self-referencing `canonical`, and intro copy).
- Block infinite multi-attribute filter combinations from indexing via `<meta name="robots" content="noindex, follow">` and canonical to the parent section.
- Exclude sort/view/page-size query parameters (`?sort=`, `?order=`, `?view=`, `?SHOWALL_1=`) via canonical to the clean section URL and `robots.txt` `Clean-param` (for Yandex).

## 2. Catalog Sections, Root Listings & Pagination (`?PAGEN_1=N`)
- **Prevent Root Meta Inheritance**: Ensure subsections compute their own `Title`/`Description` from section `IPROPERTY_VALUES` (with clean fallback to section name + regional suffix) so hundreds of subsections never inherit the root `/catalog/` Title/Description.
- **Guard `SHOW_ALL_WO_SECTION`**: Only enable `SHOW_ALL_WO_SECTION => "Y"` on the true catalog root; on non-existent section paths validate via `\Bitrix\Iblock\SectionTable` and return clean **HTTP 404** (`RestartWorkarea()` + `Tools::process404()`).
- **Pagination**:
  - Return **HTTP 404** when requested `PAGEN_X > NavPageCount` (eliminates infinite phantom pagination).
  - Append unique page indicator (`— Страница N`) or apply consistent `noindex, follow` on `PAGEN_X > 1` with clean self-canonical.

## 3. Out-of-Stock Handling & Conversion UX
- **Zero Stock**: Do **NOT** return `404` for temporarily out-of-stock or on-order products that still receive search traffic.
  - Keep `200 OK`, set JSON-LD `Offer.availability` to `https://schema.org/OutOfStock` or `https://schema.org/PreOrder`.
  - Switch the primary CTA from *"Buy"* to *"Order / Request"* with a clear visible note that managers can source the item or suggest in-stock equivalents/analogs.

## 4. Duplicate SKUs / Unique Physical Inventory Units
- In catalogs where multiple physical items share the same SKU/OEM/name (used goods, refurbished equipment, auto parts, unique batches):
  - **Never auto-merge or deactivate distinct inventory IDs** that are tracked individually in warehouse/CRM accounting.
  - Prevent search engines (`indexing/double-descriptions/`) from flagging duplicate `<title>` and `<meta name="description">` tags by appending the unique catalog inventory ID (e.g., `(№{$arResult['ID']})`) in `component_epilog.php`.
  - Strip unexpanded Bitrix `#MACRO#` placeholders (e.g., `#ELEMENT_NAME#`) and sanitize keyword-stuffed `#hashtag` spam from imported descriptions (with Unicode/Cyrillic regex `(*UCP)`).

## 5. Product Metadata Templates (`b_iblock_iproperty`) & Colloquial Queries
- Configure Bitrix InheritedProperty templates (`{=this.Name}`, `{=this.property.ARTNUMBER}`, `{=this.property.BRAND}`) targeting 50–60 char Titles and 120–160 char Descriptions.
- **Merchant Listings Fallbacks (`component_epilog.php`)**: Always guarantee non-empty `image`, `brand`, and `sku`/`mpn` in `Product` JSON-LD even when an individual catalog item lacks photos or a brand property.
- **Colloquial / Transliterated Buyer Queries**: Real buyers often search Latin brand/model names in local script (e.g., Cyrillic transliterations). Plan dedicated SEO landings or natural synonym blocks without creating duplicate-page cannibalization.
