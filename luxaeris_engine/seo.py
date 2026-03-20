from __future__ import annotations
import json
from urllib.parse import urljoin

def infer_keywords(page_type: str, title: str, h1: str) -> str:
    base = [
        'business class flights', 'first class flights', 'premium flights',
        'luxury travel', 'premium route guide', 'airport guide', 'LuxAeris'
    ]
    extras = {
        'route': ['route guide', 'flight route insights'],
        'destination': ['destination guide', 'city travel guide'],
        'airport': ['airport lounge guide', 'airport planning'],
        'airline': ['airline review', 'cabin guide'],
        'flight': ['flight guide', 'route context'],
        'index': ['travel index', 'premium travel research'],
    }
    base.extend(extras.get(page_type, []))
    if h1:
        base.append(h1.lower())
    if title:
        base.append(title.lower())
    seen=[]
    for item in base:
        if item and item not in seen:
            seen.append(item)
    return ', '.join(seen)


def breadcrumb_items(site_url: str, rel_path: str, h1: str):
    rel_path = rel_path.lstrip('/')
    parts = [p for p in rel_path.split('/') if p and p != 'index.html']
    crumbs = [{'name': 'Home', 'item': site_url.rstrip('/') + '/'}]
    accum = ''
    for i, part in enumerate(parts):
        accum = f"{accum}/{part}" if accum else part
        label = part.replace('.html', '').replace('-', ' ').title()
        if i == len(parts) - 1 and part.endswith('.html'):
            label = h1
        crumbs.append({'name': label, 'item': urljoin(site_url.rstrip('/') + '/', accum)})
    if not parts:
        crumbs[-1]['name'] = h1
    return crumbs


def schema_graph(site_name: str, site_url: str, canonical_url: str, title: str, description: str,
                 page_type: str, h1: str, image_url: str, rel_path: str, faq_items=None):
    faq_items = faq_items or []
    crumbs = breadcrumb_items(site_url, rel_path, h1)
    graph = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': site_url.rstrip('/') + '/#website',
            'name': site_name,
            'url': site_url.rstrip('/') + '/',
            'potentialAction': {
                '@type': 'SearchAction',
                'target': site_url.rstrip('/') + '/search.html?q={search_term_string}',
                'query-input': 'required name=search_term_string'
            }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': site_url.rstrip('/') + '/#organization',
            'name': site_name,
            'url': site_url.rstrip('/') + '/'
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': canonical_url + '#webpage',
            'url': canonical_url,
            'name': title,
            'headline': h1,
            'description': description,
            'isPartOf': {'@id': site_url.rstrip('/') + '/#website'},
            'primaryImageOfPage': image_url,
            'breadcrumb': {'@id': canonical_url + '#breadcrumb'}
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            '@id': canonical_url + '#breadcrumb',
            'itemListElement': [
                {'@type': 'ListItem', 'position': idx + 1, 'name': item['name'], 'item': item['item']}
                for idx, item in enumerate(crumbs)
            ]
        }
    ]
    if page_type in {'route', 'destination', 'airport', 'airline', 'flight'}:
        graph.append({
            '@context': 'https://schema.org',
            '@type': 'TravelAction',
            'name': h1,
            'description': description,
            'target': canonical_url
        })
    if faq_items:
        graph.append({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': [
                {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}}
                for q, a in faq_items
            ]
        })
    return json.dumps(graph, ensure_ascii=False)
