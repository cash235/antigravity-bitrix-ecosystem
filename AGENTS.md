# 1C-Bitrix Antigravity Ecosystem — Project Memory Pointer (`AGENTS.md`)

> Этот репозиторий — **Open-Source экосистема из 4 плагинов Antigravity и расширения Activity Bar для Antigravity IDE** (не сайт на 1С-Битрикс, а инструментарий для разработки на 1С-Битрикс D7).

## 1. Быстрый сбор контекста (Fast Grounding)
Перед любыми правками прочитайте каноническую память проекта:
- 📌 **[`docs/memory/README.md`](docs/memory/README.md)** — главный индекс памяти.
- 🗺️ **[`docs/memory/codemap.md`](docs/memory/codemap.md)** — карта 4 плагинов, IDE-панели, CLI-скриптов и GitHub CI.
- 📜 **[`docs/memory/decisions.md`](docs/memory/decisions.md)** — реестр архитектурных решений (ADR-01..ADR-04).
- 🚦 **[`docs/memory/status.md`](docs/memory/status.md)** — текущий фокус, история релизов и «Красные линии».
- 📋 **[`BACKLOG_ECOSYSTEM.md`](BACKLOG_ECOSYSTEM.md)** — приоритетный 2-шкальный бэклог (`Q1–Q4 × S/M/L`) и спринты.
- 🛡️ **[`.agents/permissions.json`](.agents/permissions.json)** — границы автономности проекта.

## 2. Железные инварианты репозитория
- **Zero PII / Zero Secrets**: ни одного клиентского домена, ID, токена или локального пути в отслеживаемых Git-файлах.
- **Zero npm dependencies**: все `.mjs`/`.js` скрипты работают строго на встроенных модулях Node.js 18+ (и `vscode` в `antigravity-bitrix-ide-panel`).
- **Zero skill/agent collisions**: имена всех скиллов (`skills/*/SKILL.md`) и субагентов уникальны во всей четвёрке.
- **Cock-up Prevention & Fail-Closed**: не закрывать задачу без 100% чеклиста приёмки, `node --check`, VM-теста и переустановки через `install-ecosystem.ps1`.
