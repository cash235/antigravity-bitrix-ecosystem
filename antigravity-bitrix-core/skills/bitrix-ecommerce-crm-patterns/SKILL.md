---
name: bitrix-ecommerce-crm-patterns
description: >
  Universal 1C-Bitrix E-commerce, Catalog, Warehouse (StoreControl), Multicurrency, CRM (Bitrix24
  Box), and 1C Exchange engineering patterns. Covers safe D7 Sale/Catalog/Crm operations, stock
  reservations & realizations, user-contact synchronization, currency integrity, and staging guards.
---

# 1C-Bitrix E-Commerce, Warehouse & CRM D7 Patterns

Use this skill when building or maintaining online stores, B2B catalogs, custom manager cabinets, or Bitrix24 CRM integrations on 1C-Bitrix.

---

## 1. Catalog, Prices & Warehouse (`iblock` + `catalog`)
- **Stock Source of Truth**: When Warehouse Accounting (`StoreControl`) is enabled, per-warehouse amounts live in `b_catalog_store_product` (`\Bitrix\Catalog\StoreProductTable`). Keep aggregate `b_catalog_product.QUANTITY` and `AVAILABLE` synchronized after any programmatic stock change.
- **Unique / Single-Unit Inventory (Used Goods, Serialized Equipment)**:
  - Distinct catalog `ID`s sharing the same SKU/OEM represent physically separate warehouse items — never merge or delete them blindly; enforce atomic reservation on order creation and restore stock on cancellation.
- **Role-Based Stock Control**: Restrict manual stock overrides in custom admin forms to an explicit whitelist/role helper rather than granting blanket edit rights to all managers.

## 2. Multicurrency Architecture (`currency`)
- **Never Change Base Kernel Currency Mid-Project**: `b_currency.BASE = 'Y'` anchors historical rates in `b_catalog_currency_rate` and stored prices. Keep one stable base currency and convert storefront/report values dynamically via a dedicated `CurrencyService`.
- **Clean Bank Rates in DB**: Store clean official exchange rates (e.g., Central Bank via daily Bitrix agent) in `b_catalog_currency_rate`; apply commercial markups only in code (`CurrencyService::convertPrice()`) so cost/margin reports remain exact.
- **Rounding Precision**: Persist monetary amounts rounded strictly to 2 decimal places (`round($val, 2)`) and recalculate order/deal totals server-side on every product row update.

## 3. CRM & Storefront Integration (`crm` + `sale`)
- **Web Order Attribution**: Explicitly tag storefront-created CRM deals/orders with `SOURCE_ID = 'WEB'` (or site-specific source) so online conversion reports cleanly separate web orders from offline phone/walk-in deals.
- **User ↔ CRM Contact Sync**: Link `b_user` and `b_crm_contact` bidirectionally via user fields (e.g., phone-normalized login + explicit `UF_` link fields) inside a dedicated `CustomerSyncService` to prevent duplicate customer records.
- **CRM Factory Operations & Store Control**:
  - When updating CRM deals via `\Bitrix\Crm\Service\Container::getInstance()->getFactory(\CCrmOwnerType::Deal)`, be aware of background inventory automation conflicts (`INVENTORY_MANAGEMENT_ERROR`); manage shipment/realization documents explicitly in a dedicated service (`StoreRealizationService`) and keep operations idempotent.
  - Never bind warehouse stock reservations to unverified Leads — reserve stock only on confirmed Orders/Deals.
- **Consistent Accounting Date (1C Exchange Safety)**: When syncing orders/deals with 1C accounting, ensure deal close date, payment date, shipment/realization date, and warehouse deduction doc date stay aligned to one canonical business transaction date.

## 4. Staging / Test Environment Isolation
- When a `staging` / `test` site shares the same database or server pool as production:
  - Protect it with a lightweight access guard (PIN / IP / auth) and a visible warning banner so staff never confuse test orders with live orders.
  - Serve `Disallow: /` in staging `robots.txt` and disable production analytics tags and 1C/payment webhooks on the staging `SITE_ID`.
