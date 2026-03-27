from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from luxaeris_engine.builder import LuxAerisBuilder
from luxaeris_engine.utils import ensure_dir

def detect_repo_root(start: Path) -> Path:
    candidates = [start, *start.parents]
    for c in candidates:
        if (c / 'core' / 'data').exists():
            return c
        if (c / 'data').exists() and (c / 'luxaeris_engine').exists():
            return c.parent
    raise FileNotFoundError('Could not detect repo root. Run this from the repo root or from core/.')

def detect_core_root(repo_root: Path) -> Path:
    if (repo_root / 'core' / 'data').exists():
        return repo_root / 'core'
    if (repo_root / 'data').exists() and (repo_root / 'luxaeris_engine').exists():
        return repo_root
    raise FileNotFoundError('Could not locate core/data.')

def detect_static_source(repo_root: Path) -> Path:
    for p in [repo_root / 'static' / 'static', repo_root / 'static', repo_root / 'generated' / 'site', repo_root / 'generated']:
        if (p / 'index.html').exists():
            return p
    raise FileNotFoundError('Could not locate a static source folder with index.html.')

def detect_output_root(repo_root: Path) -> Path:
    if (repo_root / 'generated' / 'site').exists():
        return repo_root / 'generated' / 'site'
    return repo_root / 'generated' / 'site'

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
        title = soup.title.get_text(' ', strip=True) if soup.title else rel
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        desc = desc_tag.get('content', '').strip() if desc_tag else ''
        h1 = soup.find('h1')
        heading = h1.get_text(' ', strip=True) if h1 else ''
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        text = re.sub(r'\s+', ' ', soup.get_text(' ', strip=True))[:1800]
        pages.append({'url': '/' + rel, 'title': title, 'heading': heading, 'description': desc, 'text': text})
    assets = out / 'assets'
    ensure_dir(assets)
    (assets / 'search-index.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')

def main():
    parser = argparse.ArgumentParser(description='Dynamic LuxAeris build runner for the split working repo.')
    parser.add_argument('--repo-root', default='.', help='Path to repo root containing core/, static/, generated/')
    args = parser.parse_args()

    start = Path(args.repo_root).resolve()
    repo_root = detect_repo_root(start)
    core_root = detect_core_root(repo_root)
    static_source = detect_static_source(repo_root)
    output_root = detect_output_root(repo_root)

    builder = LuxAerisBuilder(core_root)
    builder.static_root = static_source
    builder.output_root = output_root

    print(f'[LuxAeris] repo_root   = {repo_root}')
    print(f'[LuxAeris] core_root   = {core_root}')
    print(f'[LuxAeris] static_root = {static_source}')
    print(f'[LuxAeris] output_root = {output_root}')

    builder.build()
    build_search_index(output_root)
    print('[LuxAeris] Dynamic build complete.')

if __name__ == '__main__':
    main()
