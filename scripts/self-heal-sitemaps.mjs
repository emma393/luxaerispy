#!/usr/bin/env node
import fs from "fs";
import path from "path";

const SITE_URL = (process.env.SITE_URL || "https://luxaeris.com").replace(/\/$/, "");
const SITE_ROOT = path.resolve(process.cwd(), process.env.SITE_ROOT || "generated/site");
const BATCH_SIZE = Number(process.env.SITEMAP_BATCH_SIZE || 5000);
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "6e2a8c496bce49f4aebfc321063b2e26";

const EXCLUDE_FILES = new Set([
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "sitemap-clean.xml",
  "sitemap-build-summary.json"
]);

const EXCLUDE_PREFIXES = [
  "sitemap-core",
  "sitemap-pages",
  "sitemap-routes",
  "sitemap-airlines",
  "sitemap-destinations",
  "sitemap-airports"
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

function relFromRoot(abs) {
  return path.relative(SITE_ROOT, abs).replace(/\\/g, "/");
}

function toUrl(rel) {
  if (rel === "index.html") return `${SITE_URL}/`;
  if (rel.endsWith("/index.html")) return `${SITE_URL}/${rel.slice(0, -10)}`;
  return `${SITE_URL}/${rel}`;
}

function classify(rel) {
  if (rel === "index.html" || ["request.html","faq.html","about.html","search.html","contact.html"].includes(rel)) return "core";
  if (rel.startsWith("routes/")) return "routes";
  if (rel.startsWith("airlines/")) return "airlines";
  if (rel.startsWith("destinations/")) return "destinations";
  if (rel.startsWith("airports/")) return "airports";
  return "pages";
}

function shouldSkip(rel) {
  const name = path.basename(rel);
  if (EXCLUDE_FILES.has(name)) return true;
  if (name === `${INDEXNOW_KEY}.txt`) return true;
  return EXCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function collectRealPages() {
  if (!fs.existsSync(SITE_ROOT)) throw new Error(`Missing site root: ${SITE_ROOT}`);
  const files = walk(SITE_ROOT).filter((abs) => abs.toLowerCase().endsWith(".html"));
  const pages = [];
  const seen = new Set();

  for (const abs of files) {
    const rel = relFromRoot(abs);
    if (shouldSkip(rel)) continue;
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size === 0) continue;

    const url = toUrl(rel);
    if (seen.has(url)) continue;
    seen.add(url);

    pages.push({
      rel,
      url,
      group: classify(rel),
      lastmod: new Date(stat.mtimeMs).toISOString().slice(0, 10)
    });
  }

  pages.sort((a, b) => {
    const order = { core:0, pages:1, routes:2, airlines:3, destinations:4, airports:5 };
    const ao = order[a.group] ?? 9;
    const bo = order[b.group] ?? 9;
    if (ao !== bo) return ao - bo;
    return a.url.localeCompare(b.url);
  });

  return pages;
}

function removeOldSitemaps() {
  if (!fs.existsSync(SITE_ROOT)) return;
  for (const name of fs.readdirSync(SITE_ROOT)) {
    if (/^sitemap.*\.xml$/i.test(name)) {
      fs.rmSync(path.join(SITE_ROOT, name), { force: true });
    }
  }
}

function urlsetXml(items) {
  const rows = items.map((item) => `  <url>\n    <loc>${escapeXml(item.url)}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

function sitemapIndexXml(files) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = files.map((filename) => `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}/${filename}`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

function escapeXml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function writeGroup(groupName, baseName, pages, created) {
  const items = pages.filter((p) => p.group === groupName);
  if (!items.length) return;
  const batches = chunk(items, BATCH_SIZE);
  batches.forEach((batch, idx) => {
    const filename = batches.length === 1 ? `${baseName}.xml` : `${baseName}-${idx + 1}.xml`;
    fs.writeFileSync(path.join(SITE_ROOT, filename), urlsetXml(batch), "utf8");
    created.push(filename);
  });
}

function buildRobots() {
  const content = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-clean.xml\n`;
  fs.writeFileSync(path.join(SITE_ROOT, "robots.txt"), content, "utf8");
}

function main() {
  removeOldSitemaps();
  const pages = collectRealPages();
  if (!pages.length) throw new Error("No real HTML pages found.");

  const created = [];
  writeGroup("core", "sitemap-core", pages, created);
  writeGroup("pages", "sitemap-pages", pages, created);
  writeGroup("routes", "sitemap-routes", pages, created);
  writeGroup("airlines", "sitemap-airlines", pages, created);
  writeGroup("destinations", "sitemap-destinations", pages, created);
  writeGroup("airports", "sitemap-airports", pages, created);

  const sortWeight = (name) => {
    if (name.startsWith("sitemap-core")) return 0;
    if (name.startsWith("sitemap-pages")) return 1;
    if (name.startsWith("sitemap-routes")) return 2;
    if (name.startsWith("sitemap-airlines")) return 3;
    if (name.startsWith("sitemap-destinations")) return 4;
    if (name.startsWith("sitemap-airports")) return 5;
    return 9;
  };
  created.sort((a, b) => sortWeight(a) - sortWeight(b) || a.localeCompare(b));

  const indexXml = sitemapIndexXml(created);
  fs.writeFileSync(path.join(SITE_ROOT, "sitemap-clean.xml"), indexXml, "utf8");
  fs.writeFileSync(path.join(SITE_ROOT, "sitemap.xml"), indexXml, "utf8");
  buildRobots();

  const summary = {
    generatedAt: new Date().toISOString(),
    totalUrls: pages.length,
    groups: created,
    counts: pages.reduce((acc, p) => {
      acc[p.group] = (acc[p.group] || 0) + 1;
      return acc;
    }, {})
  };
  fs.writeFileSync(path.join(SITE_ROOT, "sitemap-build-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`Built self-healing sitemap system with ${pages.length} real URLs.`);
}

main();
