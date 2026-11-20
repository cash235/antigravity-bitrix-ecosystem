# {{PROJECT_NAME}} — Project Memory Pointer (`AGENTS.md`)

> Общие стандарты 1С-Битрикс D7, работа с официальной документацией (`dev.1c-bitrix.ru`, `b24-dev-mcp`) и регламент ведения памяти подключаются глобально через плагин **`antigravity-bitrix-core`**. Этот файл содержит **только указатель памяти и инварианты данного проекта**.

## 1. Быстрый сбор контекста (Fast Grounding)
Перед началом любой задачи сначала прочитайте каноническую память проекта:
- 📌 **[`docs/memory/README.md`](docs/memory/README.md)** — главный индекс памяти.
- 🗺️ **[`docs/memory/codemap.md`](docs/memory/codemap.md)** — карта сайтов, инфоблоков, HL-блоков, классов `/local/` и интеграций.
- 📜 **[`docs/memory/decisions.md`](docs/memory/decisions.md)** — реестр архитектурных решений (ADR).
- 🚦 **[`docs/memory/status.md`](docs/memory/status.md)** — текущий фокус, последние работы и **«Красные линии»**.
- 📋 **[`docs/backlog.md`](docs/backlog.md)** — приоритетный бэклог задач (`#001+`).

## 2. Инварианты этого проекта
- **Редакция / Стек**: {{BITRIX_EDITION}} | PHP {{PHP_VERSION}} | {{HOSTING_STACK}}
- **Домены / Контуры**: {{DOMAINS_SUMMARY}}
- **Базовая валюта ядра (`b_currency`)**: {{BASE_CURRENCY}} *(менять запрещено)*
- **Регламент деплоя**: {{DEPLOY_WORKFLOW}}
- **Главные «Красные линии»**: {{RED_LINES_SHORT}}
