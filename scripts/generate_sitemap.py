from pathlib import Path
import xml.sax.saxutils as saxutils

SITE_URL = "https://luxaeris.com"
ROOT = Path("generated/site")
OUTPUT = ROOT / "sitemap-clean.xml"

EXCLUDE = {
    "404.html",
    "thank-you.html",
}

def to_url(p: Path) -> str:
    rel = p.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return SITE_URL + "/"
    if rel.endswith("/index.html"):
        return SITE_URL + "/" + rel[:-10]
    return SITE_URL + "/" + rel

urls = []
for p in sorted(ROOT.rglob("*.html")):
    if p.name in EXCLUDE:
        continue
    if p.stat().st_size == 0:
        continue
    urls.append(to_url(p))

urls = sorted(set(urls))

xml = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url in urls:
    xml.append(f"  <url><loc>{saxutils.escape(url)}</loc></url>")
xml.append('</urlset>')

OUTPUT.write_text("\n".join(xml), encoding="utf-8")
print(f"Generated {len(urls)} URLs -> {OUTPUT}")
