#!/usr/bin/env node
import fs from "fs";
import path from "path";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "6e2a8c496bce49f4aebfc321063b2e26";
const SITE_URL = (process.env.SITE_URL || "https://luxaeris.com").replace(/\/$/, "");
const KEY_LOCATION = process.env.KEY_LOCATION || `${SITE_URL}/6e2a8c496bce49f4aebfc321063b2e26.txt`;
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
const LIMIT = Number(process.env.LIMIT || 0); // 0 = no limit

const root = process.cwd();
const sitemapCandidates = [
  path.join(root, "generated", "site", "sitemap.xml"),
  path.join(root, "generated", "site", "sitemap-1.xml"),
  path.join(root, "generated", "site", "sitemap-2.xml"),
  path.join(root, "generated", "site", "sitemap-3.xml"),
  path.join(root, "generated", "site", "sitemap-4.xml"),
];

function readUrlsFromXml(xml) {
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/gims;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

function collectUrls() {
  const all = [];
  for (const file of sitemapCandidates) {
    if (fs.existsSync(file)) {
      const xml = fs.readFileSync(file, "utf8");
      all.push(...readUrlsFromXml(xml));
    }
  }
  const deduped = [...new Set(all)].filter((u) => u.startsWith(SITE_URL));
  return LIMIT > 0 ? deduped.slice(0, LIMIT) : deduped;
}

async function submitBatch(urlList) {
  const payload = {
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IndexNow submission failed (${res.status}): ${body}`);
  }

  console.log(`Submitted ${urlList.length} URLs`);
}

async function main() {
  const urls = collectUrls();
  if (!urls.length) {
    console.log("No URLs found in generated/site sitemaps.");
    return;
  }

  console.log(`Preparing to submit ${urls.length} URLs to IndexNow...`);

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    await submitBatch(batch);
  }

  console.log("IndexNow submission completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
