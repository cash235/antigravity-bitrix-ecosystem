# 1C-Bitrix Antigravity Ecosystem (4 Plugins + IDE Command Center)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: 1C-Bitrix D7](https://img.shields.io/badge/1C--Bitrix-D7-0F766E.svg)](https://dev.1c-bitrix.ru/)
[![Node.js: 18+](https://img.shields.io/badge/Node.js-18%2B-339933.svg)](https://nodejs.org/)
[![Dependencies: Zero npm](https://img.shields.io/badge/Dependencies-Zero%20npm-2563EB.svg)](#)

Универсальная модульная экосистема из **4 независимых плагинов для Google Antigravity** и **расширения левой панели (Activity Bar) для Antigravity IDE**, созданная для профессиональной разработки, SEO/GEO-оптимизации, маркетинга (CRO) и QA любых проектов на **1С-Битрикс D7** — от корпоративного сайта до высоконагруженного мультисайтового интернет-магазина с CRM и 1С.

> **Ключевые принципы**: **Zero npm dependencies** (только встроенные модули Node.js 18+), **Zero PII** (никаких клиентских данных), **Zero skill collisions**, строгая изоляция кастомного кода в `/local/` и **Fail-Closed** верификация.

---

## Состав экосистемы

| Модуль | Версия | Скиллы | Субагенты | CLI-скрипты | Назначение |
|---|---:|---:|---:|---:|---|
| [`antigravity-bitrix-core`](antigravity-bitrix-core/) | `2.3.0` | **8** | **2** | **4** | **Ядро и Центральный Оркестратор**: многоуровневый **Cock-up Prevention Gate**, 2-шкальная матрица (`Q1–Q4 × S/M/L`), политика границ `.agents/permissions.json`, трекер ритма и дорожная карта спринтов, детерминированный **Command Center Dashboard v2.3**, онбординг Greenfield/Brownfield (`bitrix-project-init`), каноническая память (`AGENTS.md`, `docs/memory/*`, ADR), стандарты Bitrix D7 и Git-чекпоинты. |
| [`antigravity-bitrix-seo-geo`](antigravity-bitrix-seo-geo/) | `2.1.0` | **9** | **2** | **5** | **SEO, GEO (ИИ-поиск), Schema.org и Аналитика**: техаудит D7 (`component_epilog`, `RestartWorkarea` 404, `urlrewrite.php`), GEO 2026 (`/llms.txt`, AI-боты, капсулы), Schema.org JSON-LD/Microdata, E-commerce и мультисайтовость, GTM/GA4/Метрика, мониторинг SEO-дрейфа, анализ Screaming Frog и REST API дашборды. |
| [`antigravity-bitrix-qa`](antigravity-bitrix-qa/) | `1.0.0` | **4** | **1** | **1** | **QA и Production Readiness**: Browser Visual QA (`375/768/1440px`), Click-Path аудит кнопок/AJAX/состояний, Pre-Launch аудит, регрессионные smoke-тесты и автоматический preflight-сканер безопасности `bitrix-qa-preflight.mjs`. |
| [`antigravity-bitrix-marketing`](antigravity-bitrix-marketing/) | `1.0.0` | **4** | **1** | **0** | **Маркетинг, CRO и UX**: Product Lens (ICE anti-busywork), конверсионный копирайтинг (5-секундный тест, перехват пустого поиска и Out-of-Stock), retention-кампании с CRM, взвешенная визуальная UX-рубрика. |
| [`antigravity-bitrix-ide-panel`](antigravity-bitrix-ide-panel/) | `1.0.0` | — | — | IDE Ext | **Кнопка в левой панели (Activity Bar) Antigravity IDE / VS Code**: 1-клик открытие живого 5-вкладочного Command Center Dashboard прямо в редакторе, быстрая инициализация проектов и запуск QA Preflight. |

**Итого**: **25 уникальных скиллов**, **6 профильных субагентов**, **10 zero-dependency CLI-скриптов**, **7 шаблонов проектной памяти** и **нативное расширение левой панели IDE**.

---

## Быстрая установка (1 команда)

> Плагины устанавливаются **глобально один раз** в `~/.gemini/config/plugins/` — **копировать их внутрь каждого проекта не нужно**.

### Windows (PowerShell)
```powershell
git clone https://github.com/cash235/antigravity-bitrix-ecosystem.git
cd antigravity-bitrix-ecosystem
powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1
```

### Linux / macOS
```bash
git clone https://github.com/cash235/antigravity-bitrix-ecosystem.git
cd antigravity-bitrix-ecosystem
bash ./install-ecosystem.sh
```

Можно ставить выборочно (для экономии Context Budget), например только ядро и SEO:
```powershell
powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1 -Plugins core,seo-geo
```

После установки перезагрузите окно Antigravity IDE (`Ctrl+Shift+P` → **`Developer: Reload Window`**) — в левом Activity Bar появится иконка **B (`1C-Bitrix Command Center`)**.

---

## Подключение к новому или существующему проекту 1С-Битрикс

### Способ 1 — Из левой панели Antigravity IDE (2 клика)
1. Откройте папку вашего Bitrix-проекта в Antigravity IDE.
2. Нажмите иконку **B (`1C-Bitrix Command Center`)** в левой панели → **«🛠️ Инициализировать проект»**.
3. Выберите профиль: `store` / `full` (все 4 плагина), `corporate` (`core + seo-geo + qa`) или `minimal` (только `core`).
4. Скрипт создаст `.agents/plugins.json`, безопасный `.gitignore` под 1С-Битрикс, `AGENTS.md`, `docs/memory/*`, `docs/backlog.md` *(существующие файлы памяти не перезаписываются)* и скопирует готовый промпт для интерактивного интервью `bitrix-project-init`.

### Способ 2 — Через CLI
```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\init-bitrix-project.ps1 -TargetDir "D:\Projects\my-bitrix-site" -Profile store -Name "My Bitrix Site" -UpdateConfig
```
```bash
# Linux / macOS
bash ./init-bitrix-project.sh /path/to/my-bitrix-site --profile store --name "My Bitrix Site" --update-config
```

Подробный пошаговый сценарий локального запуска и проверки см. в [QUICKSTART_LIVE_TEST.md](QUICKSTART_LIVE_TEST.md).

---

## История версий и реализованные возможности

Полный список изменений хранится в [CHANGELOG.md](CHANGELOG.md), все релизы с тегами публикуются на странице [GitHub Releases](https://github.com/cash235/antigravity-bitrix-ecosystem/releases).

| Версия | Дата | Ключевые реализованные возможности |
|---|---|---|
| **`v2.3.0`** | 2026-11-24 | Визуальный редактор границ `.agents/permissions.json` (6 осей, 3 пресета), трекер ритма (`ч/день × дн/нед`) и полная дорожная карта спринтов со сроками и задачами, автодеактивация выполненных кнопок, 6-шаговый Setup Pipeline, шкалы прогресса в левой панели IDE, скрипт подготовки релизов (`scripts/prepare-release.mjs`) и просмотр `CHANGELOG.md` в Дашборде. |
| **`v2.2.0`** | 2026-11-24 | Многоуровневый **Cock-up Prevention Gate** («Не херню ли я делаю?») во всех правилах, оркестраторе и 6 субагентах, стандарт задачи (`North Star` + Ценность + Чеклист приёмки = DoD + Scope Triage + `Est/Actual`), 2-шкальная матрица приоритетов (`Q1–Q4 × S/M/L`). |
| **`v2.1.0`** | 2026-11-20 | Детерминированный 5-вкладочный Command Center Dashboard (`artifact` + `webview`), нативное расширение левой панели Antigravity IDE (`antigravity-bitrix-ide-panel`), автоматический `QA Preflight`, 1-командный установщик `install-ecosystem` и бутстраппер `bitrix-bootstrap.mjs`. |

Подготовить release notes перед публикацией новой версии:
```powershell
node scripts/prepare-release.mjs --dry-run
```

---

## Обновление экосистемы

```powershell
git pull
powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1
```
Все проекты, подключённые через `.agents/plugins.json`, автоматически получат обновлённые версии плагинов.

---

## Как предложить улучшения или сообщить об ошибке (Contributing)

Мы рады обратной связи, тестированию на реальных проектах 1С-Битрикс и Pull Request'ам!
- **Нашли баг или хотите новую фичу?** Откройте [Issue](https://github.com/cash235/antigravity-bitrix-ecosystem/issues).
- **Хотите предложить правку кода/скилла?** Сделайте Fork, внесите изменения в отдельной ветке и откройте Pull Request — подробные правила в [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Атрибуция и Лицензия

- Распространяется по лицензии **MIT** — см. [LICENSE](LICENSE).
- Архитектура SEO/GEO-модуля (`antigravity-bitrix-seo-geo`) вдохновлена и существенно переработана под 1С-Битрикс D7 на базе [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT).
