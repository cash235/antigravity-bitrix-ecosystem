#!/usr/bin/env node
/**
 * Zero-dependency 1C-Bitrix 10-Block CMS Readiness Master Checklist Generator & Auto-Inspector (Node.js 18+).
 * Grounded in 1C-Bitrix Quality Monitor (dev.1c-bitrix.ru/support/faq/8366/) and D7 Golden Standards.
 *
 * Generates/merges `docs/memory/cms-checklist.json` tailored to project archetype:
 *   - store / full : all 10 blocks active (E-commerce, Catalog, Sale, Payments/Delivery, SEO/GEO, Browser QA)
 *   - crm_b24      : all 10 blocks active with CRM / StoreControl emphasis
 *   - services     : service site (blocks 4, 5, 6 default to not_applicable unless manually enabled)
 *   - corporate    : corporate site (blocks 4, 5, 6 default to not_applicable)
 *   - minimal      : core site (blocks 4, 5, 6 default to not_applicable)
 *
 * Usage:
 *   node bitrix-cms-checklist.mjs [project-root] [--archetype store|services|corporate|crm_b24|minimal] [--write] [--force] [--json]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const VALID_STATUSES = new Set(["verified", "needs_setup", "not_applicable"]);

const ARCHETYPE_LABELS = {
  store: "Интернет-магазин (E-commerce)",
  full: "Полный профиль (ИМ + CRM + SEO)",
  crm_b24: "Интернет-магазин + Битрикс24 Коробка (CRM)",
  services: "Сайт услуг / каталог без онлайн-оплаты",
  corporate: "Корпоративный сайт",
  minimal: "Минимальный (Базовое ядро)",
};

const ECOM_ONLY_BLOCKS = new Set(["B04", "B05", "B06"]);

/**
 * @param {string} filePath
 * @returns {string}
 */
function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

/**
 * @param {string} rootDir
 * @param {string} [hintProfile]
 * @returns {string}
 */
export function detectArchetype(rootDir, hintProfile) {
  const normalizedHint = String(hintProfile || "").trim().toLowerCase();
  if (normalizedHint && ARCHETYPE_LABELS[normalizedHint]) {
    return normalizedHint === "full" ? "store" : normalizedHint;
  }

  const codemap = readSafe(path.join(rootDir, "docs", "memory", "codemap.md"));
  const agentsMd = readSafe(path.join(rootDir, "AGENTS.md"));
  const combined = `${codemap}\n${agentsMd}`.toLowerCase();

  const hasSaleMod = fs.existsSync(path.join(rootDir, "bitrix", "modules", "sale"));
  const hasCrmMod = fs.existsSync(path.join(rootDir, "bitrix", "modules", "crm"));
  if (hasCrmMod || /битрикс24|bitrix24|crm/.test(combined)) {
    if (hasSaleMod || /интернет-магазин|каталог|корзин|sale/.test(combined)) return "crm_b24";
  }
  if (hasSaleMod || /интернет-магазин|e-commerce|каталог.*цен|sale\.order/.test(combined)) {
    return "store";
  }
  if (/корпоративн|corporate/.test(combined)) return "corporate";
  if (/сайт услуг|услуги|landing|лендинг/.test(combined)) return "services";

  const hasLocalOrBitrix =
    fs.existsSync(path.join(rootDir, "local")) ||
    fs.existsSync(path.join(rootDir, "bitrix")) ||
    fs.existsSync(path.join(rootDir, "urlrewrite.php"));

  return hasLocalOrBitrix ? "store" : "minimal";
}

/**
 * Collect deterministic local workspace signals without network or DB calls.
 * @param {string} rootDir
 * @param {object | null} [qaPreflight]
 */
