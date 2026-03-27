from pathlib import Path
import json
from collections import defaultdict

def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')

def slug_title(value: str) -> str:
    return value.replace('-', ' ').title().replace('Dc', 'DC').replace('Usa', 'USA')

def page_shell(title: str, kicker: str, intro: str, body: str, image_url: str = '', page_class: str = '') -> str:
    visual = f'<div class="visual-card"><img src="{image_url}" alt="{title}" onerror="this.style.display=\'none\'"></div>' if image_url else ''
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg"><link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/site.js"></script></head>
<body class="{page_class}">
<div class="topbar"><div class="container topbar-inner"><span>No booking fees on tailored requests</span><span>Business Class • First Class • Premium Economy</span></div></div>
<header class="site-header"><div class="container nav"><a class="logo-wrap" href="/index.html"><img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo"><div><div class="brand-name">LuxAeris</div><div class="brand-tag">Private fares. Premium journeys.</div></div></a><nav class="nav-links"><a href="/index.html">Home</a><a href="/destinations/index.html">Destinations</a><a href="/airlines/index.html">Airlines</a><a href="/airports/index.html">Airports</a><a href="/routes/index.html">Routes</a><a href="/request.html">Request</a></nav></div></header>
<section class="section route-hub-section"><div class="container"><p class="kicker">{kicker}</p><div class="route-hero-split"><div class="route-guide-card"><h1 class="section-title">{title}</h1><p class="section-intro">{intro}</p></div>{visual}</div>{body}</div></section>
<footer class="footer"><div class="container footer-grid"><div><div class="brand-name">LuxAeris</div><p class="footer-note">Tailored premium options, refined airport planning, and polished long-haul route guidance.</p></div><div><p class="footer-note">Request tailored options when you want discreet support and premium fare context.</p></div></div></footer></body></html>'''

def route_duration(region: str) -> str:
    return {
        'europe': '7 to 10 hours from major U.S. gateways',
        'middle-east': '11 to 14 hours from major U.S. gateways',
        'africa': '13 to 17 hours from major U.S. gateways',
        'asia': '12 to 17 hours from major U.S. gateways',
        'oceania': '14 to 18 hours from major U.S. gateways',
        'latin-america': '6 to 10 hours from many U.S. gateways',
        'caribbean': '3 to 5 hours from many East Coast gateways',
        'north-america': '2 to 6 hours depending on gateway',
    }.get(region, 'Long-haul timing varies by gateway')

def route_body(origin: dict, dest: dict, variant: dict, related: list[dict]) -> str:
    chips = ''.join([f'<a class="route-pill" href="/routes/{dest["region"]}/{dest["country_slug"]}/{dest["city_slug"]}/{o["slug"]}-{variant["slug"]}.html">{o["city"]}</a>' for o in related[:12]])
    bullets = ''.join([
        f'<li>Compare cabin timing, total journey length, and likely connection patterns between {origin["city"]} and {dest["city"]}.</li>',
        f'<li>Prioritize {variant["label"]} options with cleaner airport flow into {dest["airport_code"]} and premium schedule quality.</li>',
        '<li>Use LuxAeris to request private fare options, schedule-friendly combinations, and polished long-haul planning support.</li>',
    ])
    facts = f'<div class="facts-grid"><div class="fact-card"><span class="fact-label">Origin</span><strong>{origin["city"]} · {origin["airport_code"]}</strong></div><div class="fact-card"><span class="fact-label">Destination</span><strong>{dest["city"]} · {dest["airport_code"]}</strong></div><div class="fact-card"><span class="fact-label">Cabin focus</span><strong>{variant["label"]}</strong></div><div class="fact-card"><span class="fact-label">Typical timing</span><strong>{route_duration(dest["region"])}</strong></div></div>'
    return f'{facts}<div class="guide-grid"><div class="card"><h2>What to look for on this route</h2><ul class="guide-list">{bullets}</ul></div><div class="card"><h2>Popular nearby departures</h2><div class="route-pill-grid">{chips}</div></div></div><div class="cta-box"><h2>{variant["cta"]}</h2><p>Share your preferred airport, travel window, cabin, and budget range so LuxAeris can shape refined options from {origin["city"]} to {dest["city"]}.</p><a class="btn" href="/request.html?origin={origin["city"]}&originCode={origin["metro_code"]}&destination={dest["city"]}&destinationCode={dest["airport_code"]}&cabin={variant["label"]}">Request tailored options</a></div>'

def city_hub_body(dest: dict, origins: list[dict], variants: list[dict]) -> str:
    cards = []
    for variant in variants:
        href = f'/routes/{dest["region"]}/{dest["country_slug"]}/{dest["city_slug"]}/{origins[0]["slug"]}-{variant["slug"]}.html'
        cards.append(f'<a class="hierarchy-card" href="{href}"><h3>{variant["label"]} from the U.S.</h3><p>Explore {variant["label"].lower()} pages for key U.S. gateways into {dest["city"]}.</p></a>')
    route_pills = ''.join([f'<a class="route-pill" href="/routes/{dest["region"]}/{dest["country_slug"]}/{dest["city_slug"]}/{o["slug"]}-business-class-flights.html">{o["city"]} → {dest["city"]}</a>' for o in origins[:14]])
    return f'<div class="facts-grid"><div class="fact-card"><span class="fact-label">Region</span><strong>{slug_title(dest["region"])}</strong></div><div class="fact-card"><span class="fact-label">Country</span><strong>{dest["country"]}</strong></div><div class="fact-card"><span class="fact-label">Airport</span><strong>{dest["airport_code"]}</strong></div><div class="fact-card"><span class="fact-label">Focus</span><strong>U.S.-origin premium routes</strong></div></div><div class="hierarchy-grid">{"".join(cards)}</div><div class="card"><h2>Popular U.S. departures</h2><div class="route-pill-grid">{route_pills}</div></div><div class="cta-box"><h2>Request options into {dest["city"]}</h2><p>Tell LuxAeris your preferred U.S. gateway, travel dates, cabin, and fare range for tailored premium route options into {dest["city"]}.</p><a class="btn" href="/request.html?destination={dest["city"]}&destinationCode={dest["airport_code"]}">Request tailored options</a></div>'

def generate_scaling_pages(out: Path, data_dir: Path):
    origins = json.loads((data_dir / 'us_origins.json').read_text(encoding='utf-8'))
    destinations = json.loads((data_dir / 'global_destinations.json').read_text(encoding='utf-8'))
    variants = json.loads((data_dir / 'route_generation_config.json').read_text(encoding='utf-8'))['route_variants']
    blog_topics = json.loads((data_dir / 'blog_topics.json').read_text(encoding='utf-8'))
    by_region = defaultdict(list)
    by_country = defaultdict(list)
    for d in destinations:
        by_region[d['region']].append(d)
        by_country[(d['region'], d['country_slug'])].append(d)

    # Routes index
    region_cards = []
    for region, dests in sorted(by_region.items()):
        country_count = len({d['country_slug'] for d in dests})
        region_cards.append(f'<a class="hierarchy-card" href="/routes/{region}/index.html"><h3>{slug_title(region)}</h3><p>{len(dests)} destination hubs across {country_count} countries with premium U.S.-origin route coverage.</p></a>')
    write(out / 'routes' / 'index.html', page_shell('Global premium route guides', 'Routes', 'Browse LuxAeris route hubs by region, country, and city, with every collection built around U.S.-origin premium demand and high-intent cabin planning.', f'<div class="hierarchy-grid">{"".join(region_cards)}</div>', '', 'route-page'))

    for region, dests in by_region.items():
        countries = sorted({(d['country_slug'], d['country']) for d in dests})
        country_cards = []
        for country_slug, country in countries:
            cdests = by_country[(region, country_slug)]
            country_cards.append(f'<a class="hierarchy-card" href="/routes/{region}/{country_slug}/index.html"><h3>{country}</h3><p>{len(cdests)} destination hubs and {(len(origins) * len(cdests) * len(variants)):,} route-intent pages.</p></a>')
        write(out / 'routes' / region / 'index.html', page_shell(f'{slug_title(region)} route guide hub', 'Routes', f'Browse countries and route clusters for {slug_title(region).lower()} with direct access to city-pair pages built around premium cabin demand and U.S.-focused organic search intent.', f'<div class="hierarchy-grid">{"".join(country_cards)}</div>', '', 'route-page'))
        for country_slug, country in countries:
            cdests = by_country[(region, country_slug)]
            city_cards = []
            for d in cdests:
                city_cards.append(f'<a class="hierarchy-card" href="/routes/{region}/{country_slug}/{d["city_slug"]}/index.html"><h3>{d["city"]}</h3><p>{(len(origins) * len(variants)):,} premium route pages from major U.S. gateways into {d["airport_code"]}.</p></a>')
            write(out / 'routes' / region / country_slug / 'index.html', page_shell(f'{country} premium route guides', 'Routes', f'Browse city route hubs for {country}, with every collection focused on U.S.-origin premium demand, practical airport selection, and long-haul cabin intent.', f'<div class="hierarchy-grid">{"".join(city_cards)}</div>', '', 'route-page'))

    airport_seen = {}
    for d in destinations:
        image = f'/assets/images/cities/{d["image_slug"]}.webp'
        city_dir = out / 'routes' / d['region'] / d['country_slug'] / d['city_slug']
        write(city_dir / 'index.html', page_shell(f'{d["city"]} premium route hub', 'Routes', f'Use this {d["city"]} route hub to explore monetizable U.S.-origin premium pages, compare cabin intent, and move into tailored request flow without leaving the guide.', city_hub_body(d, origins, variants), image, 'route-page'))

        dest_dir = out / 'destinations' / d['region'] / d['country_slug'] / d['city_slug']
        write(dest_dir / 'index.html', page_shell(f'{d["city"]} premium destination guide', 'Destinations', d['blurb'], city_hub_body(d, origins[:20], variants), image, 'destination-page'))

        if d['airport_code'] not in airport_seen:
            airport_seen[d['airport_code']] = d
            airport_body = f'<div class="facts-grid"><div class="fact-card"><span class="fact-label">Airport code</span><strong>{d["airport_code"]}</strong></div><div class="fact-card"><span class="fact-label">City</span><strong>{d["city"]}</strong></div><div class="fact-card"><span class="fact-label">Country</span><strong>{d["country"]}</strong></div><div class="fact-card"><span class="fact-label">Use case</span><strong>Premium long-haul arrivals</strong></div></div><div class="cta-box"><h2>Plan premium arrivals into {d["airport_code"]}</h2><p>Connect route pages, destination pages, and request flow around {d["city"]} and polished premium airport planning.</p><a class="btn" href="/request.html?destination={d["city"]}&destinationCode={d["airport_code"]}">Request tailored options</a></div>'
            write(out / 'airports' / f'{d["airport_code"].lower()}.html', page_shell(f'{d["airport_code"]} airport guide', 'Airports', f'Explore premium planning context for {d["city"]} and use {d["airport_code"]} as a cleaner arrival point for long-haul U.S.-origin journeys.', airport_body, image, 'airport-page'))

        for o in origins:
            for v in variants:
                slug = f'{o["slug"]}-{v["slug"]}.html'
                title = f'{v["label"]} flights from {o["city"]} to {d["city"]}'
                intro = f'Compare {v["label"].lower()} options from {o["city"]} into {d["city"]}, with premium timing, airport flow, and request-ready route context built for LuxAeris conversion.'
                write(city_dir / slug, page_shell(title, 'Routes', intro, route_body(o, d, v, origins), image, 'route-page'))

    dest_cards = ''.join([f'<a class="hierarchy-card" href="/destinations/{d["region"]}/{d["country_slug"]}/{d["city_slug"]}/index.html"><h3>{d["city"]}</h3><p>{d["country"]} · premium destination guide</p></a>' for d in destinations[:120]])
    write(out / 'destinations' / 'index.html', page_shell('Premium destination guides', 'Destinations', 'Explore premium city guides with U.S.-origin route context, airport planning notes, and LuxAeris request flow built into the pages that matter most.', f'<div class="hierarchy-grid">{dest_cards}</div>', '', 'destination-page'))

    airport_cards = ''.join([f'<a class="hierarchy-card" href="/airports/{code.lower()}.html"><h3>{code}</h3><p>{d["city"]} · {d["country"]}</p></a>' for code, d in list(airport_seen.items())[:140]])
    write(out / 'airports' / 'index.html', page_shell('Premium airport guides', 'Airports', 'Browse airport guides that support premium arrivals, airline and alliance context, and long-haul route planning from the United States.', f'<div class="hierarchy-grid">{airport_cards}</div>', '', 'airport-page'))

    blog_cards = []
    blog_dir = out / 'blog'
    for item in blog_topics:
        body = f'<div class="card"><p>{item["title"]} is written to support LuxAeris route coverage, destination discovery, and polished premium request flow. Use this article to move from informational search into a higher-intent route or request page.</p></div><div class="cta-box"><h2>Continue into premium route planning</h2><p>Move from this article into route pages, destination guides, and tailored quote requests built around cabin quality and clean airport selection.</p><a class="btn" href="/request.html">Request tailored options</a></div>'
        write(blog_dir / f'{item["slug"]}.html', page_shell(item['title'], 'Journal', f'LuxAeris journal coverage for {item["destination"]} with premium travel context and route-oriented internal linking.', body, '', 'blog-page'))
        blog_cards.append(f'<a class="hierarchy-card" href="/blog/{item["slug"]}.html"><h3>{item["title"]}</h3><p>{item["destination"]} · premium travel journal</p></a>')
    write(blog_dir / 'index.html', page_shell('LuxAeris journal', 'Journal', 'Browse informational content that supports premium route discovery, destination planning, and high-intent internal links into LuxAeris money pages.', f'<div class="hierarchy-grid">{"".join(blog_cards[:80])}</div>', '', 'blog-page'))

    manifest = {
        'route_variant_pages': len(origins) * len(destinations) * len(variants),
        'destination_guides': len(destinations),
        'airport_guides': len(airport_seen),
        'blog_articles': len(blog_topics),
        'estimated_total_generated_pages': len(origins) * len(destinations) * len(variants) + len(destinations) + len(airport_seen) + len(blog_topics) + 1 + len(by_region) + len(by_country) + 3
    }
    write(out / 'page-count-manifest.json', json.dumps(manifest, indent=2))
