# Архитектурная карта экосистемы (`codemap.md`)

## 1. Модули репозитория

| Директория | Тип | Версия | Состав |
|---|---|---|---|
| `antigravity-bitrix-core/` | Antigravity Plugin (Hub) | `2.5.0` | 8 скиллов, 2 субагента, 6 CLI-скриптов (`.mjs`), 7 шаблонов памяти, `rules/AGENTS.md` |
| `antigravity-bitrix-seo-geo/` | Antigravity Plugin | `2.1.0` | 9 скиллов, 2 субагента, 5 CLI-скриптов (`.mjs`), `rules/AGENTS.md` |
| `antigravity-bitrix-qa/` | Antigravity Plugin | `1.0.0` | 4 скилла, 1 субагент, 1 CLI-скрипт (`bitrix-qa-preflight.mjs`), `rules/AGENTS.md` |
| `antigravity-bitrix-marketing/` | Antigravity Plugin | `1.0.0` | 4 скилла, 1 субагент, `rules/AGENTS.md` |
| `antigravity-bitrix-ide-panel/` | VS Code / Antigravity IDE Extension | `1.0.0` | Иконка в левом Activity Bar, боковая панель с прогресс-шкалами, полноразмерный Webview-дашборд, визуальное сохранение `.agents/permissions.json` и `velocity.json` |

## 2. Ключевые CLI-инструменты (Zero npm, Node.js 18+)
- `antigravity-bitrix-core/scripts/bitrix-project-scan.mjs` — структурный скан `/local/`, классов, шаблонов, AJAX и `urlrewrite.php`.
- `antigravity-bitrix-core/scripts/bitrix-dashboard-data.mjs` — сборщик снапшота (`schemaVersion: 2.3`): структура, память, 2-шкальный бэклог + North Star + чеклисты, авто-интеграция `bitrix-qa-preflight.mjs`, ритм/спринты/дедлайны, `.agents/permissions.json`, `setupPipeline`.
- `antigravity-bitrix-core/scripts/bitrix-dashboard-render.mjs` — детерминированный HTML/JS-рендерер Command Center (`--mode artifact` для Side Pane и `--mode webview` для IDE, безопасная JSON-инъекция, визуальный редактор разрешений и ритма).
- `antigravity-bitrix-core/scripts/bitrix-skill-collector.mjs` — сборщик накопленных навыков (`.agents/learned-skills/`), Fail-Closed PII & Secret Sanitizer (10 классов + prompt-injection) и генератор GitHub PR.
- `antigravity-bitrix-core/scripts/bitrix-cms-checklist.mjs` — генератор и локальный автосканер 10-блочного Мастер-Чеклиста готовности модулей 1С-Битрикс под 5 архетипов (`docs/memory/cms-checklist.json`).
- `antigravity-bitrix-core/scripts/bitrix-bootstrap.mjs` — 1-командная инициализация проектов (`.agents/plugins.json`, `.agents/permissions.json`, `.gitignore`, `AGENTS.md`, `docs/memory/*`, `docs/backlog.md`, детектор локальных оверрайдов).
- `scripts/prepare-release.mjs` — подготовка release notes из `CHANGELOG.md`, `BACKLOG_ECOSYSTEM.md`, манифестов `plugin.json` и `git log` + проверка версий (`--dry-run` / `--json`).
- Корневые оркестрационные скрипты: `install-ecosystem.ps1`/`.sh`, `init-bitrix-project.ps1`/`.sh`.

## 3. Автоматизация и публикация
- GitHub репозиторий: `https://github.com/cash235/antigravity-bitrix-ecosystem` (Public, Branch Protection на `main` + `.github/CODEOWNERS`).
- CI: `.github/workflows/ci.yml` (Node 18 / 20 / 22: `node --check`, валидация `plugin.json` и коллизий скиллов/агентов, PEM-ключ и HANDOFF-guard, smoke-тесты bootstrap + renderer).