function scanLocalSignals(rootDir, qaPreflight) {
  const hasLocal = fs.existsSync(path.join(rootDir, "local"));
  const hasBitrix = fs.existsSync(path.join(rootDir, "bitrix"));
  const hasGitignore = fs.existsSync(path.join(rootDir, ".gitignore"));
  const hasUrlrewrite = fs.existsSync(path.join(rootDir, "urlrewrite.php"));
  const hasRobots = fs.existsSync(path.join(rootDir, "robots.txt"));
  const hasSitemap = fs.existsSync(path.join(rootDir, "sitemap.xml"));
  const hasLlms = fs.existsSync(path.join(rootDir, "llms.txt")) || fs.existsSync(path.join(rootDir, "llms.php"));
  const hasCodemap = fs.existsSync(path.join(rootDir, "docs", "memory", "codemap.md"));

  const templatesDir = path.join(rootDir, "local", "templates");
  const templates = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  let strayTestFiles = [];
  try {
    strayTestFiles = fs
      .readdirSync(rootDir)
      .filter((f) => /^(test.*\.php|phpinfo\.php|info\.php|dump.*\.sql)$/i.test(f));
  } catch {
    strayTestFiles = [];
  }

  let urlrewriteDupKeys = 0;
  if (hasUrlrewrite) {
    const ur = readSafe(path.join(rootDir, "urlrewrite.php"));
    const keys = [...ur.matchAll(/^\s*(\d+)\s*=>/gm)].map((m) => m[1]);
    urlrewriteDupKeys = keys.length - new Set(keys).size;
  }

  const qaCrit = qaPreflight && Array.isArray(qaPreflight.critical) ? qaPreflight.critical.length : null;

  return {
    isBitrixWorkspace: hasLocal || hasBitrix || hasUrlrewrite,
    hasLocal,
    hasGitignore,
    hasUrlrewrite,
    urlrewriteDupKeys,
    hasRobots,
    hasSitemap,
    hasLlms,
    hasCodemap,
    templates,
    strayTestFiles,
    qaCrit,
  };
}

/**
 * Build the 10-block master checklist definition with auto-detected evidence.
 * @param {string} archetype
 * @param {ReturnType<typeof scanLocalSignals>} sig
 */
