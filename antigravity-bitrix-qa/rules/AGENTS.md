# 1C-Bitrix QA & Production Readiness Guardrails (Always Active)

When `antigravity-bitrix-qa` is enabled:

1. **Read-Only by Default on Live URLs**: Never execute mutating browser journeys (real checkout, payment, deal deletion, mass stock updates) against production domains. Require a staging URL and explicit user confirmation before any mutating QA test.
2. **Fail-Closed Verdicts**: Never report `SHIP` or `PASS` if any automated check, syntax lint, or browser check failed to execute or could not reach the target — report `INCOMPLETE` or `BLOCK` with exact evidence.
3. **Prove-the-Bug-First**: For defect fixes, reproduce the failure (script, HTTP check, or click-path trace) before editing code, then re-run to prove the fix without regressions.
4. **Zero Secret / PII Exposure**: Never print or save real credentials, OAuth tokens, private keys, or customer PII in QA reports or screenshots.
5. **Local Evidence Only**: Run local CLI scanners (`bitrix-qa-preflight.mjs`, `php -l`, `node --check`) and authorized browser checks; never upload repo contents to third-party audit services.
