# 1C-Bitrix Command Center — Antigravity IDE Activity Bar Extension

Лёгкое расширение без npm-зависимостей для **Antigravity IDE** (и VS Code), добавляющее иконку **1C-Bitrix Command Center** прямо в **самую левую панель (Activity Bar)** рядом с Проводником, Поиском и Расширениями.

## Возможности
- **1-клик открытие 5-вкладочного Command Center Dashboard** в центральной области редактора (использует детерминированный `bitrix-dashboard-render.mjs --mode webview` из `antigravity-bitrix-core`).
- **Компактная боковая панель** с живым статусом открытого проекта (Readiness Score, QA Preflight Verdict, прогресс бэклога, ADR, бюджет контекста, статус 4 плагинов).
- **Инициализация проекта (`bitrix-bootstrap.mjs`)** с выбором профиля (`full` / `store` / `corporate` / `minimal`) и автоматическим копированием промпта для интервью `bitrix-project-init`.
- **Запуск QA Preflight** с выводом отчёта в Output Channel `1C-Bitrix Command Center`.
- **Нативное копирование промптов** через `vscode.env.clipboard.writeText()` (работает в 100% случаев без ограничений браузерного iframe).

## Установка

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\antigravity-bitrix-ide-panel\install-ide-extension.ps1
```

### Linux / macOS
```bash
bash ./antigravity-bitrix-ide-panel/install-ide-extension.sh
```

После установки выполните `Ctrl+Shift+P` → **`Developer: Reload Window`** — в левом Activity Bar появится иконка **1C-Bitrix Command Center**.
