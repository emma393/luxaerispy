#!/usr/bin/env node
import fs from "fs";
import path from "path";

const SITE_URL = (process.env.SITE_URL || "https://luxaeris.com").replace(/\/$/, "");
const SITE_ROOT = path.resolve(process.cwd(), process.env.SITE_ROOT || "generated/site");
const KEY = process.env.INDEXNOW_KEY || "6e2a8c496bce49f4aebfc321063b2e26";
const KEY_LOCATION = process.env.KEY_LOCATION || `${SITE_URL}/6e2a8c496bce49f4aebfc321063b2e26.txt`;
const MAX_URLS_PER_BATCH = Number(process.env.INDEXNOW_BATCH_SIZE || 5000);

function readXml(pathname) {
  return fs.readFileSync(pathname, "utf8");
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gims)].map((m) => m[1].trim());
}

function getUrlBatches() {
  const sitemapIndexPath = path.join(SITE_ROOT, "sitemap.xml");
  if (!fs.existsSync(sitemapIndexPath)) throw new Error(`Missing sitemap index: ${sitemapIndexPath}`);
  const indexXml = readXml(sitemapIndexPath);
  const childSitemaps = extractLocs(indexXml).filter((u) => u.includes("/sitemap-"));
  const allUrls = [];
  for (const childUrl of childSitemaps) {
    const filename = childUrl.split("/").pop();
    const childPath = path.join(SITE_ROOT, filename);
    if (!fs.existsSync(childPath)) continue;
    allUrls.push(...extractLocs(readXml(childPath)).filter((u) => u.startsWith(SITE_URL)));
  }
  const deduped = [...new Set(allUrls)];
  const batches = [];
  for (let i = 0; i < deduped.length; i += MAX_URLS_PER_BATCH) {
    batches.push(deduped.slice(i, i + MAX_URLS_PER_BATCH));
  }
  return batches;
}

async function submitBatch(urlList, batchNo) {
  const payload = {
    host: new URL(SITE_URL).host,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  console.log(`Batch ${batchNo}: HTTP ${res.status}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IndexNow failed for batch ${batchNo} (${res.status}): ${body}`);
  }
}

async function main() {
  const batches = getUrlBatches();
  if (!batches.length) {
    console.log("No URLs found for IndexNow submission.");
    return;
  }
  for (let i = 0; i < batches.length; i++) {
    await submitBatch(batches[i], i + 1);
  }
  console.log(`Submitted ${batches.length} batch(es) to IndexNow.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
