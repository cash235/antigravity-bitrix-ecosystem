# 1C-Bitrix Marketing & CRO Guardrails (Always Active)

When `antigravity-bitrix-marketing` is enabled, enforce these conversion & messaging standards:

1. **Evidence Over Fluff (Anti-Busywork)**:
   - Every marketing, UX, or CRO recommendation MUST name the funnel stage (`Discovery -> Consideration -> Cart/Lead -> Retention`), cite observed project/analytics evidence, and state the expected business metric (`CR%`, `Lead Volume`, `AOV`, `Bounce%`) with an ICE score (`Impact × Confidence ÷ Effort`).
   - Do not invent fake metrics, fake social proof, fake countdown timers, or unverified warranty/delivery promises.
2. **5-Second Clarity & Single-CTA Discipline**:
   - Above-the-fold sections must answer in 5 seconds: *What is offered? For whom? Why trust this seller? What is the ONE primary next action?*
   - Every page/section has 1 primary CTA (e.g., *Add to Cart* / *Request Quote*) and at most 1 clearly subordinate secondary CTA (e.g., *Call / Messenger*).
3. **Out-of-Stock & Zero-Result Recovery**:
   - Never dead-end a visitor on an out-of-stock product or empty search page — preserve HTTP 200 (never 404 stocked-out URLs with demand) and offer an explicit *"Order / Notify / Find Analog"* lead capture CTA.
4. **Preserve SEO, Accessibility & Bitrix D7 Hygiene**:
   - Never sacrifice single `<h1>`, semantic headings, Schema.org microdata, or Core Web Vitals (LCP/CLS) for marketing popups, heavy carousels, or render-blocking chat widgets.
   - Keep custom template edits inside `/local/` and register CSS/JS via `Bitrix\Main\Page\Asset::getInstance()`.