function createTemplateBlocks(archetype, sig) {
  const isNonEcom = archetype === "services" || archetype === "corporate" || archetype === "minimal";

  const blocks = [
    {
      id: "B01",
      number: 1,
      title: "Окружение, БД и Ядро",
      module: "main / BitrixVM",
      adminPath: "Настройки → Инструменты → Проверка системы (site_checker.php)",
      blockPrompt:
        "[Блок 1/10 · Окружение, БД и Ядро] Проверь версию PHP 8.x, кодировку БД utf8mb4, перевод агентов на Cron (BX_CRONTAB_SUPPORT), настройки OPcache/Redis/Композит и права bitrix:bitrix. Выдай конкретный список расхождений и команд фикса.",
      items: [
        {
          id: "B01-1",
          title: "PHP 8.x, MySQL 8.0 (utf8mb4) и лимиты памяти/ввода",
          hint: "Проверка системы (site_checker.php) проходит без красных ошибок; memory_limit ≥ 256M, max_input_vars ≥ 10000.",
          adminPath: "Настройки → Инструменты → Проверка системы",
          autoEvidence: null,
        },
        {
          id: "B01-2",
          title: "Агенты переведены на Cron (BX_CRONTAB_SUPPORT)",
          hint: "b_option main: agents_use_crontab = N, check_agents = N; настроен системный cron на /bitrix/modules/main/tools/cron_events.php.",
          adminPath: "bitrix/php_interface/dbconn.php + crontab",
          autoEvidence: null,
        },
        {
          id: "B01-3",
          title: "Кэширование (Redis/Memcached, OPcache, Автокомпозит) и права bitrix:bitrix",
          hint: "Панель производительности без критичных просадок; кэш не пишется от root.",
          adminPath: "Настройки → Производительность → Панель производительности",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B02",
      number: 2,
      title: "Главный модуль (main) и Сайт",
      module: "main (b_lang)",
      adminPath: "Настройки → Настройки продукта → Сайты → Список сайтов",
      blockPrompt:
        "[Блок 2/10 · Главный модуль и Сайт] Проверь настройки сайтов (b_lang, b_lang_domain, HTTPS), привязку шаблонов /local/templates/, свойства разделов, проактивную защиту и регламент резервного копирования.",
      items: [
        {
          id: "B02-1",
          title: "Настройки сайта (b_lang, b_lang_domain, HTTPS, UTF-8)",
          hint: "Заполнены домен без https://, email администратора, название сайта и корректная привязка директорий.",
          adminPath: "Настройки → Настройки продукта → Сайты → Список сайтов",
          autoEvidence: null,
        },
        {
          id: "B02-2",
          title: "Шаблоны сайта в /local/templates/ и типы меню/свойств (b_site_template)",
          hint: "Используются чистые D7-шаблоны в /local/templates/, нет битых условий привязки.",
          adminPath: "Настройки → Настройки продукта → Сайты → Шаблоны сайтов",
          autoEvidence:
            sig.templates.length > 0
              ? `Обнаружены шаблоны в /local/templates/: ${sig.templates.join(", ")}`
              : sig.isBitrixWorkspace
                ? "Папка /local/templates/ не найдена или пуста"
                : null,
        },
        {
          id: "B02-3",
          title: "Проактивная защита, права групп и резервное копирование",
          hint: "Проактивный фильтр включён, доступ в /bitrix/admin/ ограничен, настроен автоматический бэкап.",
          adminPath: "Настройки → Проактивная защита / Резервное копирование",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B03",
      number: 3,
      title: "Инфоблоки (iblock) и Свойства",
      module: "iblock",
      adminPath: "Настройки → Настройки модулей → Информационные блоки",
      blockPrompt:
        "[Блок 3/10 · Инфоблоки и Свойства] Проверь включение property_features_enabled=Y, настройки ЧПУ инфоблоков, фасетный индекс каталога и актуальность ID инфоблоков/HL-блоков в docs/memory/codemap.md.",
      items: [
        {
          id: "B03-1",
          title: "Включены параметры свойств (property_features_enabled = Y) и ЧПУ",
          hint: "У всех рабочих инфоблоков заданы символьные коды, шаблоны URL и транслитерация.",
          adminPath: "Настройки → Настройки модулей → Информационные блоки",
          autoEvidence: null,
        },
        {
          id: "B03-2",
          title: "Настроен и пересобран фасетный индекс каталога",
          hint: "В свойствах фильтрации нет «мусорных» свойств, фасетный индекс актуален (быстрый умный фильтр).",
          adminPath: "Контент → Инфоблоки → Настройка инфоблока → Фасетный индекс",
          autoEvidence: null,
        },
        {
          id: "B03-3",
          title: "Пользовательские поля (b_user_field) и HL-блоки описаны в codemap.md",
          hint: "Ключевые ID инфоблоков, свойств и Highload-блоков зафиксированы в памяти проекта.",
          adminPath: "Настройки → Пользовательские поля / Highload-блоки",
          autoEvidence: sig.hasCodemap ? "docs/memory/codemap.md присутствует" : "docs/memory/codemap.md отсутствует",
        },
      ],
    },
    {
      id: "B04",
      number: 4,
      title: "Торговый каталог (catalog) и Валюты",
      module: "catalog / currency",
      adminPath: "Магазин → Настройки → Валюты / Типы цен",
      blockPrompt:
        "[Блок 4/10 · Торговый каталог и Валюты] Проверь базовую валюту ядра (b_currency), типы цен, НДС, единицы измерения, SKU и режим складского учёта (StoreControl) с защитой от рассинхронизации с 1С.",
      items: [
        {
          id: "B04-1",
          title: "Базовая валюта ядра (b_currency), курсы и правила округления",
          hint: "Базовая валюта зафиксирована в Красных линиях; форматы вывода и копейки/округление проверены.",
          adminPath: "Магазин → Настройки → Валюты",
          autoEvidence: null,
        },
        {
          id: "B04-2",
          title: "Типы цен, НДС, единицы измерения и торговые предложения (SKU)",
          hint: "Настроены права на просмотр/покупку типов цен, корректный расчёт скидок и наценок.",
          adminPath: "Магазин → Настройки → Типы цен / Ставки НДС",
          autoEvidence: null,
        },
        {
          id: "B04-3",
          title: "Складской учёт (StoreControl) и резервирование остатков",
          hint: "Поведение списания/резерва согласовано с 1С / CRM, нет отрицательных «призрачных» остатков.",
          adminPath: "Настройки → Настройки модулей → Торговый каталог",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B05",
      number: 5,
      title: "Интернет-магазин (sale)",
      module: "sale",
      adminPath: "Магазин → Настройки → Свойства заказа / Статусы",
      blockPrompt:
        "[Блок 5/10 · Интернет-магазин (sale)] Проверь типы плательщиков, свойства заказа, местоположения, статусы, бизнес-значения (sale_bizval), хранение корзин и корректность sale.order.ajax.",
      items: [
        {
          id: "B05-1",
          title: "Типы плательщиков, свойства заказа, местоположения и статусы",
          hint: "Обязательные поля чекаута минимальны и валидируются; база местоположений актуальна.",
          adminPath: "Магазин → Настройки → Свойства заказа / Статусы",
          autoEvidence: null,
        },
        {
          id: "B05-2",
          title: "Реквизиты компании и бизнес-смыслы (sale_bizval)",
          hint: "Заполнены юридические реквизиты продавца, шаблоны счетов и сопоставления полей.",
          adminPath: "Магазин → Настройки → Бизнес-смыслы",
          autoEvidence: null,
        },
        {
          id: "B05-3",
          title: "Срок хранения брошенных корзин/логов и чистый чекаут",
          hint: "Настроена автоочистка старых корзин; оформление заказа не ломается при смене доставки/оплаты.",
          adminPath: "Настройки → Настройки модулей → Интернет-магазин",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B06",
      number: 6,
      title: "Платёжные системы и Доставки",
      module: "sale_payment / sale_delivery",
      adminPath: "Магазин → Настройки → Платёжные системы / Службы доставки",
      blockPrompt:
        "[Блок 6/10 · Оплаты и Доставки] Проверь безопасность ключей (b_option, не в Git), идемпотентность вебхуков оплаты, фискализацию чеков, ограничения служб доставки и защиту staging от реальных списаний.",
      items: [
        {
          id: "B06-1",
          title: "Платёжные шлюзы, колбэк-вебхуки и фискализация (чеки)",
          hint: "Боевые ключи хранятся вне Git; проверены подпись колбэков, возвраты и передача позиций в чек.",
          adminPath: "Магазин → Настройки → Платёжные системы",
          autoEvidence: null,
        },
        {
          id: "B06-2",
          title: "Службы доставки, ограничения по весу/сумме/регионам",
          hint: "Исключены ситуации с 0₽ доставкой по ошибке API; заданы fallback-тарифы и сроки.",
          adminPath: "Магазин → Настройки → Службы доставки",
          autoEvidence: null,
        },
        {
          id: "B06-3",
          title: "Staging-защита от боевых списаний и внешних API-вызовов",
          hint: "На тестовом стенде включены sandbox-ключи платёжек/доставок и перехват исходящих писем.",
          adminPath: "b_option / local/php_interface/init.php",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B07",
      number: 7,
      title: "Почтовые и SMS-уведомления",
      module: "main (b_event)",
      adminPath: "Настройки → Настройки продукта → Почтовые и SMS события",
      blockPrompt:
        "[Блок 7/10 · Почтовые и SMS-уведомления] Проверь почтовые шаблоны (b_event_type / b_event_message), order_email, all_bcc, SPF/DKIM/DMARC и отсутствие зависших писем в очереди b_event.",
      items: [
        {
          id: "B07-1",
          title: "Почтовые шаблоны (b_event_type, b_event_message) без битых ссылок",
          hint: "Письма о заказе, регистрации и смене статуса оформлены под бренд и ведут на боевой HTTPS-домен.",
          adminPath: "Настройки → Почтовые и SMS события → Почтовые шаблоны",
          autoEvidence: null,
        },
        {
          id: "B07-2",
          title: "order_email, email_from, скрытые копии (all_bcc) и SPF/DKIM/DMARC",
          hint: "Почта не уходит в спам; менеджеры реально получают уведомления о новых заказах/лидах.",
          adminPath: "Настройки → Главный модуль / Интернет-магазин",
          autoEvidence: null,
        },
        {
          id: "B07-3",
          title: "Очередь отправки b_event работает на Cron (SUCCESS_EXEC = Y)",
          hint: "Нет скопления неотправленных событий; ошибки SMTP логируются.",
          adminPath: "Настройки → Инструменты → SQL-запрос (b_event)",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B08",
      number: 8,
      title: "Production Audit и Изоляция /local/",
      module: "bitrix-production-audit / QA",
      adminPath: "/local/, bitrix-qa-preflight.mjs",
      blockPrompt:
        "[Блок 8/10 · Production Audit] Запусти bitrix-production-audit и bitrix-qa-preflight.mjs: проверь изоляцию /local/, отсутствие test*.php, секретов в Git, check_bitrix_sessid() на AJAX, D7 HttpClient и 404 через RestartWorkarea().",
      items: [
        {
          id: "B08-1",
          title: "Изоляция /local/, нетронутое ядро /bitrix/ и QA Preflight = 0 CRITICAL",
          hint: "Весь кастомный код в /local/, синтаксис PHP/JS чистый, критичных уязвимостей нет.",
          adminPath: "/local/ + bitrix-qa-preflight.mjs",
          autoEvidence:
            sig.qaCrit !== null
              ? sig.qaCrit === 0
                ? "bitrix-qa-preflight.mjs: 0 CRITICAL"
                : `bitrix-qa-preflight.mjs: обнаружено ${sig.qaCrit} CRITICAL`
              : null,
          autoVerified: sig.qaCrit === 0,
        },
        {
          id: "B08-2",
          title: "Нет мусорных test*.php/дампов в корне и секреты исключены через .gitignore",
          hint: "В корне нет phpinfo.php / test.php / *.sql; .env и ключи не отслеживаются Git.",
          adminPath: ".gitignore + корень сайта",
          autoEvidence:
            sig.strayTestFiles.length > 0
              ? `Найдены лишние файлы в корне: ${sig.strayTestFiles.join(", ")}`
              : sig.hasGitignore
                ? ".gitignore присутствует, мусорных test*.php в корне не найдено"
                : "Отсутствует .gitignore",
          autoVerified: sig.hasGitignore && sig.strayTestFiles.length === 0,
        },
        {
          id: "B08-3",
          title: "D7 HttpClient, check_bitrix_sessid() на AJAX и 404 через RestartWorkarea()",
          hint: "Все публичные обработчики проверяют CSRF и права; 404 не ломает DOCTYPE (нет Quirks Mode).",
          adminPath: "/local/ajax/ + 404.php",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B09",
      number: 9,
      title: "Базовое SEO, GEO и Структурированные данные",
      module: "antigravity-bitrix-seo-geo",
      adminPath: "/robots.txt, /sitemap.xml, /urlrewrite.php, /llms.txt",
      blockPrompt:
        "[Блок 9/10 · SEO & GEO] Запусти bitrix-seo-audit: проверь robots.txt, sitemap.xml, /llms.txt, уникальность ключей urlrewrite.php, component_epilog.php, шаблоны b_iblock_iproperty, Schema.org и аналитику (GTM/GA4/Метрика).",
      items: [
        {
          id: "B09-1",
          title: "robots.txt, sitemap.xml и /llms.txt (для AI-поиска / GEO)",
          hint: "Файлы отдают HTTP 200, содержат корректный HTTPS-хост и изолированы по сайтам при мультисайте.",
          adminPath: "/robots.txt, /sitemap.xml, /llms.txt",
          autoEvidence: sig.isBitrixWorkspace
            ? `robots.txt: ${sig.hasRobots ? "да" : "нет"} · sitemap.xml: ${sig.hasSitemap ? "да" : "нет"} · llms.txt: ${sig.hasLlms ? "да" : "нет"}`
            : null,
          autoVerified: sig.isBitrixWorkspace && sig.hasRobots && sig.hasSitemap && sig.hasLlms,
        },
        {
          id: "B09-2",
          title: "urlrewrite.php без дубликатов ключей и кэш-безопасные мета (component_epilog.php)",
          hint: "Нет перезаписи правил ЧПУ; SetTitle/canonical выполняются вне кэша шаблона; настроены b_iblock_iproperty.",
          adminPath: "/urlrewrite.php + component_epilog.php",
          autoEvidence: sig.hasUrlrewrite
            ? sig.urlrewriteDupKeys > 0
              ? `ВНИМАНИЕ: найдено ${sig.urlrewriteDupKeys} дубликатов ключей в urlrewrite.php!`
              : "urlrewrite.php найден, дубликатов числовых ключей не обнаружено"
            : null,
        },
        {
          id: "B09-3",
          title: "Schema.org (JSON-LD/Microdata) и веб-аналитика (Метрика/GA4/GTM + Cookie)",
          hint: "Валидная разметка Organization/Product/BreadcrumbList; счётчики не блокируют рендер и работают с Композитом.",
          adminPath: "header.php / footer.php / bitrix-seo-analytics",
          autoEvidence: null,
        },
      ],
    },
    {
      id: "B10",
      number: 10,
      title: "Read-Only Browser QA витрины (375 / 768 / 1440px)",
      module: "antigravity-bitrix-qa (bitrix-browser-qa)",
      adminPath: "Live/Staging URL (bitrix-browser-qa + bitrix-click-path-audit)",
      blockPrompt:
        "[Блок 10/10 · Read-Only Browser QA] Запусти bitrix-browser-qa в режиме Read-Only по ключевым страницам (главная, каталог/фильтр, карточка, корзина/формы) на 375px, 768px и 1440px. Проверь консоль, сеть (0 5xx/404), горизонтальный скролл и клик-пути.",
      items: [
        {
          id: "B10-1",
          title: "Главная, каталог и умный фильтр (375 / 768 / 1440px)",
          hint: "0 ошибок JS в консоли, 0 битых ресурсов 404/5xx, нет горизонтального скролла на мобильных.",
          adminPath: "bitrix-browser-qa (Read-Only)",
          autoEvidence: null,
        },
        {
          id: "B10-2",
          title: "Карточка товара/услуги: 5-секундная ясность, фото и Out-of-Stock CTA",
          hint: "Цена, наличие/аналог и главная кнопка CTA видны сразу; галерея и табы не «прыгают» (CLS).",
          adminPath: "bitrix-browser-qa + bitrix-conversion-copy",
          autoEvidence: null,
        },
        {
          id: "B10-3",
          title: "Корзина, чекаут и формы заявок (Click-Path без гонок и двойной отправки)",
          hint: "Проверен полный путь до шага подтверждения (на staging — полный цикл); нет двойного срабатывания целей/AJAX.",
          adminPath: "bitrix-click-path-audit",
          autoEvidence: null,
        },
      ],
    },
  ];

  return blocks.map((b) => {
    const defaultBlockNa = isNonEcom && ECOM_ONLY_BLOCKS.has(b.id);
    return {
      ...b,
      items: b.items.map((it) => {
        let status = "needs_setup";
        if (defaultBlockNa) status = "not_applicable";
        else if (it.autoVerified) status = "verified";
        return {
          id: it.id,
          title: it.title,
          hint: it.hint,
          adminPath: it.adminPath,
          status,
          autoEvidence: it.autoEvidence || null,
          note: "",
        };
      }),
    };
  });
}

/**
 * Compute aggregate stats across all 10 blocks.
 * @param {Array<any>} blocks
 */
export function summarizeChecklist(blocks) {
  let totalItems = 0;
  let applicableItems = 0;
  let verifiedItems = 0;
  let needsSetupItems = 0;
  let notApplicableItems = 0;

  const enrichedBlocks = blocks.map((b) => {
    const items = Array.isArray(b.items) ? b.items : [];
    let bVer = 0;
    let bNeed = 0;
    let bNa = 0;
    for (const it of items) {
      totalItems++;
      if (it.status === "not_applicable") {
        bNa++;
        notApplicableItems++;
      } else if (it.status === "verified") {
        bVer++;
        verifiedItems++;
        applicableItems++;
      } else {
        bNeed++;
        needsSetupItems++;
        applicableItems++;
      }
    }
    const bApplicable = items.length - bNa;
    const pct = bApplicable > 0 ? Math.round((bVer / bApplicable) * 100) : 100;
    return {
      ...b,
      stats: {
        total: items.length,
        applicable: bApplicable,
        verified: bVer,
        needsSetup: bNeed,
        notApplicable: bNa,
        completionPct: pct,
      },
    };
  });

  const completionPct = applicableItems > 0 ? Math.round((verifiedItems / applicableItems) * 100) : 100;
  return {
    blocks: enrichedBlocks,
    summary: {
      blocksCount: enrichedBlocks.length,
      totalItems,
      applicableItems,
      verifiedItems,
      needsSetupItems,
      notApplicableItems,
      completionPct,
    },
  };
}

/**
 * Build or merge the 10-block CMS readiness checklist for `rootDir`.
 * @param {string} rootDir
 * @param {{ archetype?: string, force?: boolean, qaPreflight?: object | null }} [options]
 */
export function buildCmsChecklist(rootDir, options = {}) {
  const filePath = path.join(rootDir, "docs", "memory", "cms-checklist.json");
  let existing = null;
  if (!options.force && fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(readSafe(filePath));
    } catch {
      existing = null;
    }
  }

  const archetype = detectArchetype(rootDir, options.archetype || existing?.archetype);
  const sig = scanLocalSignals(rootDir, options.qaPreflight || null);
  const freshBlocks = createTemplateBlocks(archetype, sig);

  // Merge saved user statuses/notes into fresh template while refreshing live autoEvidence
  const savedItems = new Map();
  if (existing && Array.isArray(existing.blocks)) {
    for (const b of existing.blocks) {
      for (const it of b.items || []) {
        if (it && it.id) savedItems.set(it.id, it);
      }
    }
  }

  const mergedBlocks = freshBlocks.map((b) => ({
    ...b,
    items: b.items.map((it) => {
      const prev = savedItems.get(it.id);
      if (!prev) return it;
      const status = VALID_STATUSES.has(prev.status) ? prev.status : it.status;
      return {
        ...it,
        status,
        note: typeof prev.note === "string" ? prev.note : "",
      };
    }),
  }));

  const { blocks, summary } = summarizeChecklist(mergedBlocks);
  return {
    schemaVersion: "1.0",
    configured: Boolean(existing),
    path: "docs/memory/cms-checklist.json",
    archetype,
    archetypeLabel: ARCHETYPE_LABELS[archetype] || archetype,
    updatedAt: existing?.updatedAt || new Date().toISOString().slice(0, 10),
    isBitrixWorkspace: sig.isBitrixWorkspace,
    summary,
    blocks,
  };
}

/**
 * Save checklist JSON to `docs/memory/cms-checklist.json`.
 * @param {string} rootDir
 * @param {ReturnType<typeof buildCmsChecklist>} data
 */
export function saveCmsChecklist(rootDir, data) {
  const target = path.join(rootDir, "docs", "memory", "cms-checklist.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const toWrite = {
    schemaVersion: "1.0",
    archetype: data.archetype,
    archetypeLabel: data.archetypeLabel,
    updatedAt: new Date().toISOString().slice(0, 10),
    blocks: data.blocks.map((b) => ({
      id: b.id,
      number: b.number,
      title: b.title,
      module: b.module,
      adminPath: b.adminPath,
      items: b.items.map((it) => ({
        id: it.id,
        title: it.title,
        status: VALID_STATUSES.has(it.status) ? it.status : "needs_setup",
        note: it.note || "",
      })),
    })),
  };
  fs.writeFileSync(target, JSON.stringify(toWrite, null, 2) + "\n", "utf8");
  return target;
}

// CLI execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
    console.log(
      "Usage: node bitrix-cms-checklist.mjs [project-root] [--archetype store|services|corporate|crm_b24|minimal] [--write] [--force] [--json]"
    );
    process.exit(0);
  }
  const archIdx = cliArgs.indexOf("--archetype");
  const archetypeArg =
    archIdx !== -1 && archIdx + 1 < cliArgs.length && !cliArgs[archIdx + 1].startsWith("--")
      ? cliArgs[archIdx + 1]
      : undefined;
  const writeMode = cliArgs.includes("--write");
  const forceMode = cliArgs.includes("--force");
  const jsonMode = cliArgs.includes("--json");

  let dirArg = null;
  for (let i = 0; i < cliArgs.length; i++) {
    if (cliArgs[i] === "--archetype") {
      i++;
      continue;
    }
    if (!cliArgs[i].startsWith("--") && !dirArg) dirArg = cliArgs[i];
  }
  const rootDir = path.resolve(dirArg || process.cwd());
  const checklist = buildCmsChecklist(rootDir, { archetype: archetypeArg, force: forceMode });
  if (writeMode) {
    saveCmsChecklist(rootDir, checklist);
    checklist.configured = true;
  }

  if (jsonMode) {
    console.log(JSON.stringify(checklist, null, 2));
  } else {
    const s = checklist.summary;
    console.log(`=== 1C-Bitrix 10-Block CMS Readiness Checklist (${checklist.archetypeLabel}) ===`);
    console.log(
      `Progress: ${s.verifiedItems}/${s.applicableItems} verified (${s.completionPct}%) · ${s.needsSetupItems} needs setup · ${s.notApplicableItems} N/A`
    );
    for (const b of checklist.blocks) {
      console.log(
        `  [${b.id}] ${b.number}. ${b.title} — ${b.stats.verified}/${b.stats.applicable} (${b.stats.completionPct}%)${b.stats.applicable === 0 ? " [N/A]" : ""}`
      );
    }
    if (writeMode) console.log(`Saved: ${path.join(rootDir, "docs", "memory", "cms-checklist.json")}`);
  }
}
