# 1C-Bitrix Design Taste & Motion (`antigravity-bitrix-design`)

Независимый 5-й плагин экосистемы **1C-Bitrix Antigravity Ecosystem** — дизайн-инжиниринг, борьба с шаблонным «AI-слопом», GPU-безопасные анимации и Fail-Closed визуальный гейт (`1440px` и `390px`) для шаблонов `/local/templates/*/` и `/manager/` кабинетов.

Вдохновлён практиками [`tasteskill.dev`](https://www.tasteskill.dev/) / [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) и [`emilkowalski/skills`](https://github.com/emilkowalski/skills) и адаптирован под стандарты 1С-Битрикс D7 (`Asset::getInstance()`, сохранение SEO/Schema/CWV).

## Состав
- **Скиллы (3)**: `bitrix-design-taste`, `bitrix-motion-craft`, `bitrix-visual-gate`
- **Субагент (1)**: `bitrix-design-director`
- **CLI-скрипт (1, Zero npm)**: `scripts/bitrix-design-gate.mjs` (`--deal <archetype>` и статический `GATE: PASS / FAIL / SETUP`)
- **Правила**: `rules/AGENTS.md`
