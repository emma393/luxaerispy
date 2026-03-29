const fs = require('fs');
const path = require('path');

const SITE_URL = "https://luxaeris.com";
const ROOT = "./generated/site";

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith(".html")) {
      results.push(filePath);
    }
  });
  return results;
}

function buildSitemap() {
  const files = getHtmlFiles(ROOT);

  const urls = files.map(f => {
    const url = f.replace(ROOT, "").replace("index.html", "").replace(".html", "");
    return `<url><loc>${SITE_URL}${url}</loc></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  fs.writeFileSync("./static/sitemap-clean.xml", xml);
  console.log("Sitemap generated:", urls.length, "URLs");
}

buildSitemap();
