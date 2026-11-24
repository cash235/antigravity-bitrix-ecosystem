---
name: bitrix-seo-agentic
description: >
  AI Agent Readiness, WebMCP & Agentic Browsing audit and implementation guide for 1C-Bitrix D7 sites.
  Covers Lighthouse Agentic Browsing readiness, declarative WebMCP tool contracts, /llms.txt +
  /llms-full.txt dynamic endpoints, zero-JS SSR data extraction, semantic forms/CTAs, and non-blocking
  access for autonomous AI purchasing/research agents without compromising security or Composite cache.
---

# 1C-Bitrix Agentic Browsing & WebMCP Readiness (`bitrix-seo-agentic`)

Use this skill when auditing or preparing a 1C-Bitrix site so autonomous AI agents (Google Agentic Browsing, ChatGPT Operator/Search, Perplexity, Claude Computer/WebMCP clients, Yandex Neuro) can **read, verify facts, and safely interact** with catalog, search, and lead flows.

---

## 1. Core Pillars of Agentic Readiness on 1C-Bitrix

| Pillar | What AI Agents Require | 1C-Bitrix D7 Implementation |
|---|---|---|
| **1. Discovery (`/llms.txt` + `/llms-full.txt`)** | Compact navigation map (`/llms.txt`, `< 5 KB`) + comprehensive Markdown catalog/services digest (`/llms-full.txt`) with prices, regions, delivery, warranty, and official contact URLs. | Dynamic D7 endpoint in `/local/tools/llms.php` routed via `urlrewrite.php` or cached static generation via `CSite::GetByID()` per `SITE_ID` (multisite-safe!). |
| **2. Zero-JS SSR Grounding** | Key facts (price, currency, availability, SKU/OEM, specs table, delivery terms, NAP) MUST be in the initial HTML response — not hydrated only after XHR. | Render canonical product/service facts inside PHP `template.php`, avoid JS-only price rendering unless Composite dynamic frame is properly seeded with SSR fallback. |
| **3. Semantic Interactive Controls (Lighthouse Agentic Browsing)** | Native `<button>`, `<a href>`, `<form>`, explicit `<label for>`, `aria-label`, `name`, `autocomplete`, and deterministic `data-action` attributes — never clickable `<div>` with opaque JS listeners. | Audit `/local/templates/*/components/` (catalog filter, add-to-cart, quick-order, callback forms) for real HTML5 controls and clear disabled/out-of-stock states. |
| **4. Declarative WebMCP Contracts (Opt-In Read/Draft Tools)** | Expose safe read-only discovery tools (e.g., `search_catalog`, `check_availability`, `get_delivery_estimate`) via WebMCP (`navigator.modelContext` / `<form toolname="..." tooldescription="...">`) while keeping mutating checkout/payment strictly human-confirmed. | Register clean external JS via `Asset::getInstance()->addJs()` (zero inline `<script>`), enforce `check_bitrix_sessid()` and rate limiting on `/local/ajax/` endpoints. |
| **5. Anti-Bot / CAPTCHA Balance** | Hard CAPTCHA walls on catalog/product read pages block legitimate AI search & research agents. | Keep `GET` catalog/product/info pages freely crawlable (allow `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `YandexBot`, `Googlebot`); apply anti-spam/rate limits only on `POST` lead/order endpoints. |

---

## 2. Audit Checklist (Run Before Reporting Agentic Score)

1. **Automated live probe**:
   ```bash
   node scripts/geo-check.mjs https://example.com/ --json
   ```
   Verify `robotsAccessible`, `blockedBots` (should not block search/citation bots unintentionally), `hasLlmsTxt`, `hasLlmsFullTxt`, and `agenticSignals` (semantic forms/buttons, WebMCP hints, SSR price/NAP).
2. **HTML5 Form & Action Hygiene**:
   - Every search bar has `<form role="search">` + `<input type="search" name="q">` + visible/labelled submit `<button type="submit">`.
   - Every product CTA distinguishes **In Stock** (`В корзину`) vs **Out of Stock** (`Узнать срок поставки` / `Подобрать аналог`) in SSR HTML + `Offer.availability` JSON-LD.
   - Modal/cookie banners never cover the viewport with uncloseable overlays or trap keyboard focus.
3. **Multisite & Security Guardrails**:
   - Never expose admin routes (`/bitrix/admin/`, `/manager/`), internal prices, or customer PII in `/llms-full.txt` or WebMCP tools.
   - Respect `.agents/permissions.json` — live URL checks use `ssrf-guard.mjs` (read-only).

---

## 3. Deliverable Format

Return:
- **Agentic Readiness Score (0–100)**: Discovery (`25`), SSR Grounding (`25`), Semantic Controls (`25`), WebMCP & Access (`25`).
- Exact file paths in `/local/templates/` and `/local/ajax/` for every remediation with `ICE` score and `AC-001..N` acceptance criteria.
