#!/usr/bin/env node
import fs from "fs";
import path from "path";

const SITE_URL = (process.env.SITE_URL || "https://luxaeris.com").replace(/\/$/, "");
const ROOT = path.resolve(process.cwd(), process.env.SITE_ROOT || "generated/site");
const MAX_URLS_PER_FILE = Number(process.env.SITEMAP_BATCH_SIZE || 5000);

const PRIORITY_ORDER = [
  /^index\.html$/i,
  /^routes\/index\.html$/i,
  /^airlines\/index\.html$/i,
  /^destinations\/index\.html$/i,
  /^airports\/index\.html$/i,
  /^request\.html$/i,
  /^faq\.html$/i,
  /^routes\//i,
  /^airlines\//i,
  /^destinations\//i,
  /^airports\//i,
];

const EXCLUDE_PATTERNS = [
  /^404\.html$/i,
  /^sitemap.*\.xml$/i,
  /^robots\.txt$/i,
  /^BingSiteAuth\.xml$/i,
  new RegExp(`${escapeRegex(process.env.INDEXNOW_KEY || "")}\\.txt$`, "i"),
];

function escapeRegex(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toUrl(rel) {
  const clean = rel.replace(/\\/g, "/");
  if (clean === "index.html") return `${SITE_URL}/`;
  if (clean.endsWith("/index.html")) return `${SITE_URL}/${clean.slice(0, -10)}`;
  return `${SITE_URL}/${clean}`;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, acc);
    else acc.push(abs);
  }
  return acc;
}

function fileExists(abs) {
  try {
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

function buildUrlSet() {
  const files = walk(ROOT).filter((abs) => abs.toLowerCase().endsWith(".html"));
  const items = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (EXCLUDE_PATTERNS.some((p) => p && p.test(rel))) continue;
    if (!fileExists(abs)) continue;
    items.push({
      rel,
      abs,
      url: toUrl(rel),
      lastmod: new Date(fs.statSync(abs).mtimeMs).toISOString().slice(0, 10),
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    deduped.push(item);
  }

  deduped.sort((a, b) => {
    const ai = PRIORITY_ORDER.findIndex((r) => r.test(a.rel));
    const bi = PRIORITY_ORDER.findIndex((r) => r.test(b.rel));
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;
    return a.url.localeCompare(b.url);
  });

  return deduped;
}

function urlsetXml(items) {
  const body = items.map((item) => {
    return `  <url>\n    <loc>${escapeXml(item.url)}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function sitemapIndexXml(files) {
  const body = files.map((filename) => {
    return `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}/${filename}`)}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </sitemap>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function escapeXml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeRobots() {
  const content = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT, "robots.txt"), content, "utf8");
}

function removeOldSitemaps() {
  for (const name of fs.readdirSync(ROOT)) {
    if (/^sitemap.*\.xml$/i.test(name)) {
      fs.rmSync(path.join(ROOT, name), { force: true });
    }
  }
}

function main() {
  if (!fs.existsSync(ROOT)) {
    throw new Error(`Site root not found: ${ROOT}`);
  }

  removeOldSitemaps();
  const items = buildUrlSet();
  if (!items.length) {
    throw new Error("No HTML pages found to include in sitemap.");
  }

  const filenames = [];
  let fileIndex = 1;
  for (let i = 0; i < items.length; i += MAX_URLS_PER_FILE) {
    const chunk = items.slice(i, i + MAX_URLS_PER_FILE);
    const filename = fileIndex === 1 ? "sitemap-pages.xml" : `sitemap-pages-${fileIndex}.xml`;
    fs.writeFileSync(path.join(ROOT, filename), urlsetXml(chunk), "utf8");
    filenames.push(filename);
    fileIndex += 1;
  }

  // Optional route-specific shard for convenience
  const routeItems = items.filter((item) => item.rel.startsWith("routes/"));
  if (routeItems.length) {
    let routeIndex = 1;
    for (let i = 0; i < routeItems.length; i += MAX_URLS_PER_FILE) {
      const chunk = routeItems.slice(i, i + MAX_URLS_PER_FILE);
      const filename = `sitemap-routes-${routeIndex}.xml`;
      fs.writeFileSync(path.join(ROOT, filename), urlsetXml(chunk), "utf8");
      if (!filenames.includes(filename)) filenames.push(filename);
      routeIndex += 1;
    }
  }

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemapIndexXml(filenames), "utf8");
  writeRobots();

  const summary = {
    siteRoot: ROOT,
    urls: items.length,
    sitemapFiles: filenames,
  };
  fs.writeFileSync(path.join(ROOT, "sitemap-build-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`Built self-healing sitemap index with ${items.length} URLs.`);
}

main();
