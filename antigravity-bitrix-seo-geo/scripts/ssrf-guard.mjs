#!/usr/bin/env node
/**
 * Zero-dependency SSRF & Egress Guard for 1C-Bitrix SEO/GEO live scripts (Node.js 18+).
 * Hardening inspired by claude-seo v2.6.2:
 *  - Only http:// and https:// schemes permitted; embedded credentials rejected and never echoed.
 *  - Cloud metadata endpoints (AWS/GCP/Azure/Oracle/Alibaba) and 6to4 IPv6 wrappers are ALWAYS blocked.
 *  - Loopback, RFC 1918 private, CGNAT (100.64/10), and link-local addresses are blocked by default
 *    unless explicitly opt-in allowlisted via `BITRIX_SEO_LOCAL_TARGETS` (metadata/link-local/6to4
 *    can NEVER be allowlisted).
 *  - Re-validates DNS resolution (all A/AAAA records) and every redirect hop.
 */

import * as dns from "node:dns/promises";
import * as net from "node:net";

const ALWAYS_BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "instance-data",
]);

const ALWAYS_BLOCKED_IPS = new Set([
  "169.254.169.254",
  "192.0.0.192", // Oracle Cloud metadata
  "100.100.100.200", // Alibaba Cloud metadata
  "fd00:ec2::254", // AWS IPv6 metadata
  "fd20:ce::254", // GCP IPv6 metadata
]);

/**
 * Strip username/password from any URL string before putting it into error logs.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeUrlForError(raw) {
  try {
    const u = new URL(String(raw || ""));
    if (u.username || u.password) {
      u.username = "***";
      u.password = "***";
    }
    return u.toString();
  } catch {
    return "<malformed-url>";
  }
}

function parseAllowlist(envVarName) {
  const raw = process.env[envVarName] || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !s.includes("://") && !s.includes("/") && !s.includes("@") && !s.includes("*"))
  );
}

/**
 * Classify an IPv4 address string.
 * @param {string} ip
 * @returns {"public" | "private" | "metadata" | "link_local"}
 */
function classifyIpv4(ip) {
  if (ALWAYS_BLOCKED_IPS.has(ip)) return "metadata";
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return "metadata";
  const [a, b] = parts;
  if (a === 169 && b === 254) return "link_local";
  if (a === 0 || a === 127) return "private"; // loopback / unspecified
  if (a === 10) return "private"; // RFC 1918
  if (a === 172 && b >= 16 && b <= 31) return "private"; // RFC 1918
  if (a === 192 && b === 168) return "private"; // RFC 1918
  if (a === 100 && b >= 64 && b <= 127) return "private"; // RFC 6598 CGNAT
  if (a === 192 && b === 0 && parts[2] === 0) return "metadata"; // IETF / Oracle
  if (a >= 224) return "link_local"; // multicast / reserved
  return "public";
}

/**
 * Classify an IPv6 address string (including IPv4-mapped and 6to4 2002::/16).
 * @param {string} rawIp
 * @returns {"public" | "private" | "metadata" | "link_local" | "6to4"}
 */
function classifyIpv6(rawIp) {
  const ip = rawIp.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (ALWAYS_BLOCKED_IPS.has(ip)) return "metadata";
  if (ip === "::" || ip === "::1") return "private";
  if (ip.startsWith("2002:")) return "6to4"; // 6to4 IPv4 wrapper — never allowlisted
  if (ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb")) {
    return "link_local";
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) return "private"; // ULA
  const mappedV4 = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedV4) return classifyIpv4(mappedV4[1]);
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    const v4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return classifyIpv4(v4);
  }
  return "public";
}

/**
 * Validate a single IP address against SSRF policy.
 * @param {string} ip
 * @param {boolean} allowLocal
 */
