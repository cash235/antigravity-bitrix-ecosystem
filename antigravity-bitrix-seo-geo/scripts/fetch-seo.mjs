#!/usr/bin/env node
/**
 * Live URL SEO, Header, OpenGraph, Analytics & JSON-LD inspector (zero dependencies, Node 18+).
 * Usage: node fetch-seo.mjs <url> [--json]
 */

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const targetUrl = args.find((a) => !a.startsWith("--"));

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, " "));
}

function extractAttr(tag, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  return m ? decodeHtml(m[1] ?? m[2] ?? m[3] ?? "") : null;
}

export async function inspectUrl(url) {
  const redirectChain = [];
  let currentUrl = url;
  let response = null;

  for (let i = 0; i < 8; i++) {
    const res = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AntigravityBitrixSEOGEO/2.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const nextUrl = new URL(res.headers.get("location"), currentUrl).toString();
      redirectChain.push({ status: res.status, from: currentUrl, to: nextUrl });
      currentUrl = nextUrl;
      continue;
    }

    response = res;
    break;
  }

  if (!response) {
    throw new Error(`Too many redirects for ${url}`);
  }

  const html = await response.text();
  const headers = {};
  response.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const setCookie = headers["set-cookie"] || "";
  const setsPhpsessid = /PHPSESSID=/i.test(setCookie);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : null;

  let metaDescription = null;
  let metaRobots = null;
  let ogTitle = null;
  let ogDescription = null;
  let twitterCard = null;
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = (extractAttr(tag, "name") || "").toLowerCase();
    const prop = (extractAttr(tag, "property") || "").toLowerCase();
    if (name === "description" && metaDescription === null) {
      metaDescription = extractAttr(tag, "content");
    } else if (name === "robots" && metaRobots === null) {
      metaRobots = extractAttr(tag, "content");
    } else if (name === "twitter:card" && twitterCard === null) {
      twitterCard = extractAttr(tag, "content");
    }
    if (prop === "og:title" && ogTitle === null) {
      ogTitle = extractAttr(tag, "content");
    } else if (prop === "og:description" && ogDescription === null) {
      ogDescription = extractAttr(tag, "content");
    }
  }

  const headHtml = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || ["", ""])[1];
  const gtmInHead = /googletagmanager\.com\/(gtm\.js|gtag\/js)\?id=/i.test(headHtml);
  const hasCookieBanner = /cookie[-_]?consent|cookie[-_]?banner|cookie[-_]?notice/i.test(html);
  const hasYandexMetrika = /mc\.yandex\.ru\/metrika\/tag\.js|__ymCounterId|ym\(\s*\d+/i.test(html);

  let canonical = null;
  const hreflangs = [];
  const favicons = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const relTokens = (extractAttr(tag, "rel") || "").toLowerCase().split(/\s+/).filter(Boolean);
    const href = extractAttr(tag, "href");
    if (relTokens.includes("canonical") && canonical === null) {
      canonical = href;
    }
    if (relTokens.includes("alternate")) {
      const hl = extractAttr(tag, "hreflang");
      if (hl && href) {
        hreflangs.push({ hreflang: hl, href });
      }
    }
    if (relTokens.includes("icon") || relTokens.includes("apple-touch-icon")) {
      favicons.push({
        rel: relTokens.join(" "),
        sizes: extractAttr(tag, "sizes") || "",
        type: extractAttr(tag, "type") || "",
        href: href || "",
      });
    }
  }

  const h1List = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1]));
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const h3Count = (html.match(/<h3\b/gi) || []).length;

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgTags.filter((tag) => {
    const alt = extractAttr(tag, "alt");
    return alt === null || alt === "";
  }).length;

  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonLd = [];
  const jsonLdErrors = [];
  let hasJsonLdAddress = false;
  let hasJsonLdTelephone = false;

  const collectType = (t) => {
    if (Array.isArray(t)) {
      t.forEach(collectType);
    } else if (typeof t === "string" && t && !jsonLd.includes(t)) {
      jsonLd.push(t);
    }
  };

  jsonLdBlocks.forEach((m, idx) => {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed]);
      for (const item of items) {
        if (!item["@type"]) {
          jsonLdErrors.push(`Block ${idx + 1}: missing @type`);
        } else {
          collectType(item["@type"]);
        }
        if (item.address && (item.address.streetAddress || item.address.addressLocality)) {
          hasJsonLdAddress = true;
        }
        if (item.telephone) {
          hasJsonLdTelephone = true;
        }
        if (item.offers && item.offers.seller) {
          collectType(item.offers.seller["@type"]);
          if (item.offers.seller.address) hasJsonLdAddress = true;
          if (item.offers.seller.telephone) hasJsonLdTelephone = true;
        }
      }
      if (!parsed["@context"] && !items.some((it) => it["@context"])) {
        jsonLdErrors.push(`Block ${idx + 1}: missing @context`);
      }
    } catch (err) {
      jsonLdErrors.push(`Block ${idx + 1}: invalid JSON (${err.message})`);
    }
  });

  const has120FaviconOrSvg = favicons.some(
    (f) => /120x120|180x180|192x192/i.test(f.sizes) || /svg/i.test(f.type) || /\.svg(\?|$)/i.test(f.href)
  );

  return {
    requestedUrl: url,
    finalUrl: currentUrl,
    statusCode: response.status,
    redirectChain,
    bitrixSignals: {
      xPoweredCms: headers["x-powered-cms"] || null,
      xDevSrvCms: headers["x-devsrv-cms"] || null,
      setsPhpsessid,
      xRobotsTag: headers["x-robots-tag"] || null,
      cacheControl: headers["cache-control"] || null,
    },
    seo: {
      title,
      titleLength: title ? title.length : 0,
      metaDescription,
      descriptionLength: metaDescription ? metaDescription.length : 0,
      canonical,
      metaRobots,
      hreflangCount: hreflangs.length,
      hreflangs,
      has120FaviconOrSvg,
      h1Count: h1List.length,
      h1: h1List,
      h2Count,
      h3Count,
      totalImages: imgTags.length,
      imagesMissingAlt: imgsMissingAlt,
      ogTitle,
      ogDescription,
      twitterCard,
      jsonLdTypes: jsonLd,
      jsonLdErrors,
      hasJsonLdAddress,
      hasJsonLdTelephone,
    },
    analytics: {
      gtmInHead,
      hasYandexMetrika,
      hasCookieBanner,
    },
  };
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectRun || process.argv[1]?.endsWith("fetch-seo.mjs")) {
  if (!targetUrl) {
    console.error("Usage: node fetch-seo.mjs <url> [--json]");
    process.exit(1);
  }
  inspectUrl(targetUrl)
    .then((data) => {
      if (jsonMode) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`=== Live SEO Check: ${data.finalUrl} (HTTP ${data.statusCode}) ===`);
        if (data.redirectChain.length) {
          console.log(`Redirects: ${data.redirectChain.map((r) => `${r.status} -> ${r.to}`).join(" | ")}`);
        }
        console.log(`Title (${data.seo.titleLength}): ${data.seo.title}`);
        console.log(`Description (${data.seo.descriptionLength}): ${data.seo.metaDescription}`);
        console.log(`Canonical: ${data.seo.canonical}`);
        console.log(`Robots: ${data.seo.metaRobots || "none"} | X-Robots-Tag: ${data.bitrixSignals.xRobotsTag || "none"} | Hreflang: ${data.seo.hreflangCount}`);
        console.log(`H1 (${data.seo.h1Count}): ${data.seo.h1.join(" | ")}`);
        console.log(`Images: ${data.seo.totalImages} total, ${data.seo.imagesMissingAlt} missing/empty alt | Favicon 120px/SVG: ${data.seo.has120FaviconOrSvg ? "OK" : "missing"}`);
        console.log(`JSON-LD Types: ${data.seo.jsonLdTypes.join(", ") || "none"}`);
        if (data.seo.jsonLdErrors.length) {
          console.log(`JSON-LD Errors: ${data.seo.jsonLdErrors.join("; ")}`);
        }
        console.log(`OpenGraph: og:title=${data.seo.ogTitle ? "OK" : "EMPTY"}, og:description=${data.seo.ogDescription ? "OK" : "EMPTY"}, twitter:card=${data.seo.twitterCard || "none"}`);
        console.log(`Analytics & Consent: GTM/GA in <head>=${data.analytics.gtmInHead}, Yandex.Metrika=${data.analytics.hasYandexMetrika}, CookieBanner=${data.analytics.hasCookieBanner}`);
        console.log(`Bitrix Signals: X-Powered-CMS=${data.bitrixSignals.xPoweredCms || "hidden"}, PHPSESSID=${data.bitrixSignals.setsPhpsessid}`);
      }
    })
    .catch((err) => {
      console.error(`Error fetching ${targetUrl}: ${err.message}`);
      process.exit(1);
    });
}
