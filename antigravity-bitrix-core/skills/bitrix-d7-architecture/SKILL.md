---
name: bitrix-d7-architecture
description: >
  Official 1C-Bitrix D7 architecture & API reference workflow. Covers D7 ORM, Asset::getInstance(),
  Cache/TaggedCache, EventManager, HighloadBlockTable, BitrixVM-safe HttpClient, addBackgroundJob,
  CUserOptions, Option (b_option), component_epilog.php, RestartWorkarea 404s, and mandatory
  verification against official Bitrix docs and b24-dev-mcp.
---

# 1C-Bitrix D7 Architecture & Official Documentation Workflow

## 1. Mandatory API Verification Protocol (Zero Hallucinations)
Never guess Bitrix class names, ORM column names, event codes, or REST parameters from memory alone:
1. **Bitrix24 REST / CRM / Webhooks / Events**: Query **`b24-dev-mcp`** first (`bitrix-search` → `bitrix-method-details` / `bitrix-event-details` / `bitrix-article-details`).
2. **1C-Bitrix D7 PHP API (`Main`, `Iblock`, `Catalog`, `Sale`, `Highloadblock`, `Crm`)**:
   - Check official documentation (`dev.1c-bitrix.ru` / `docs.1c-bitrix.ru`) via `search_web`, OR
   - Inspect exact class/method signatures read-only inside `/bitrix/modules/<module>/lib/` when the kernel is present in the workspace.
3. **Never Edit `/bitrix/`**: All extensions, overrides, classes, templates, components, and AJAX endpoints live strictly inside `/local/`.

---

## 2. Core D7 Building Blocks

### 2.1. PSR-4 Autoloading & Namespace Isolation (`local/php_interface/init.php`)
- Place custom OOP services in `/local/php_interface/classes/<Vendor>/<Domain>/` (or a custom local module `/local/modules/<vendor>.<module>/lib/`).
- Register a lightweight PSR-4 `spl_autoload_register()` in `init.php` (works cleanly without Composer).
- Every PHP file starts with `declare(strict_types=1);` and follows PSR-12.

### 2.2. Module Loading & D7 ORM
- Use `\Bitrix\Main\Loader::includeModule('iblock')` (never legacy `CModule::IncludeModule`).
- Prefer D7 `DataManager` classes (`ElementTable`, `SectionTable`, `ProductTable`, `StoreProductTable`, `UserTable`, `DealTable`, `LeadTable`, `ContactTable`) with explicit `select` (never `['*']` on wide tables), `filter`, `order`, `limit`, and `cache => ['ttl' => 3600]` where appropriate.
- When `CIBlockElement::Update` / `Add` / `SetPropertyValuesEx` is required (e.g., complex property writes or v2 iblock updates), encapsulate the legacy call inside a typed D7 service method.

### 2.3. Clean Assets (`Asset::getInstance()`)
- Register styles and scripts via `\Bitrix\Main\Page\Asset::getInstance()->addCss('/local/...')` and `addJs('/local/...')`.
- Never embed raw `<style>` or inline `<script>` blocks in templates/pages (only `<script type="application/ld+json">` is exempt).

### 2.4. Component Lifecycle & Cache Safety
- **`result_modifier.php`**: Transform `$arResult` inside cache; forward keys needed uncached via `$this->__component->SetResultCacheKeys([...])`.
- **`template.php`**: Pure presentation HTML (semantic HTML5, escaped with `htmlspecialcharsbx()`). Never call `$APPLICATION->SetTitle()`, `SetPageProperty()`, `AddHeadString()`, or user-specific logic inside cached `template.php`.
- **`component_epilog.php`**: Executes on every hit (uncached). Safe for SEO setters, JSON-LD, live price/currency conversion, auth/personalization, and 404 triggers.

### 2.5. Clean 404 Handling (Prevent Quirks Mode)
```php
$APPLICATION->RestartWorkarea();
\Bitrix\Iblock\Component\Tools::process404('', true, true, true, '/404.php');
```
Never use `$APPLICATION->RestartBuffer()` before `process404()` on standard HTML pages.

### 2.6. Caching, Background Jobs & Storage
- **Data Cache**: `\Bitrix\Main\Data\Cache::createInstance()` + `TaggedCache` (`iblock_id_N`) for automatic invalidation on catalog updates.
- **Non-Blocking Work**: Use `\Bitrix\Main\Application::getInstance()->addBackgroundJob([$class, 'method'], [$args])` for post-event tasks (e.g., sitemap regen, webhook sync) so admin/checkout saves stay instant.
- **Config & Secrets**: Store module settings and API keys in `b_option` via `\Bitrix\Main\Config\Option::get/set()` (pass `$siteId = ''` for shared multisite keys).
- **Per-User UI State**: Persist manager/admin filters and active tabs server-side via `\CUserOptions::GetOption` / `SetOption`.
- **HTTP Requests on BitrixVM**: Use `\Bitrix\Main\Web\HttpClient(['useCurl' => false, 'socketTimeout' => 6, 'streamTimeout' => 15])` so external REST integrations work reliably even on BitrixVM servers without `php-curl`.

### 2.7. Event Handling & Agents
- Register handlers with `\Bitrix\Main\EventManager::getInstance()->addEventHandler(...)` (or `addEventHandlerCompatible` for legacy iblock events).
- Disable hit-based agents (`check_agents = N`) in production and run `/bitrix/modules/main/tools/cron_events.php` via system cron.
