---
name: bitrix-project-init
description: >
  Interactive branching onboarding interview & scaffolding workflow for any 1C-Bitrix project
  (Greenfield new build OR Brownfield existing codebase). Automatically scans existing /local/
  code via scripts/bitrix-project-scan.mjs, collects business goals, stack, integrations, Red Lines,
  and priorities via structured questions, and generates AGENTS.md, docs/memory/*, docs/backlog.md,
  and docs/daily/DD.MM.YY.md so Antigravity works hallucination-free from Turn 1.
---

# 1C-Bitrix Project Onboarding & Memory Scaffolding (`bitrix-project-init`)

Use this skill whenever opening a new 1C-Bitrix workspace (or an existing Bitrix project that lacks `docs/memory/` and `docs/backlog.md`).

---

## Step 0: Instant Workspace Pre-Scan (Before Asking Questions)

If the workspace does not even have `.agents/plugins.json` or `docs/memory/` yet, you can optionally scaffold the initial structure safely (never overwriting existing files) with the zero-dependency bootstrapper:

```bash
node ~/.gemini/config/plugins/antigravity-bitrix-core/scripts/bitrix-bootstrap.mjs . --profile full
```
*(Profiles: `full`, `store`, `corporate`, `minimal`; Windows PowerShell: `node "$env:USERPROFILE\.gemini\config\plugins\antigravity-bitrix-core\scripts\bitrix-bootstrap.mjs" . --profile full`.)*

Always run the zero-dependency project scanner first so you know whether the folder already contains Bitrix code, templates, classes, or docs:

```bash
node ~/.gemini/config/plugins/antigravity-bitrix-core/scripts/bitrix-project-scan.mjs . --json
```
*(On Windows PowerShell: `node "$env:USERPROFILE\.gemini\config\plugins\antigravity-bitrix-core\scripts\bitrix-project-scan.mjs" . --json`.)*

If `docs/memory/README.md` already exists, ask whether the user wants to **refresh/merge** the existing memory hub rather than overwrite it.

---

## Step 1: Branching Entry Question (Greenfield vs Brownfield)

Use `ask_question` (or a concise prompt) to determine the project branch and core profile:

1. **Тип проекта (Project Stage)**:
   - **Новый проект с нуля (Greenfield)** — проектируем архитектуру, структуру `/local/`, инфоблоки и MVP-бэклог.
   - **Существующий проект (Brownfield)** — уже есть код/боевой сайт, нужна карта архитектуры, «Красные линии», фиксация техдолга и план развития.
2. **Архетип сайта (Site Type)**:
   - Интернет-магазин (B2C / B2B каталог, корзина, доставка, оплаты)
   - Интернет-магазин + CRM / Личный кабинет менеджера (Битрикс24 Коробка)
   - Корпоративный сайт / Сайт услуг / Лендинг
   - Мультисайтовый проект (несколько доменов / регионов / валют на одном ядре)

---

## Step 2A: Interview Branch — New Project (Greenfield)

Ask in **2 compact rounds** (do not overwhelm with 20 questions at once):

### Round A1 — Platform, Geography & Domain Model
1. **Редакция 1С-Битрикс и окружение**: редакция (Старт / Стандарт / Малый бизнес / Бизнес / Битрикс24 Коробка + ИМ + CRM), версия PHP (8.1–8.5), MySQL/MariaDB, BitrixVM / Redis / Автокомпозит, наличие Composer.
2. **Бизнес-ниша, география и валюты**: что продаёт/предлагает проект, целевые страны/города, домены (боевой / тестовый), базовая валюта ядра (`RUB`/`BYN`/`USD`/`EUR`) и валюты витрины/отчётов.
3. **Ключевые сущности данных**: какие инфоблоки (каталог, новости, услуги, акции) и Highload-блоки (бренды, справочники, характеристики) планируются; будет ли складской учёт (`StoreControl`) и торговые предложения (SKU).

### Round A2 — Integrations, Frontend, Compliance & MVP Backlog
4. **Внешние интеграции**: обмен с 1С / МойСклад, CRM, платёжные шлюзы, службы доставки, маркетплейсы, аналитика (Яндекс.Метрика, GA4, GTM, Вебмастер, GSC).
5. **Фронтенд, правовые требования и безопасность**: CSS/UI-стек (Bootstrap 5 / Tailwind / готовое решение Aspro и др.), требования по ПДн/Cookie (152-ФЗ РФ, Закон № 99-З РБ, GDPR), контуры развёртывания (`local` → `staging` → `prod`, Git, SSH/FTP).
6. **Цель MVP и первые 3–5 задач**: что должно быть готово на первом этапе запуска (пойдёт в `docs/backlog.md` как «Ближайший спринт»).

---

## Step 2B: Interview Branch — Existing Project (Brownfield)

Before asking questions, if `bitrix-project-scan.mjs` found `/local/php_interface/init.php`, `urlrewrite.php`, custom classes, or existing `.md` files, briefly inspect `init.php` + top 2–3 core config/class files (or delegate to `bitrix-codebase-mapper` subagent) so your questions confirm real facts instead of asking what is already in the code.

### Legacy Style Inheritance (Prevent Style Drift in Brownfield Codebases)
While scanning the existing codebase, capture 3–4 implicit project conventions so future AI edits blend seamlessly instead of introducing alien idioms:
- **Golden Exemplars**: 2–3 real file paths that represent the project's cleanest existing service, template, and AJAX handler.
- **Naming & Error Handling**: Namespace prefix, response JSON shape (`success/message` vs `status/error`), logging conventions.
- **Explicit DONTs**: Legacy anti-patterns observed in old files that must NOT be copied into new code.
Record these concisely in `docs/memory/codemap.md` and `docs/memory/decisions.md`.

Present a **5-line factual summary of what was detected**, then ask in **2 compact rounds**:

### Round B1 — Business Context, Environments & Deploy
1. **Бизнес-роль и контуры**: какие домены/сайты (`s1`, `s2`, `s3`...) работают на этом ядре, какая редакция 1С-Битрикс / BitrixVM / PHP используется, и какой регламент деплоя (Git + SSH, ручное копирование через FTP/SFTP, есть ли тестовый стенд `staging`).
2. **Ключевые бизнес-сущности (если не видны явно в коде)**: ID главных инфоблоков (каталог, контент), HL-блоков, складов, базовой валюты ядра и логики цен.
3. **Внешние интеграции**: живой обмен с 1С, платёжки, доставки, CRM, сторонние модули из Маркетплейса (напр. Aspro, Сотбит, Акрит), веб-аналитика.

### Round B2 — Red Lines, Pain Points & Goals
4. **«Красные линии» (Red Lines — что категорически нельзя ломать)**: критичные ограничения (например, базовая валюта в БД, модифицированные модули, живой обмен с 1С, резервы/списание остатков, работающие SEO-URL и т.д.).
5. **Текущие боли и техдолг**: что сейчас работает плохо, медленно или мешает бизнесу (баги, производительность, legacy-код, SEO, мобильный UX).
6. **Цели и приоритетный бэклог**:
   - **Общее направление (3–6 месяцев)**;
   - **Ближайшие 3–5 задач** (что берём в работу в первую очередь).

---

## Step 3: Scaffold Canonical Project Memory & Backlog

Read the reference templates from `~/.gemini/config/plugins/antigravity-bitrix-core/templates/` and generate (or carefully merge without losing existing project history):

1. **`AGENTS.md`** (root, ~20–30 lines):
   - Concise project-specific pointer referencing `docs/memory/*` and `docs/backlog.md`.
   - Lists ONLY project-specific invariants (domains, base currency, deploy rule, Red Lines summary). Does **NOT** duplicate generic Bitrix D7 rules (those are already enforced globally by `antigravity-bitrix-core`).
2. **`docs/memory/README.md`** — Project Memory Hub & navigation map.
3. **`docs/memory/codemap.md`** — Site matrix (`SITE_ID`), verified `/local/` classes/modules/templates/components, iblocks & HL-blocks, AJAX endpoints, and external integrations (marking unverified DB IDs explicitly as *«уточнить в БД/админке»* — never guessing!).
4. **`docs/memory/decisions.md`** — ADR registry (Michael Nygard format) seeded with **`ADR-01`** capturing the foundational architecture & constraints collected in Step 2.
5. **`docs/memory/status.md`** — Active focus, initial status entry, and explicit **Red Lines** section.
6. **`docs/backlog.md`** — Prioritized task board with **North Star** goal, **2-Scale Priority** (`Q1–Q4` Eisenhower × `S/M/L/XL` complexity + `Est / Actual` hours), explicit **Business Value**, and per-task **Acceptance Checklist (DoD)** (`#001`, `#002`, ...).
7. **`docs/daily/DD.MM.YY.md`** — First daily log entry documenting project onboarding and generated architecture map.

---

## Step 4: Handoff & Next Action

After generating the files:
1. Summarize the generated files with clickable links.
2. Highlight any open technical facts still marked *«уточнить»* (e.g., exact `IBLOCK_ID`s if not yet visible in code).
3. Recommend enabling **`antigravity-bitrix-seo-geo`** if SEO/GEO/Analytics work is part of the roadmap.
4. Offer to open the interactive **Project Command Center Dashboard** (`bitrix-project-dashboard`) or start task **`#001`** from `docs/backlog.md` with an implementation plan.
