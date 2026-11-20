---
name: bitrix-deploy-and-uat
description: >
  End-to-end engineering lifecycle for 1C-Bitrix releases: Plan -> Approval -> Implement -> Verify
  -> Deploy Hygiene (BitrixVM, OPcache, Redis, Composite, bitrix:bitrix ownership) -> Manual UAT ->
  Memory Sync -> Clean Git Commit.
---

# 1C-Bitrix Planning, Deploy Hygiene & UAT Workflow

## 1. Standard Engineering Loop
1. **Context Grounding**: Read `docs/memory/{README,codemap,decisions,status}.md` and `docs/backlog.md`.
2. **Analyze & Verify**: Inspect actual workspace files/classes and verify official Bitrix docs / `b24-dev-mcp`.
3. **Plan (Wait for Approval on Non-Trivial Changes)**:
   - Present a clear step-by-step plan (with a Mermaid diagram for multi-layer flows), exact list of files to create/modify, risks, and rollback strategy.
   - Wait for operator approval before editing code.
4. **Implement & Self-Verify**:
   - Follow D7 Golden Standards (`bitrix-d7-architecture`, `bitrix-code-review`).
   - Run `php -l` on all changed PHP files and `node --check` on all changed JS files.
   - Run targeted tests / live browser verification (`browser` subagent or `chrome-devtools-mcp`) where applicable.
5. **Documentation & Memory Sync**: Update `docs/daily/DD.MM.YY.md`, local `README.md`, `docs/memory/*`, and `docs/backlog.md`.
6. **Deliver Deploy List + Manual UAT Scenario**: Give the operator the exact list of modified files to deploy (if manual SFTP/copy) and a numbered UAT checklist.

---

## 2. Git Safety Checkpoints & 1C-Bitrix Production Deploy Hygiene (BitrixVM / Linux)
- **Pre-Risk Checkpoints**: Before any multi-file refactor, DB/iblock migration, or CRM/1C logic change, verify a clean working tree (`git status -s`) or create a lightweight safety checkpoint (`git commit` or `git tag checkpoint/<name>-YYYYMMDD`) so rollback takes 1 command (`git diff <checkpoint>..HEAD`).
- **File Ownership**: All files under `/home/bitrix/www` and `/home/bitrix/ext_www/*` must belong to `bitrix:bitrix` (never leave `root:root` files that break cache/upload writes).
- **Multisite Symlinks**: If multiple domains share `/local/`, verify changes on **every** active site (`s3`, `s4`, etc.) and check `SITE_ID` isolation.
- **Cache Reset Checklist**:
  - Clear managed/component cache (`?clear_cache=Y` or admin cache panel) when modifying `result_modifier.php`, `template.php`, or `SetResultCacheKeys()`.
  - Reset **Auto-Composite** HTML cache when changing `header.php`, `footer.php`, menus, or global scripts.
  - Bump versioned cache keys (e.g., `v2_` → `v3_`) when changing serialized structures stored in Redis / `Cache::createInstance()`.
  - Verify `OPcache` reload if `opcache.validate_timestamps=0` on production.
- **Zero-Secret Git Commits**: Before `git commit`, scan staged diffs for private keys (`BEGIN PRIVATE KEY`), OAuth tokens, DB passwords, or `.env` files.

---

## 3. Manual UAT Scenario Format
Every completed task response MUST include a concise, testable UAT block:
1. **Preconditions** (which URL/site/user role to use, whether `Ctrl+F5` or cache clear is needed).
2. **Happy Path Steps** (3–6 concrete click/input checks with exact expected visual/DB/HTTP results).
3. **Edge / Regression Check** (mobile view, guest vs authorized user, secondary multisite domain if applicable, zero JS console errors).
