# Contributing to 1C-Bitrix Antigravity Ecosystem

Спасибо за интерес к развитию экосистемы плагинов **1С-Битрикс для Antigravity**!

## Модель вклада (Contribution Model)
- Прямой `push` в ветку `main` закрыт для внешних участников.
- Все изменения принимаются через **Fork → Feature Branch → Pull Request** после прохождения автоматических проверок CI и ручного ревью мейнтейнеров (`@cash235`).

## Обязательные стандарты (Guardrails)

1. **Zero PII & Zero Secrets**:
   - Категорически запрещено добавлять реальные домены клиентов, названия компаний, телефоны, e-mail, ID счётчиков, API-ключи, токены, пароли или личные абсолютные пути (`D:\...`, `/Users/...`).
2. **Zero External npm Dependencies**:
   - Все скрипты (`scripts/*.mjs` и `antigravity-bitrix-ide-panel/extension.js`) должны работать на чистом **Node.js 18+** (только встроенные модули `node:fs`, `node:path`, `node:child_process`, `node:os`, `node:url`, и `vscode` в IDE-расширении).
3. **Zero Skill Collisions**:
   - Имя каждого нового скилла (`skills/<name>/SKILL.md` → `name:`) должно быть уникальным во всех 4 плагинах и иметь префикс `bitrix-`.
4. **Antigravity `plugin.json` Compliance**:
   - Используйте только поддерживаемые поля верхнего уровня (`name`, `displayName`, `version`, `description`, `logo`, `author`, `homepage`, `repository`, `suggestedPrompts` — не более 3 штук, `disabled`).
5. **No Hardcoded LLM Model Names**:
   - Роутинг моделей в скиллах должен опираться на живой `swarm(action="models", all=true)` и переносимые слоты `flash_lite` / `flash` / `inherit` / `pro`.

## Локальная проверка перед Pull Request

```powershell
# 1. Проверка синтаксиса всех скриптов
Get-ChildItem -Recurse -Include *.mjs,extension.js | ForEach-Object { node --check $_.FullName }

# 2. Тест установки
powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1
```

Опишите в PR: **зачем** нужно изменение, **какие плагины** затронуты и **как вы его протестировали** на проекте 1С-Битрикс.
