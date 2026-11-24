---
name: bitrix-seo-local
description: >
  Local SEO, Multi-Branch Stores/Warehouses & Maps optimization for 1C-Bitrix D7 websites.
  Covers NAP consistency, b_catalog_store branch landing pages, LocalBusiness/Store JSON-LD
  with GeoCoordinates & OpeningHours, Yandex.Business / 2GIS / Google Business Profile audits,
  and review sentiment/reply triage with mandatory confirm-gate before any write action.
---

# 1C-Bitrix Local SEO, Branches & Maps (`bitrix-seo-local`)

Use this skill for any 1C-Bitrix business with physical stores, auto-parts pickup points, service centers, offices, or regional delivery branches.

---

## 1. Local SEO Audit Workflow (Read-Only by Default)

1. **NAP Consistency Check (Name, Address, Phone)**:
   - Compare canonical NAP across: `header.php`, `footer.php`, `/contacts/`, regional `SITE_ID` configs (`b_lang`), `b_catalog_store` warehouses/branches, `/llms.txt`, and `LocalBusiness`/`Store` JSON-LD.
   - Flag any mismatch in phone formatting, postal code, street abbreviation, legal name, or working hours across templates and structured data.
2. **Bitrix Store & Regional Branch Pages (`b_catalog_store` / `catalog.store.list`)**:
   - Each physical city/branch needs a unique indexable URL (e.g., `/contacts/<city-or-branch>/`) with:
     - Single `<h1>` containing service/brand + city/district;
     - Exact address, click-to-call `tel:`, messenger links, embedded map (lazy-loaded to protect LCP!), driving/parking directions, and branch-specific `LocalBusiness` JSON-LD (`geo`, `openingHoursSpecification`, `hasMap`, `sameAs`).
   - In multisite Bitrix (`s1`, `s2`, `s3`), ensure regional domains never leak another region's address or currency into `footer.php` or `Organization` JSON-LD (`bitrix-seo-multisite`).
3. **External Directory & Maps Completeness (Yandex.Business, 2GIS, Google Business Profile)**:
   - Audit primary + secondary categories, filled attributes (delivery, parking, payment methods, warranty), up-to-date holiday hours, high-resolution real photos (exterior, interior, products), and UTM-tagged website links (`?utm_source=yandex_maps&utm_medium=organic` — verify canonical strips UTM params so zero duplicate indexation!).
   - Verify price-list / YML feed sync to Yandex.Business & 2GIS when applicable.
4. **Review Velocity, Sentiment & Reply Triage**:
   - Categorize unanswered reviews (`1–2★` urgent incident, `3★` friction point, `4–5★` advocacy).
   - Draft concise, factual, non-template replies referencing the specific product/service and city naturally (without keyword stuffing).
   - **Mandatory Confirm-Gate**: NEVER publish profile edits, posts, or review replies to Google Business Profile / Yandex.Business / 2GIS automatically — present drafts and require explicit operator approval first.

---

## 2. Bitrix D7 Implementation Rules

- Pull branch coordinates, phone, schedule, and address cleanly from `\Bitrix\Catalog\StoreTable::getList()` (with D7 TaggedCache `catalog_store`) instead of hardcoding HTML in multiple include areas.
- Emit `LocalBusiness` (or vertical subtype: `AutoPartsStore`, `AutoRepair`, `Store`, `ProfessionalService`) in JSON-LD via `component_epilog.php` / `OnEpilog`, linking multi-branch locations via `department[]` or `subOrganization[]`.
- Ensure UTM parameters from Maps/GBP links never break Auto-Composite cache or canonical URLs (`$APPLICATION->AddHeadString('<link rel="canonical" ...>')` strips `utm_*`, `yclid`, `gclid`).

---

## 3. Deliverable Format

- **Local SEO Score (0–100)**: NAP Consistency (`25`), Branch Pages & Schema (`25`), Maps/GBP Completeness (`25`), Review & Citation Hygiene (`25`).
- Prioritized fix table (`Critical` → `Low`) with exact `/local/` template paths, D7 fixes, and ready-to-approve review/profile drafts.
