#!/usr/bin/env node
import fs from "fs";
import path from "path";

const SITE_URL = (process.env.SITE_URL || "https://luxaeris.com").replace(/\/$/, "");
const SITE_ROOT = path.resolve(process.cwd(), process.env.SITE_ROOT || "generated/site");
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "6e2a8c496bce49f4aebfc321063b2e26";
const KEY_LOCATION = process.env.KEY_LOCATION || `${SITE_URL}/6e2a8c496bce49f4aebfc321063b2e26.txt`;
const BATCH_SIZE = Number(process.env.INDEXNOW_BATCH_SIZE || 5000);

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gims)].map(m => m[1].trim());
}

function loadUrlsFromSitemaps() {
  const sitemapIndexPath = path.join(SITE_ROOT, "sitemap-clean.xml");
  if (!fs.existsSync(sitemapIndexPath)) throw new Error(`Missing sitemap-clean.xml at ${sitemapIndexPath}`);
  const indexXml = fs.readFileSync(sitemapIndexPath, "utf8");
  const childSitemaps = extractLocs(indexXml)
    .map(url => url.split("/").pop())
    .filter(Boolean);

  const urls = [];
  for (const filename of childSitemaps) {
    const full = path.join(SITE_ROOT, filename);
    if (!fs.existsSync(full)) continue;
    urls.push(...extractLocs(fs.readFileSync(full, "utf8")).filter(u => u.startsWith(SITE_URL)));
  }
  return [...new Set(urls)];
}

async function submitBatch(urlList, batchNo) {
  const payload = {
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  console.log(`Batch ${batchNo}: HTTP ${res.status}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IndexNow failed for batch ${batchNo} (${res.status}): ${body}`);
  }
}

async function main() {
  const urls = loadUrlsFromSitemaps();
  if (!urls.length) {
    console.log("No URLs found in sitemap-clean.xml.");
    return;
  }
  let batchNo = 1;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    await submitBatch(urls.slice(i, i + BATCH_SIZE), batchNo++);
  }
  console.log(`Submitted ${urls.length} URLs through IndexNow.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
