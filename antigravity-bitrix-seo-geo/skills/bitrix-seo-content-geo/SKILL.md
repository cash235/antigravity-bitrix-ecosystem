---
name: bitrix-seo-content-geo
description: >
  Universal Generative Engine Optimization (GEO) & Local AI Search standard for any 1C-Bitrix site
  (corporate, service, local business, B2B, or multisite E-commerce). Covers AI search visibility
  (Yandex Neuro, Google AI Overviews, ChatGPT Search, Perplexity, Claude), AI crawler rules in
  robots.txt, static & dynamic multisite /llms.txt, passage-level citability (40-60 word direct
  answers, 134-167 word passages, spec tables), Schema.org entity grounding, NAP consistency,
  AI referral tracking, and E-E-A-T trust signals.
---

# Bitrix Generative Engine Optimization (GEO) & Local AI Search Standard

Works for **any 1C-Bitrix website**: corporate/brochure sites, local services, B2B portals, and single- or multi-site E-commerce catalogs.

## 1. Traditional SEO vs. GEO

| Dimension              | Traditional Search (SEO)      | Generative Engine Optimization (GEO)                                                  |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| **Primary Target**     | Classic organic links on SERP | Synthesized AI answers (Yandex Neuro, Google AIO, ChatGPT, Perplexity, Claude)        |
| **Ranking Currency**   | Backlinks & keyword relevance | **Brand mentions**, passage citability, structured facts, and entity authority        |
| **Content Format**     | Long-form SEO texts           | **Direct answer capsules (40–60 words)**, spec/comparison tables, clear Q&A           |
| **Crawler Behavior**   | Renders JS periodically       | **Zero-JS execution** for most AI fetchers; requires pure Server-Side Rendering (SSR) |
| **Discovery Protocol** | `sitemap.xml`                 | `sitemap.xml` + **`/llms.txt`** + verified JSON-LD knowledge graph                    |
| **Trust Factor**       | PageRank                      | E-E-A-T, original media, transparent pricing/warranty/legal entity & NAP              |

---

## 2. The 5 Pillars of Bitrix GEO

### Pillar 1: AI Crawler Accessibility & `/llms.txt` Discovery

AI fetchers require fast, unfiltered access to pure server-rendered HTML:

1. **`robots.txt` AI Crawler Policy**:
   Explicitly allow AI search crawlers while keeping Bitrix service areas (`/bitrix/`, `/local/`, `/auth/`, `/personal/`, `/crm/`, `/manager/`) closed:

   ```txt
   User-agent: YandexRenderResourcesBot
   Allow: /

   User-agent: YandexBot
   Allow: /

   User-agent: GPTBot
   Allow: /

   User-agent: OAI-SearchBot
   Allow: /

   User-agent: ChatGPT-User
   Allow: /

   User-agent: PerplexityBot
   Allow: /

   User-agent: ClaudeBot
   Allow: /

   User-agent: Google-Extended
   Allow: /
   ```

2. **The `/llms.txt` Protocol (Static or Dynamic Multisite `llms.php`)**:
   - **Single-site Bitrix**: Serve a clean Markdown `/llms.txt` file at document root.
   - **Multisite Bitrix**: Route `#^/llms\.txt$#` in `urlrewrite.php` to a lightweight `/llms.php` that reads the active site's config (`SiteConfig` / `SITE_ID`) and outputs domain-specific entities, NAP, legal info, warranty/delivery terms, and key URLs with `Content-Type: text/plain; charset=utf-8`.
   - **Example structure**:

     ```markdown
     # Brand Name — Concise Value Proposition

     > One-sentence authoritative summary of what the company does, target geography, and core specialization.

     ## Key Pages

     - [Catalog / Services](https://example.com/catalog/): Core offerings with pricing and availability
     - [Delivery & Payment](https://example.com/delivery/): Shipping terms, timelines, and regions
     - [About & Warranty](https://example.com/about/): Legal entity, guarantees, and credentials
     - [Contacts](https://example.com/contacts/): Office/warehouse address, phone, working hours

     ## Verified Facts

     - Legal Entity: Example LLC, Tax ID 123456789
     - Warranty / SLA: Clear guarantee terms
     - Geography: Cities / regions served
     ```

---

### Pillar 2: Passage-Level Citability & Information Architecture

LLMs retrieve individual self-contained passages rather than whole pages:

