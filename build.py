from pathlib import Path
import shutil
from datetime import date
from bs4 import BeautifulSoup
import json
import re

SITE_URL = "https://luxaeris.com"

def copy_contents(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

def html_to_url(out: Path, html: Path) -> str:
    rel = html.relative_to(out).as_posix()
    if rel == "index.html":
        return SITE_URL + "/"
    if rel.endswith("/index.html"):
        return SITE_URL + "/" + rel[:-10]
    return SITE_URL + "/" + rel

def build_sitemap(out: Path):
    today = date.today().isoformat()
    urls = []
    exclude_names = {"404.html"}
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        if html.name in exclude_names:
            continue
        if html.stat().st_size == 0:
            continue
        url = html_to_url(out, html)
        urls.append(f"  <url><loc>{url}</loc><lastmod>{today}</lastmod></url>")
    sitemap_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + '\n'.join(urls) +
        '\n</urlset>\n'
    )
    (out / 'sitemap-clean.xml').write_text(sitemap_xml, encoding='utf-8')

def build_search_index(out: Path):
    pages = []
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        if rel.startswith('tools/'):
            continue
        if html.name == '404.html':
            continue
        try:
            soup = BeautifulSoup(html.read_text(encoding='utf-8', errors='ignore'), 'html.parser')
        except Exception:
            continue
        title = soup.title.get_text(" ", strip=True) if soup.title else rel
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        desc = desc_tag.get('content', '').strip() if desc_tag else ''
        h1 = soup.find('h1')
        heading = h1.get_text(" ", strip=True) if h1 else ''
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        text = soup.get_text(" ", strip=True)
        text = re.sub(r'\s+', ' ', text)[:1800]
        pages.append({
            'url': html_to_url(out, html).replace(SITE_URL, '') or '/',
            'title': title,
            'heading': heading,
            'description': desc,
            'text': text
        })
    assets = out / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    (assets / 'search-index.json').write_text(
        json.dumps(pages, ensure_ascii=False),
        encoding='utf-8'
    )

def main():
    base = Path(__file__).resolve().parent
    src = base / 'static'
    out = base / 'generated' / 'site'
    if not src.exists():
        raise FileNotFoundError(f'Missing source folder: {src}')
    if out.exists():
        shutil.rmtree(out)
    copy_contents(src, out)
    if not (out / 'index.html').exists():
        raise FileNotFoundError('generated/site/index.html was not created')

    # Final live robots.txt must point to sitemap-clean.xml
    (out / 'robots.txt').write_text(
        'User-agent: *\nAllow: /\n\nSitemap: https://luxaeris.com/sitemap-clean.xml\n',
        encoding='utf-8'
    )

    build_search_index(out)
    build_sitemap(out)
    print('LuxAeris production site ready in generated/site/')

if __name__ == '__main__':
    main()
