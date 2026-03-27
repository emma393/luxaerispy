from pathlib import Path
import json, re

SITE_URL = "https://luxaeris.com"

def load_rules(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    return {'overrides': {}}

def strip_html(value: str) -> str:
    value = re.sub(r'<script.*?</script>', ' ', value, flags=re.S | re.I)
    value = re.sub(r'<style.*?</style>', ' ', value, flags=re.S | re.I)
    value = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()

def first_match(pattern: str, text: str) -> str:
    m = re.search(pattern, text, flags=re.S | re.I)
    return strip_html(m.group(1)) if m else ''

def page_kind(rel: str) -> str:
    if '/routes/' in rel or rel.startswith('routes/'):
        return 'route'
    if '/destinations/' in rel or rel.startswith('destinations/'):
        return 'destination'
    if '/airports/' in rel or rel.startswith('airports/'):
        return 'airport'
    if '/airlines/' in rel or rel.startswith('airlines/'):
        return 'airline'
    if '/blog/' in rel or rel.startswith('blog/'):
        return 'blog'
    if rel == 'request.html':
        return 'request'
    if rel == 'index.html':
        return 'home'
    return 'page'

def canonical(rel: str) -> str:
    return SITE_URL + ('/' if rel == 'index.html' else '/' + rel)

def metadata_for(rel: str, html: str, rules: dict):
    kind = page_kind(rel)
    stem = Path(rel).stem if Path(rel).stem != 'index' else Path(rel).parent.name
    label = stem.replace('-', ' ').title().replace('Dc', 'DC')
    h1 = first_match(r'<h1[^>]*>(.*?)</h1>', html)
    lead = first_match(r'<p[^>]*class="section-intro"[^>]*>(.*?)</p>', html) or first_match(r'<p[^>]*>(.*?)</p>', html)
    if kind == 'home':
        title = 'LuxAeris — Luxury Business & First Class Flight Concierge'
        desc = 'LuxAeris arranges premium business class, first class, and premium economy journeys with elegant route planning, polished airport selection, and discreet concierge-style support.'
    elif kind == 'request':
        title = 'Request Premium Flight Options | LuxAeris'
        desc = 'Request business class, first class, or premium economy flight options with LuxAeris and share your preferred route, timing, cabin, and budget in one polished form.'
    elif kind == 'route':
        title = f'{h1 or label} | LuxAeris'
        desc = lead or f'Explore premium route planning for {label} with U.S.-origin cabin intent, airport context, and tailored LuxAeris request flow.'
    elif kind == 'destination':
        title = f'{h1 or label} | LuxAeris'
        desc = lead or f'Explore {label} with premium travel context, airport planning, and U.S.-origin route ideas from LuxAeris.'
    elif kind == 'airport':
        title = f'{h1 or label} | LuxAeris'
        desc = lead or f'Explore airport guidance for {label} with premium arrivals, airline context, and long-haul travel support.'
    elif kind == 'blog':
        title = f'{h1 or label} | LuxAeris Journal'
        desc = lead or f'Read the LuxAeris journal article on {label.lower()} and connect into premium route and destination planning.'
    else:
        title = f'{h1 or label} | LuxAeris'
        desc = lead or f'Explore {label} with LuxAeris premium travel support.'
    override = rules.get('overrides', {}).get(rel)
    if override:
        title = override.get('title', title)
        desc = override.get('description', desc)
    desc = re.sub(r'\s+', ' ', desc).strip()
    if len(desc) > 175:
        desc = desc[:172].rstrip(' ,;:-.') + '.'
    return title, desc, canonical(rel)

def apply_dynamic_seo(output_root: Path, rules_path: Path):
    rules = load_rules(rules_path)
    for html_file in output_root.rglob('*.html'):
        rel = html_file.relative_to(output_root).as_posix()
        raw = html_file.read_text(encoding='utf-8', errors='ignore')
        title, desc, canon = metadata_for(rel, raw, rules)
        m = re.search(r'<head>(.*?)</head>', raw, flags=re.S | re.I)
        if not m:
            continue
        head = m.group(1)
        head = re.sub(r'<title>.*?</title>', '', head, flags=re.S | re.I)
        head = re.sub(r'<meta[^>]+name=["\']description["\'][^>]*>', '', head, flags=re.I)
        head = re.sub(r'<meta[^>]+name=["\']keywords["\'][^>]*>', '', head, flags=re.I)
        head = re.sub(r'<meta[^>]+name=["\']robots["\'][^>]*>', '', head, flags=re.I)
        head = re.sub(r'<meta[^>]+property=["\']og:[^"\']+["\'][^>]*>', '', head, flags=re.I)
        head = re.sub(r'<meta[^>]+name=["\']twitter:[^"\']+["\'][^>]*>', '', head, flags=re.I)
        head = re.sub(r'<link[^>]+rel=["\']canonical["\'][^>]*>', '', head, flags=re.I)
        seo = f'\n<title>{title}</title>\n<meta name="description" content="{desc}">\n<meta name="keywords" content="business class flights, first class flights, premium economy flights, luxury travel, premium flight concierge">\n<meta name="robots" content="index,follow">\n<link rel="canonical" href="{canon}">\n<meta property="og:title" content="{title}">\n<meta property="og:description" content="{desc}">\n<meta property="og:type" content="website">\n<meta property="og:url" content="{canon}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="{title}">\n<meta name="twitter:description" content="{desc}">\n<script type="application/ld+json">{{"@context":"https://schema.org","@type":"TravelAgency","name":"LuxAeris","url":"https://luxaeris.com","mainEntityOfPage":"{canon}"}}</script>'
        head = head + seo
        raw = raw[:m.start(1)] + head + raw[m.end(1):]
        html_file.write_text(raw, encoding='utf-8')
