
from pathlib import Path
import shutil
from datetime import date
from bs4 import BeautifulSoup
import json

def copy_contents(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

def build_sitemap(out: Path):
    today = date.today().isoformat()
    urls = []
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        urls.append(f"  <url><loc>https://luxaeris.com/{rel}</loc><lastmod>{today}</lastmod></url>")
    (out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n', encoding='utf-8')

def build_search_index(out: Path):
    pages = []
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        if rel.startswith('tools/'):
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
        for tag in soup(['script','style','noscript']):
            tag.decompose()
        text = soup.get_text(" ", strip=True)
        text = re.sub(r'\s+', ' ', text)[:1800]
        pages.append({
            'url': '/' + rel,
            'title': title,
            'heading': heading,
            'description': desc,
            'text': text
        })
    assets = out / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    (assets / 'search-index.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')

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
    # remove tools page from publish output
    if (out / 'tools').exists():
        shutil.rmtree(out / 'tools')
    (out / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://luxaeris.com/sitemap.xml\n', encoding='utf-8')
    build_search_index(out)
    build_sitemap(out)
    print('LuxAeris production site ready in generated/site/')

if __name__ == '__main__':
    import re
    main()
