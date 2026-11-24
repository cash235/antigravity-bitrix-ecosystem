#!/usr/bin/env node
/**
 * SEO & GEO Drift Monitor (zero dependencies).
 * Captures pre-deploy SEO/GEO baseline and compares post-deploy state.
 * Usage:
 *   node seo-drift.mjs baseline <url>
 *   node seo-drift.mjs compare <url>
 *   node seo-drift.mjs list
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectUrl } from "./fetch-seo.mjs";
import { assertSafeUrl } from "./ssrf-guard.mjs";

const DRIFT_DIR = path.join(os.homedir(), ".cache", "antigravity-bitrix-seo-geo", "drift");
fs.mkdirSync(DRIFT_DIR, { recursive: true });

function normalizeUrl(raw) {
  const u = new URL(raw);
  u.hash = "";
  const p = u.pathname.replace(/\/+$/, "") || "/";
  u.pathname = p;
  return u.toString();
}

function getBaselinePath(url) {
  const hash = crypto.createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 16);
  return path.join(DRIFT_DIR, `${hash}.json`);
}

async function cmdBaseline(url) {
  await assertSafeUrl(url);
  const snapshot = await inspectUrl(url);
  const file = getBaselinePath(url);
  const payload = {
    capturedAt: new Date().toISOString(),
    normalizedUrl: normalizeUrl(url),
    snapshot,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Baseline saved for ${payload.normalizedUrl} -> ${file}`);
}

async function cmdCompare(url) {
  await assertSafeUrl(url);
  const file = getBaselinePath(url);
  if (!fs.existsSync(file)) {
    console.error(`No baseline found for ${normalizeUrl(url)}. Run 'baseline <url>' first.`);
    process.exit(1);
  }

  const prev = JSON.parse(fs.readFileSync(file, "utf8"));
  const curr = await inspectUrl(url);
  const diffs = [];

  const check = (severity, field, oldVal, newVal) => {
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ severity, field, oldVal, newVal });
    }
  };

  check("CRITICAL", "statusCode", prev.snapshot.statusCode, curr.statusCode);
  check("CRITICAL", "finalUrl", prev.snapshot.finalUrl, curr.finalUrl);
  check("CRITICAL", "canonical", prev.snapshot.seo.canonical, curr.seo.canonical);
  check("CRITICAL", "metaRobots", prev.snapshot.seo.metaRobots, curr.seo.metaRobots);
  check("WARNING", "title", prev.snapshot.seo.title, curr.seo.title);
  check("WARNING", "metaDescription", prev.snapshot.seo.metaDescription, curr.seo.metaDescription);
  check("WARNING", "h1", prev.snapshot.seo.h1, curr.seo.h1);
  check("WARNING", "ogTitle", prev.snapshot.seo.ogTitle ?? null, curr.seo.ogTitle ?? null);
  check("WARNING", "ogDescription", prev.snapshot.seo.ogDescription ?? null, curr.seo.ogDescription ?? null);
  check("WARNING", "jsonLdTypes", prev.snapshot.seo.jsonLdTypes, curr.seo.jsonLdTypes);
  check("WARNING", "gtmInHead", prev.snapshot.analytics?.gtmInHead ?? null, curr.analytics?.gtmInHead ?? null);
  check("INFO", "setsPhpsessid", prev.snapshot.bitrixSignals.setsPhpsessid, curr.bitrixSignals.setsPhpsessid);

  console.log(`=== SEO & GEO Drift Compare: ${prev.normalizedUrl} ===`);
  console.log(`Baseline captured: ${prev.capturedAt}`);
  if (diffs.length === 0) {
    console.log("No SEO/GEO drift detected.");
    return;
  }

  for (const d of diffs) {
    console.log(`[${d.severity}] ${d.field}:`);
    console.log(`  before: ${JSON.stringify(d.oldVal)}`);
    console.log(`  after : ${JSON.stringify(d.newVal)}`);
  }
}

function cmdList() {
  const files = fs.readdirSync(DRIFT_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No baselines stored yet.");
    return;
  }
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DRIFT_DIR, f), "utf8"));
    console.log(`- ${data.normalizedUrl} (captured: ${data.capturedAt}, status: ${data.snapshot.statusCode})`);
  }
}

const [action, targetUrl] = process.argv.slice(2);
if (action === "baseline" && targetUrl) {
  cmdBaseline(targetUrl).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
} else if (action === "compare" && targetUrl) {
  cmdCompare(targetUrl).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
} else if (action === "list") {
  cmdList();
} else {
  console.log("Usage:\n  node seo-drift.mjs baseline <url>\n  node seo-drift.mjs compare <url>\n  node seo-drift.mjs list");
  process.exit(1);
}
