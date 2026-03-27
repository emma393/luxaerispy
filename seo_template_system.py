from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup
import json
import re
import unicodedata

SITE_URL = "https://luxaeris.com"


def _norm(value: str) -> str:
    return unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode('ascii').strip()


def _nice_name(stem: str) -> str:
    text = _norm(stem).replace('-', ' ').replace('_', ' ')
    words = []
    for word in text.split():
        low = word.lower()
        if low in {'and', 'or', 'of', 'to', 'by', 'in', 'for', 'with', 'the'}:
            words.append(low)
        else:
            words.append(word.capitalize())
    return ' '.join(words).replace('Usa', 'USA').replace('Uk', 'UK').replace('Dc', 'DC')


def _route_name(stem: str) -> str:
    return _nice_name(stem).replace(' To ', ' to ')


def _load_rules(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    return {}


def _page_kind(rel: Path) -> str:
    parts = rel.parts
    if 'routes' in parts:
        return 'route'
    if 'destinations' in parts:
        return 'destination'
    if 'airports' in parts:
        return 'airport'
    if 'airlines' in parts:
        return 'airline'
    if 'blog' in parts:
        return 'blog'
    if rel.name == 'request.html':
        return 'request'
    if rel.name == 'index.html' and len(rel.parts) == 1:
        return 'home'
    return 'page'


def _canonical(rel: Path) -> str:
    if rel.name == 'index.html' and len(rel.parts) == 1:
        return SITE_URL + '/'
    return SITE_URL + '/' + '/'.join(rel.parts)


def _redirect_target(text: str) -> str | None:
    m = re.search(r'http-equiv=["\']refresh["\'][^>]+url=([^"\']+)', text, re.I)
    if m:
        return m.group(1)
    m = re.search(r'location\.replace\(["\']([^"\']+)["\']\)', text, re.I)
    if m:
        return m.group(1)
    return None


def _first_text(soup: BeautifulSoup, selectors: list[str], min_len: int = 55) -> str:
    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        txt = re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip()
        if len(txt) >= min_len:
            return txt
    return ''


def _og_image(soup: BeautifulSoup) -> str:
    for selector in ["meta[property='og:image']", '.hero img', '.card img', 'img']:
        node = soup.select_one(selector)
        if not node:
            continue
        value = node.get('content', '').strip() if node.name == 'meta' else node.get('src', '').strip()
        if not value:
            continue
        if value.startswith('http://') or value.startswith('https://'):
            return value
        if value.startswith('/'):
            return SITE_URL + value
    return SITE_URL + '/favicon.svg'


def _metadata_for(rel: Path, html_text: str, soup: BeautifulSoup, rules: dict) -> dict:
    kind = _page_kind(rel)
    stem = rel.stem if rel.stem != 'index' else (rel.parent.name if rel.parent.name else 'index')
    name = _nice_name(stem)
    redirect = _redirect_target(html_text)
    heading = _first_text(soup, ['h1'], 3)
    lead = _first_text(soup, ['.lead', '.lede', '.hero p', 'main p', 'p'], 55)
    route_name = _route_name(stem)

    if kind == 'home':
        title = 'LuxAeris — Luxury Business & First Class Flight Concierge'
        desc = 'LuxAeris arranges premium business class, first class, and premium economy journeys with elegant route planning, polished airport selection, and discreet concierge-style support.'
    elif kind == 'request':
        title = 'Request Premium Flight Options | LuxAeris'
        desc = 'Request business class, first class, or premium economy flight options with LuxAeris and share your preferred route, timing, cabin, and budget in one polished form.'
    elif kind == 'route':
        title = f'{route_name} Business Class Route Guide | LuxAeris'
        desc = lead or f'Explore the LuxAeris premium route guide for {route_name}, with U.S.-focused long-haul planning, airport context, cabin guidance, and refined premium travel support.'
    elif kind == 'destination':
        base_name = heading or name
        title = f'{base_name} Premium Destination Guide | LuxAeris'
        desc = lead or f'Explore {base_name} with LuxAeris premium travel planning, refined route ideas from the United States, airport context, and business class and first class guidance.'
    elif kind == 'airport':
        base_name = heading or name
        title = f'{base_name} Airport Guide | LuxAeris'
        desc = lead or f'Explore the LuxAeris airport guide for {base_name}, with airline and alliance context, hub insight, and premium planning details for smoother long-haul travel.'
    elif kind == 'airline':
        base_name = heading or name
        title = f'{base_name} Airline Cabin Guide | LuxAeris'
        desc = lead or f'Explore the LuxAeris cabin guide for {base_name}, with premium seat, route, and booking context for travelers comparing business class and first class options.'
    elif kind == 'blog':
        base_name = heading or name
        title = f'{base_name} | LuxAeris Journal'
        desc = lead or f'Read the LuxAeris journal entry on {base_name.lower()} and discover premium travel insights, routes, and planning ideas.'
    else:
        base_name = heading or name
        title = f'{base_name} | LuxAeris'
        desc = lead or f'Explore {base_name} with LuxAeris premium flight planning, refined route ideas, and concierge-style travel support.'

    if redirect:
        target_name = _nice_name(Path(redirect).stem)
        desc = f'Redirecting to the latest LuxAeris page for {target_name}.'
        robots = 'noindex,follow'
    else:
        robots = 'index,follow'

    overrides = rules.get('overrides', {})
    rel_key = rel.as_posix()
    if rel_key in overrides:
        title = overrides[rel_key].get('title', title)
        desc = overrides[rel_key].get('description', desc)

    desc = re.sub(r'\s+', ' ', desc).strip()
    if len(desc) > 175:
        desc = desc[:172].rstrip(' ,;:-.') + '.'

    return {
        'title': title,
        'description': desc,
        'canonical': _canonical(rel),
        'robots': robots,
        'og_image': _og_image(soup),
    }


def _inject_head_tags(soup: BeautifulSoup, meta: dict):
    head = soup.head
    if head is None:
        head = soup.new_tag('head')
        if soup.html:
            soup.html.insert(0, head)

    for selector in [
        'title',
        "meta[name='description']",
        "meta[name='keywords']",
        "meta[name='robots']",
        "meta[property='og:title']",
        "meta[property='og:description']",
        "meta[property='og:type']",
        "meta[property='og:url']",
        "meta[property='og:image']",
        "meta[name='twitter:card']",
        "meta[name='twitter:title']",
        "meta[name='twitter:description']",
        "meta[name='twitter:image']",
        "link[rel='canonical']",
        "script[type='application/ld+json'][data-luxaeris='seo']",
    ]:
        for tag in head.select(selector):
            tag.decompose()

    title_tag = soup.new_tag('title')
    title_tag.string = meta['title']
    head.append(title_tag)

    tags = [
        ('meta', {'name': 'description', 'content': meta['description']}),
        ('meta', {'name': 'keywords', 'content': 'business class flights, first class flights, premium economy flights, luxury travel, premium flight concierge'}),
        ('meta', {'name': 'robots', 'content': meta['robots']}),
        ('link', {'rel': 'canonical', 'href': meta['canonical']}),
        ('meta', {'property': 'og:title', 'content': meta['title']}),
        ('meta', {'property': 'og:description', 'content': meta['description']}),
        ('meta', {'property': 'og:type', 'content': 'website'}),
        ('meta', {'property': 'og:url', 'content': meta['canonical']}),
        ('meta', {'property': 'og:image', 'content': meta['og_image']}),
        ('meta', {'name': 'twitter:card', 'content': 'summary_large_image'}),
        ('meta', {'name': 'twitter:title', 'content': meta['title']}),
        ('meta', {'name': 'twitter:description', 'content': meta['description']}),
        ('meta', {'name': 'twitter:image', 'content': meta['og_image']}),
    ]
    for name, attrs in tags:
        tag = soup.new_tag(name)
        for key, value in attrs.items():
            tag.attrs[key] = value
        head.append(tag)

    schema = soup.new_tag('script', attrs={'type': 'application/ld+json', 'data-luxaeris': 'seo'})
    schema.string = json.dumps({'@context': 'https://schema.org', '@type': 'TravelAgency', 'name': 'LuxAeris', 'url': SITE_URL, 'mainEntityOfPage': meta['canonical']}, ensure_ascii=False)
    head.append(schema)


def apply_dynamic_seo(output_root: Path, rules_path: Path):
    rules = _load_rules(rules_path)
    for html_file in sorted(output_root.rglob('*.html')):
        rel = html_file.relative_to(output_root)
        html_text = html_file.read_text(encoding='utf-8', errors='ignore')
        soup = BeautifulSoup(html_text, 'html.parser')
        meta = _metadata_for(rel, html_text, soup, rules)
        _inject_head_tags(soup, meta)
        html_file.write_text(str(soup), encoding='utf-8')