1. **Direct Answer Capsule (40–60 words)**:
   Place a definitive, self-contained factual answer immediately under the primary `H1` or key `H2`/`H3` headings (e.g., on product cards, service pages, delivery/about pages). Avoid fluff — state what it is, key parameters, warranty/terms, and geography.
2. **Optimal Passage Length (134–167 words)**:
   For explanatory blocks (how to choose, service process, technical guides), structure paragraphs around 134–167 words so each section stands alone as a citable snippet.
3. **Question-Based Headings (Query Matching)**:
   Use natural question headings (`H2`/`H3`/`H4`) matching real customer queries (e.g., _"How does delivery work?"_, _"Сколько стоит и какие сроки выполнения?"_, _"Какая гарантия предоставляется?"_).
4. **Structured HTML Tables**:
   Present specifications, compatibility matrices, pricing tiers, or service stages in semantic `<table>` elements — AI models extract structured tables far more reliably than prose.

---

### Pillar 3: Schema.org Knowledge Graph Grounding

Provide machine-verified ground truth in JSON-LD (`component_epilog.php` or uncached page context) so AI engines do not hallucinate contacts, hours, prices, or legal details:

1. **`Organization` / `LocalBusiness` (or vertical subtype: `Store`, `OnlineStore`, `ProfessionalService`, `MedicalClinic`, `AutoPartsStore`, etc.)**:
   Include `@id`, `name`, `url`, `logo`, `telephone`, `email`, `address` (`PostalAddress`), `geo` (`GeoCoordinates`), `openingHoursSpecification`, and `sameAs` (verified maps/profiles/messengers).
2. **`FAQPage`**:
   Add on service hubs, delivery/payment pages, about pages, and key categories — strictly mirroring visible on-page Q&A blocks (40–80 word factual answers).
3. **`Product` + `Offer` / `Service`**:
   Include `brand`, `sku`/`mpn`, `image`, `price`, `priceCurrency`, `availability`, `itemCondition` (if applicable), `hasMerchantReturnPolicy`, and `shippingDetails`.

---

### Pillar 4: Multi-Site & Local NAP Integrity

- **Never mix NAP across sites/regions**: Isolate legal entity names, tax IDs, addresses, phones, geo-coordinates, currencies, and local prepositions dynamically via `SITE_ID` / `SiteConfig`.
- **External Citations**: Keep NAP 100% consistent across Yandex Business / Maps, 2GIS, Google Business Profile, and industry directories.

---

### Pillar 5: E-E-A-T, Information Gain & AI Referral Measurement

- **Original Evidence**: Real product/project photos, specs, test/diagnostic data, transparent legal requisites (registration numbers, tax IDs, return policies).
- **Measure AI Traffic**: Track referrals from `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com` as a dedicated **AI Search** channel in GA4 / SEO dashboards (see `bitrix-seo-reporting`).

---

## 3. Bitrix D7 Code Pattern: Uncached JSON-LD Injection (`component_epilog.php`)

```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Page\Asset;

$schemaData = [
    "@context" => "https://schema.org",
    "@type" => "FAQPage",
    "mainEntity" => $arResult["FAQ_ITEMS"] ?? [],
];

if (!empty($schemaData["mainEntity"])) {
    Asset::getInstance()->addString(
        '<script type="application/ld+json">' . "\n"
        . json_encode($schemaData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        . "\n</script>\n"
    );
}
```

---

## 4. GEO Readiness Verification

Run the zero-dependency CLI checker:

```bash
node scripts/geo-check.mjs https://example.com/
node scripts/geo-check.mjs https://example.com/services/ --json
```

Checklist:

- [ ] AI crawlers (`YandexRenderResourcesBot`, `YandexBot`, `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`) are allowed in `robots.txt`.
- [ ] `/llms.txt` returns `200 OK` (`text/plain`) with accurate site-specific facts.
- [ ] All core text, specs, prices, and FAQ answers are SSR-rendered in raw HTML.
- [ ] Key landing pages have 40–60 word direct answer capsules, question headings, and structured tables.
- [ ] `Organization`/`LocalBusiness` + `FAQPage` (and `Product`/`Service` where applicable) JSON-LD validate with zero errors.
- [ ] NAP (phone, address, legal entity) matches across HTML, JSON-LD, `/llms.txt`, and external maps.