export function checkIpSafety(ip, allowLocal = false) {
  const ver = net.isIP(ip);
  if (ver === 4) {
    const cls = classifyIpv4(ip);
    if (cls === "public") return { ok: true, cls };
    if (cls === "private" && allowLocal) return { ok: true, cls };
    return { ok: false, cls, reason: `SSRF Guard blocked ${cls} IPv4 target` };
  }
  if (ver === 6) {
    const cls = classifyIpv6(ip);
    if (cls === "public") return { ok: true, cls };
    if (cls === "private" && allowLocal) return { ok: true, cls };
    return { ok: false, cls, reason: `SSRF Guard blocked ${cls} IPv6 target` };
  }
  return { ok: false, cls: "invalid", reason: "SSRF Guard rejected invalid IP literal" };
}

/**
 * Validate proxy environment variables so malformed or credential-leaking proxy URLs fail closed cleanly.
 */
export function validateProxyEnv() {
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]) {
    const val = process.env[key];
    if (!val) continue;
    let parsed;
    try {
      parsed = new URL(val);
    } catch {
      throw new Error(`SSRF Guard: malformed proxy URL in ${key} (details redacted).`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`SSRF Guard: unsupported proxy protocol in ${key} (only http/https allowed).`);
    }
    const portNum = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error(`SSRF Guard: out-of-range proxy port in ${key} (details redacted).`);
    }
  }
}

/**
 * Fail-Closed URL validation + DNS resolution check against SSRF, cloud metadata, and private targets.
 * @param {string} rawUrl
 * @param {{ skipDns?: boolean }} [options]
 * @returns {Promise<URL>}
 */
export async function assertSafeUrl(rawUrl, options = {}) {
  validateProxyEnv();

  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    throw new Error("SSRF Guard: malformed target URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`SSRF Guard: blocked unsupported scheme '${parsed.protocol}' (only http/https permitted).`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`SSRF Guard: embedded credentials in URL are forbidden (${sanitizeUrlForError(rawUrl)}).`);
  }

  if (parsed.port) {
    const p = Number(parsed.port);
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      throw new Error("SSRF Guard: invalid port in target URL.");
    }
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) {
    throw new Error("SSRF Guard: empty hostname.");
  }

  if (ALWAYS_BLOCKED_HOSTS.has(host) || ALWAYS_BLOCKED_IPS.has(host)) {
    throw new Error(`SSRF Guard: blocked cloud metadata endpoint (${host}).`);
  }

  const allowlist = parseAllowlist("BITRIX_SEO_LOCAL_TARGETS");
  const isHostAllowlisted =
    allowlist.has(host) || (parsed.port && allowlist.has(`${host}:${parsed.port}`));

  if (host === "localhost" || host.endsWith(".localhost")) {
    if (!isHostAllowlisted) {
      throw new Error(
        `SSRF Guard: blocked loopback host '${host}'. Set BITRIX_SEO_LOCAL_TARGETS=${host} to opt in for local dev.`
      );
    }
    return parsed;
  }

  // Direct IP literal
  if (net.isIP(host)) {
    const check = checkIpSafety(host, isHostAllowlisted);
    if (!check.ok) {
      throw new Error(`${check.reason} (${host}).`);
    }
    return parsed;
  }

  // DNS resolution check (all A/AAAA records) to stop DNS rebinding / internal aliases
  if (!options.skipDns) {
    let records;
    try {
      records = await dns.lookup(host, { all: true });
    } catch {
      throw new Error(`SSRF Guard: failed to resolve hostname '${host}'.`);
    }
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`SSRF Guard: hostname '${host}' resolved to no addresses.`);
    }
    for (const rec of records) {
      const check = checkIpSafety(rec.address, isHostAllowlisted);
      if (!check.ok) {
        throw new Error(`${check.reason} (hostname '${host}' resolved to blocked address).`);
      }
    }
  }

  return parsed;
}

/**
 * Safe fetch wrapper that validates the initial URL and every manual redirect hop via assertSafeUrl.
 * @param {string} url
 * @param {RequestInit & { maxRedirects?: number }} [init]
 */
export async function safeFetch(url, init = {}) {
  const maxRedirects = Number(init.maxRedirects ?? 6);
  let current = String(url);
  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    return res;
  }
  throw new Error(`SSRF Guard: too many redirects for ${sanitizeUrlForError(url)}`);
}
