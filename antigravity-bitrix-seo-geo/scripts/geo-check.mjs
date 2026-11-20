#!/usr/bin/env node
/**
 * scripts/geo-check.mjs
 * Universal Generative Engine Optimization (GEO) & AI Search Readiness Checker (zero dependencies).
 *
 * Usage:
 *   node scripts/geo-check.mjs <url> [--json]
 *   node scripts/geo-check.mjs https://example.com/
 *   node scripts/geo-check.mjs https://example.com/services/ --json
 */

import { inspectUrl } from './fetch-seo.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const targetUrl = args.find((a) => !a.startsWith('--'));

if (!targetUrl) {
    console.error('Usage: node scripts/geo-check.mjs <url> [--json]');
    process.exit(1);
}

const AI_BOTS = [
    'YandexBot',
    'YandexRenderResourcesBot',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'Google-Extended',
];

const ORG_ENTITY_PATTERNS = [
    'Organization',
    'LocalBusiness',
    'Store',
    'OnlineStore',
    'Service',
    'AutoPartsStore',
    'AutoRepair',
    'Medical',
    'Clinic',
    'Restaurant',
    'Hotel',
    'LegalService',
    'FinancialService',
    'Corporation',
    'EducationalOrganization',
];

async function checkRobotsAndLlms(origin) {
    const results = {
        robotsAccessible: false,
        allowedBots: [],
        blockedBots: [],
        hasLlmsTxt: false,
        llmsLength: 0,
    };

    try {
        const res = await fetch(`${origin}/robots.txt`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityBitrixSEOGEO/2.0)' },
        });
        if (res.ok) {
            results.robotsAccessible = true;
            const robotsContent = await res.text();
            for (const bot of AI_BOTS) {
                const botRegex = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*\\/(\\s|$)`, 'i');
                if (botRegex.test(robotsContent)) {
                    results.blockedBots.push(bot);
                } else {
                    results.allowedBots.push(bot);
                }
            }
        }
    } catch {
        // robots unavailable
    }

    try {
        const res = await fetch(`${origin}/llms.txt`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityBitrixSEOGEO/2.0)' },
        });
        if (res.ok) {
            const txt = await res.text();
            if (txt && txt.trim().length > 20 && !/<!DOCTYPE|<html\b/i.test(txt)) {
                results.hasLlmsTxt = true;
                results.llmsLength = txt.length;
            }
        }
    } catch {
        // llms.txt unavailable
    }

    return results;
}

function analyzePageContent(html, seoData) {
    const report = {
        h1Count: 0,
        questionHeadings: [],
        tablesCount: 0,
        napSignals: {
            hasPhone: false,
            hasAddress: false,
        },
    };

    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    report.h1Count = h1Matches.length;

    const headingMatches = html.match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi) || [];
    const questionWordRe = /(?:^|[^а-яёa-z0-9])(как|сколько|какой|какая|какие|где|почему|можно ли|нужно ли|откуда|how|what|why|when|where|which|can|does|is)(?:$|[^а-яёa-z0-9])/i;
    for (const h of headingMatches) {
        const cleanText = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText.includes('?') || questionWordRe.test(cleanText)) {
            report.questionHeadings.push(cleanText);
        }
    }

    report.tablesCount = (html.match(/<table\b[^>]*>/gi) || []).length;

    // Universal phone detection (tel: link, JSON-LD telephone, or international/CIS phone formats)
    if (
        seoData.seo.hasJsonLdTelephone ||
        /href=["']tel:/i.test(html) ||
        /(\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{2,4}[\s\-]?\d{2,4})/.test(html)
    ) {
        report.napSignals.hasPhone = true;
    }

    // Universal address detection (JSON-LD PostalAddress or generic address/street markers in RU/EN)
    if (
        seoData.seo.hasJsonLdAddress ||
        /itemprop=["']streetAddress["']|itemprop=["']address["']/i.test(html) ||
        /(ул\.|улица|пер\.|переулок|пр-т|проспект|шоссе|бульвар|наб\.|г\.\s+[А-ЯЁ][а-яё]+|\bstreet\b|\bave\.|\bavenue\b|\broad\b|\bblvd\b|\bsuite\b)/i.test(html)
    ) {
        report.napSignals.hasAddress = true;
    }

    return report;
}

async function main() {
    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;

    const rawRes = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityBitrixSEOGEO/2.0)' },
    });
    const html = await rawRes.text();

    const [seoData, botData] = await Promise.all([
        inspectUrl(targetUrl),
        checkRobotsAndLlms(origin),
    ]);

    const pageAnalysis = analyzePageContent(html, seoData);

    let geoScore = 100;
    const deductions = [];
    const recommendations = [];

    if (botData.robotsAccessible) {
        if (botData.blockedBots.length > 0) {
            deductions.push(`Blocked AI bots in robots.txt: ${botData.blockedBots.join(', ')} (-15)`);
            recommendations.push('Allow key AI search crawlers (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, YandexRenderResourcesBot) in robots.txt');
            geoScore -= 15;
        }
    } else {
        deductions.push('Missing or unreachable robots.txt (-10)');
        recommendations.push('Publish a valid robots.txt with HTTPS Sitemap and AI crawler rules');
        geoScore -= 10;
    }

    if (!botData.hasLlmsTxt) {
        deductions.push('Missing /llms.txt discovery file (-15)');
        recommendations.push('Add /llms.txt (or multisite llms.php routed via urlrewrite.php) summarizing services, key URLs, and legal/NAP facts');
        geoScore -= 15;
    }

    const schemaTypes = seoData.seo.jsonLdTypes || [];
    const matchedEntityTypes = schemaTypes.filter((t) =>
        ORG_ENTITY_PATTERNS.some((pat) => t.toLowerCase().includes(pat.toLowerCase()))
    );
    const hasEntitySchema = matchedEntityTypes.length > 0;
    const hasFaq = schemaTypes.some((t) => t.toLowerCase().includes('faq'));

    if (!hasEntitySchema) {
        deductions.push('No Organization / LocalBusiness / Store / Service JSON-LD schema (-10)');
        recommendations.push('Implement Organization or LocalBusiness (or vertical subtype) JSON-LD with verified NAP, URL, and geo/hours');
        geoScore -= 10;
    }

    const isInfoOrServicePath = /\/(services?|delivery|about|contacts?|faq|help|repair|warranty|payment)/i.test(parsedUrl.pathname);
    if (!hasFaq && isInfoOrServicePath) {
        deductions.push('Missing FAQPage schema on service/info page (-10)');
        recommendations.push('Add visible Q&A blocks paired with FAQPage JSON-LD (40-80 word factual answers)');
        geoScore -= 10;
    }

    if (pageAnalysis.h1Count !== 1) {
        deductions.push(`Expected exactly 1 H1, found ${pageAnalysis.h1Count} (-5)`);
        geoScore -= 5;
    }

    if (pageAnalysis.questionHeadings.length === 0) {
        deductions.push('No conversational/question-style H2-H4 headings (-10)');
        recommendations.push('Add question-based H2/H3 headings followed by 40-60 word direct answer capsules');
        geoScore -= 10;
    }

    if (!pageAnalysis.napSignals.hasPhone || !pageAnalysis.napSignals.hasAddress) {
        deductions.push('Incomplete NAP signals (phone/address) on page (-10)');
        recommendations.push('Expose consistent phone (tel:) and address in visible HTML and JSON-LD PostalAddress');
        geoScore -= 10;
    }

    const finalScore = Math.max(0, geoScore);
    const payload = {
        url: targetUrl,
        geoScore: finalScore,
        aiCrawlers: botData,
        schema: {
            foundTypes: schemaTypes,
            entityTypes: matchedEntityTypes,
            hasFaq,
        },
        citability: {
            h1Count: pageAnalysis.h1Count,
            questionHeadingsCount: pageAnalysis.questionHeadings.length,
            sampleQuestionHeadings: pageAnalysis.questionHeadings.slice(0, 5),
            tablesCount: pageAnalysis.tablesCount,
        },
        nap: pageAnalysis.napSignals,
        deductions,
        recommendations,
    };

    if (jsonMode) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    console.log(`\n======================================================`);
    console.log(`GEO & AI Search Readiness Check: ${targetUrl}`);
    console.log(`======================================================\n`);
    console.log(`AI Crawlers & Protocols:`);
    console.log(`  robots.txt: ${botData.robotsAccessible ? 'OK' : 'UNREACHABLE'} | Blocked AI bots: ${botData.blockedBots.length ? botData.blockedBots.join(', ') : 'None'}`);
    console.log(`  /llms.txt : ${botData.hasLlmsTxt ? `OK (${botData.llmsLength} chars)` : 'MISSING'}`);
    console.log(`\nSchema.org Grounding:`);
    console.log(`  Found Types: ${schemaTypes.join(', ') || 'None'}`);
    console.log(`  Entity Schema: ${hasEntitySchema ? matchedEntityTypes.join(', ') : 'Missing'} | FAQPage: ${hasFaq ? 'OK' : 'No'}`);
    console.log(`\nCitability & Structure:`);
    console.log(`  H1 count: ${pageAnalysis.h1Count} | Question headings (H2-H4): ${pageAnalysis.questionHeadings.length} | Tables: ${pageAnalysis.tablesCount}`);
    pageAnalysis.questionHeadings.slice(0, 3).forEach((q) => console.log(`    - "${q}"`));
    console.log(`\nLocal NAP Signals:`);
    console.log(`  Phone: ${pageAnalysis.napSignals.hasPhone ? 'OK' : 'MISSING'} | Address: ${pageAnalysis.napSignals.hasAddress ? 'OK' : 'MISSING'}`);
    console.log(`\n======================================================`);
    console.log(`GEO Readiness Score: ${finalScore}/100`);
    console.log(`======================================================`);
    if (deductions.length) {
        console.log(`\nDeductions:`);
        deductions.forEach((d) => console.log(`  - ${d}`));
    }
    if (recommendations.length) {
        console.log(`\nRecommendations:`);
        recommendations.forEach((r) => console.log(`  -> ${r}`));
    }
    console.log('');
}

main().catch((err) => {
    console.error('Fatal error in geo-check:', err.message);
    process.exit(1);
});
