#!/usr/bin/env node
/**
 * Screaming Frog internal_all.csv analyzer & comparator (zero dependencies).
 * Usage:
 *   node sf-analyze.mjs <internal_all.csv>
 *   node sf-analyze.mjs <old_internal_all.csv> <new_internal_all.csv>
 */

import fs from "node:fs";

function parseCsvLine(line, delimiter = ",") {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function loadSfCsv(filePath) {
  let raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error(`CSV is empty: ${filePath}`);

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.trim());

  const findCol = (candidates) =>
    headers.findIndex((h) => candidates.some((c) => h.toLowerCase() === c.toLowerCase()));

  const idx = {
    address: findCol(["Address", "Адрес"]),
    contentType: findCol(["Content Type", "Тип контента"]),
    status: findCol(["Status Code", "Код ответа"]),
    indexability: findCol(["Indexability", "Индексируемость"]),
    title: findCol(["Title 1", "Title"]),
    desc: findCol(["Meta Description 1", "Meta Description"]),
    h1: findCol(["H1-1", "H1"]),
    canonical: findCol(["Canonical Link Element 1", "Canonical Link Element"]),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    rows.push({
      address: cols[idx.address] || "",
      contentType: cols[idx.contentType] || "",
      status: cols[idx.status] || "",
      indexability: cols[idx.indexability] || "",
      title: cols[idx.title] || "",
      desc: cols[idx.desc] || "",
      h1: cols[idx.h1] || "",
      canonical: cols[idx.canonical] || "",
    });
  }
  return rows;
}

function summarize(rows) {
  const htmlRows = rows.filter((r) => /text\/html/i.test(r.contentType));
  const statusCounts = {};
  for (const r of rows) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  const indexableHtml = htmlRows.filter(
    (r) => r.status === "200" && /^(Indexable|Индексируется)/i.test(r.indexability)
  );

  const countDuplicates = (items, getter) => {
    const map = new Map();
    for (const item of items) {
      const val = getter(item).trim();
      if (!val) continue;
      map.set(val, (map.get(val) || 0) + 1);
    }
    let dupGroups = 0;
    for (const cnt of map.values()) {
      if (cnt > 1) dupGroups++;
    }
    return dupGroups;
  };

  return {
    totalRows: rows.length,
    htmlRows: htmlRows.length,
    indexableHtml: indexableHtml.length,
    statusCounts,
    missingTitle: indexableHtml.filter((r) => !r.title.trim()).length,
    duplicateTitleGroups: countDuplicates(indexableHtml, (r) => r.title),
    missingDesc: indexableHtml.filter((r) => !r.desc.trim()).length,
    duplicateDescGroups: countDuplicates(indexableHtml, (r) => r.desc),
    missingH1: indexableHtml.filter((r) => !r.h1.trim()).length,
    duplicateH1Groups: countDuplicates(indexableHtml, (r) => r.h1),
    missingCanonical: indexableHtml.filter((r) => !r.canonical.trim()).length,
  };
}

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (files.length === 0) {
  console.log("Usage: node sf-analyze.mjs <internal_all.csv> [new_internal_all.csv]");
  process.exit(1);
}

const first = summarize(loadSfCsv(files[0]));
console.log(`=== Screaming Frog Analysis: ${files[0]} ===`);
console.log(JSON.stringify(first, null, 2));

if (files[1]) {
  const second = summarize(loadSfCsv(files[1]));
  console.log(`\n=== Comparison vs ${files[1]} ===`);
  for (const key of ["totalRows", "indexableHtml", "missingTitle", "duplicateTitleGroups", "missingDesc", "missingH1", "missingCanonical"]) {
    const delta = second[key] - first[key];
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    console.log(`  ${key}: ${first[key]} -> ${second[key]} (${sign})`);
  }
}

