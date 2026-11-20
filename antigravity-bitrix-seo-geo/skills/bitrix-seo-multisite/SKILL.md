---
name: bitrix-seo-multisite
description: >
  Universal multisite & multiregional SEO for 1C-Bitrix (multiple SITE_IDs, regional domains or
  subdomains, staging guards, shared /local/ symlinks): isolated robots.txt/sitemap.xml/llms.txt,
  canonical host consistency, regional NAP/currency isolation, and reciprocal hreflang.
---

# Bitrix Multisite & Regional SEO

## 1. Per-Site Isolation (`SITE_ID` & Central `SiteConfig`)
- Maintain a single domain/site configuration class (e.g., `SiteConfig`) keyed by `SITE_ID` (resolved dynamically from `HTTP_HOST`, checking subdomains like `crm.*` / `test.*` **before** matching the parent root domain!).
- Never hardcode a single domain, brand name, phone, legal entity, or currency in shared templates or `component_epilog.php`.
- When sharing code across domains on one server via symlinks, symlink the **entire `/local/` directory** (never partial subfolders) and keep site-specific logos/assets isolated per document root (`/includes/image/`).

## 2. Isolated `robots.txt`, `sitemap.xml` & `llms.txt`
- Each production domain MUST serve its own `robots.txt` with its own HTTPS `Sitemap: https://<domain>/sitemap.xml`.
- Staging/test sites (`test.example.com`) MUST serve `Disallow: /` in `robots.txt` (plus `X-Robots-Tag: noindex, nofollow` and access guard) and MUST NOT load production analytics tags.
- Generate separate `sitemap*.xml` files per production domain (avoiding `http://` URLs in CLI/agent mode).
- Route `/llms.txt` to a lightweight PHP script (`llms.php`) when multiple domains share `/local/` so each domain outputs its own NAP, currency, and URLs.

## 3. Regional Domains / Subdomains & `hreflang`
- Keep legal entities, addresses, phones, currencies (`priceCurrency`), and delivery/service availability strictly isolated per region (e.g., if a service page exists only in Region A, return 301/404 in Region B and exclude it from Region B's `sitemap.xml` and `hreflang`).
- When deploying `hreflang` (`ru-BY`, `ru-RU`, `en-US`, `x-default`), enforce strict **bidirectional reciprocity** and self-referencing tags on every alternate URL, matching the exact canonical URL.
