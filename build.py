from pathlib import Path
import json, re, shutil
from datetime import date
from page_generation import generate_scaling_pages
from seo_template_system import apply_dynamic_seo

SITE_URL = "https://luxaeris.com"

def copy_contents(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

def strip_html(value: str) -> str:
    value = re.sub(r'<script.*?</script>', ' ', value, flags=re.S | re.I)
    value = re.sub(r'<style.*?</style>', ' ', value, flags=re.S | re.I)
    value = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()

def build_sitemap(out: Path):
    today = date.today().isoformat()
    urls = []
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        loc = SITE_URL + ('/' if rel == 'index.html' else f'/{rel}')
        urls.append(f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod></url>')
    (out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n', encoding='utf-8')

def build_search_index(out: Path):
    pages = []
    for html in sorted(out.rglob('*.html')):
        rel = html.relative_to(out).as_posix()
        raw = html.read_text(encoding='utf-8', errors='ignore')
        title_match = re.search(r'<title>(.*?)</title>', raw, flags=re.S | re.I)
        desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']', raw, flags=re.I)
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', raw, flags=re.S | re.I)
        pages.append({
            'url': '/' + rel,
            'title': strip_html(title_match.group(1)) if title_match else rel,
            'heading': strip_html(h1_match.group(1)) if h1_match else '',
            'description': desc_match.group(1).strip() if desc_match else '',
            'text': strip_html(raw)[:1800]
        })
    assets = out / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    (assets / 'search-index.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')

def main():
    base = Path(__file__).resolve().parent
    src = base.parent / 'static'
    out = base.parent / 'generated' / 'site'
    if out.exists():
        shutil.rmtree(out)
    copy_contents(src, out)
    generate_scaling_pages(out, base / 'data')
    apply_dynamic_seo(out, base / 'data' / 'seo_template_rules.json')
    (out / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://luxaeris.com/sitemap.xml\n', encoding='utf-8')
    build_search_index(out)
    build_sitemap(out)
    print('LuxAeris full 25k+ system generated in generated/site/')

if __name__ == '__main__':
    main()
