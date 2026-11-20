---
name: bitrix-seo-drift
description: >
  SEO & GEO drift monitoring for 1C-Bitrix releases. Captures pre-deploy baselines (HTTP status,
  final URL, canonical, robots, title, description, H1, OpenGraph, GTM/GA4 presence, JSON-LD)
  and detects post-deploy regressions automatically.
---

# Bitrix SEO & GEO Drift Monitoring

Always capture a baseline before major Bitrix template, `urlrewrite.php`, Nginx/Apache, or Composite cache changes, and compare immediately after deployment.

## Commands

```bash
# Capture baseline before deploy
node scripts/seo-drift.mjs baseline https://example.com/
node scripts/seo-drift.mjs baseline https://example.com/catalog/

# Compare after deploy
node scripts/seo-drift.mjs compare https://example.com/
node scripts/seo-drift.mjs compare https://example.com/catalog/

# List stored baselines
node scripts/seo-drift.mjs list
```

## Severity Levels
- **CRITICAL**: `statusCode` changed, `finalUrl` changed, `canonical` altered/dropped, `metaRobots` flipped to `noindex`.
- **WARNING**: `title`, `metaDescription`, `h1`, `ogTitle`, `ogDescription`, `gtmInHead`, or `jsonLdTypes` changed unexpectedly.
- **INFO**: Bitrix server signal changes (e.g., anonymous `PHPSESSID` cookie state).
