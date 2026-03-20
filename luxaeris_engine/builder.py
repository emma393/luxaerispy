
from __future__ import annotations
import json, shutil
from pathlib import Path
from collections import defaultdict
from .utils import load_json, slug_to_title, ensure_dir, canonical, chunked
from .page_writer import write_page

class LuxAerisBuilder:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.data_root = project_root / "data"
        self.static_root = project_root / "static"
        self.output_root = project_root / "generated" / "site"
        ensure_dir(self.output_root)
        self.config = load_json(self.data_root / "site_config.json")
        self.airports = load_json(self.data_root / "airports.json")
        self.routes = load_json(self.data_root / "routes.json")
        self.lounges = load_json(self.data_root / "lounges.json")
        self.airlines = load_json(self.data_root / "airlines.json")
        self.aircraft = load_json(self.data_root / "aircraft.json")
        self.destinations = load_json(self.data_root / "destinations.json")
        self.flights = load_json(self.data_root / "flights.json")
        self.airline_map = {x.get("airline_slug", ""): x for x in self.airlines}

    def copy_static_site(self):
        if self.output_root.exists():
            shutil.rmtree(self.output_root)
        shutil.copytree(self.static_root, self.output_root)

    def ctx(self, title, description, rel_path, h1, intro, image_url, sections, related_links, page_type="generic", kicker="Guide", highlight_cards=None, sidebar_title="Next useful pages", sidebar_text="Use these related pages to continue your premium travel research."):
        if highlight_cards is None:
            highlight_cards = []
        return {
            "title": title,
            "description": description,
            "canonical_url": canonical(self.config["site_url"], rel_path),
            "og_image": canonical(self.config["site_url"], image_url or self.config["default_image"]),
            "h1": h1,
            "intro": intro,
            "sections": sections,
            "related_links": related_links,
            "image_url": image_url or self.config["default_image"],
            "request_quote_url": self.config["request_quote_url"],
            "site_name": self.config["site_name"],
            "brand_tagline": self.config["brand_tagline"],
            "schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "TravelAgency",
                "name": self.config["site_name"],
                "url": self.config["site_url"],
                "description": "Luxury business class and first class travel booking platform.",
                "areaServed": "Worldwide"
            }),
            "page_type": page_type,
            "kicker": kicker,
            "highlight_cards": highlight_cards,
            "sidebar_title": sidebar_title,
            "sidebar_text": sidebar_text,
        }

    def build_index(self, rel_dir, items, title, description):
        cards = "".join([
            f'<a class="visual-card" href="/{rel_dir}/{i["slug"]}.html"><img src="{i["img"]}" alt="{i["name"]}"><div class="visual-card-body"><h3>{i["name"]}</h3><p>{i["desc"]}</p></div></a>'
            for i in items[:300]
        ])
        html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title} | {self.config["site_name"]}</title><meta name="description" content="{description}"><link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/site.js"></script></head><body><div class="topbar"><div class="container topbar-inner"><span>No booking fees on quote requests</span><span>Business Class • First Class • Premium Economy</span></div></div><header class="site-header"><div class="container nav"><a class="logo-wrap" href="/index.html"><img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo"><div><div class="brand-name">{self.config["site_name"]}</div><div class="brand-tag">{self.config["brand_tagline"]}</div></div></a><nav class="nav-links"><a href="/index.html">Home</a><a href="/destinations/index.html">Destinations</a><a href="/airlines/index.html">Airlines</a><a href="/airports/index.html">Airports</a><a href="/routes/index.html">Routes</a><a href="/tools/index.html">Tools</a><a href="/search.html">Search</a><a class="btn btn-primary" href="/request.html">Request Quote</a></nav></div></header><a class="btn btn-primary floating-request" href="/request.html">Request Quote</a><section class="section" style="padding-top:120px"><div class="container"><p class="kicker">Explore</p><h1 class="section-title">{title}</h1><p class="section-intro">{description}</p><div class="index-visual-grid">{cards}</div></div></section></body></html>'''
        p = self.output_root / rel_dir / "index.html"
        ensure_dir(p.parent); p.write_text(html, encoding="utf-8")

    def build_destination_hierarchy(self):
        regions = defaultdict(list)
        countries = defaultdict(list)
        for d in self.destinations:
            region = d.get("region_cluster","global")
            country = d.get("country","International")
            regions[region].append(d)
            countries[(region, country)].append(d)

        # main destinations page -> continents
        cards = []
        for region, items in sorted(regions.items()):
            cards.append({"slug": region, "name": slug_to_title(region), "img": items[0].get("featured_image", self.config["default_image"]), "desc": f"Browse {len(items)} premium destinations in {slug_to_title(region)}."})
        self.build_index("destinations", cards, "Destinations by Continent", "Browse destinations by continent, then country, then city for a cleaner premium travel structure.")

        # continent pages -> countries
        for region, items in regions.items():
            country_cards = []
            by_country = defaultdict(list)
            for d in items:
                by_country[d.get("country","International")].append(d)
            for country, arr in sorted(by_country.items()):
                country_slug = country.lower().replace(" ","-")
                country_cards.append({"slug": country_slug, "name": country, "img": arr[0].get("featured_image", self.config["default_image"]), "desc": f"Browse {len(arr)} premium destinations in {country}."})
            self.build_index(f"destinations/{region}", country_cards, f"{slug_to_title(region)} Destinations", f"Explore premium destinations across {slug_to_title(region)} by country.")

            # country pages -> cities
            for country, arr in by_country.items():
                country_slug = country.lower().replace(" ","-")
                city_cards = []
                for d in arr:
                    city_cards.append({"slug": d["destination_slug"], "name": d["display_name"], "img": d.get("featured_image", self.config["default_image"]), "desc": d.get("luxury_summary","")[:150]})
                self.build_index(f"destinations/{region}/{country_slug}", city_cards, f"{country} Destinations", f"Explore premium destinations in {country}, then open city guides for routes, airports, and premium planning.")

    def build_destinations(self):
        items = []
        for d in self.destinations:
            slug, name = d["destination_slug"], d["display_name"]
            region = d.get("region_cluster","global")
            country_slug = d.get("country","International").lower().replace(" ","-")
            related = [{"href": f"/routes/{x}.html", "label": slug_to_title(x)} for x in d.get("route_slugs", [])[:10]]
            sections = [
                {"title": f"Why {name} works for premium travel", "text": d.get("luxury_summary", ""), "links": []},
                {"title": "Useful route guides", "text": "Open the strongest route pages to compare airport quality, timing, and better cabin choices.", "links": related},
                {"title": "Where this page sits in the destination structure", "text": f"This city is filed under {slug_to_title(region)} → {d.get('country','International')} → {name}.", "links": [
                    {"href": f"/destinations/{region}/index.html", "label": f"{slug_to_title(region)} destinations"},
                    {"href": f"/destinations/{region}/{country_slug}/index.html", "label": f"{d.get('country','International')} destinations"},
                ]},
            ]
            cards = [
                {"title": "Continent to city navigation", "text": "You can now browse from continent to country to city instead of seeing only a flat city list."},
                {"title": "Airport-aware planning", "text": "Premium arrival quality depends on airport flow, transfer logic, and route timing."},
                {"title": "Quote-ready structure", "text": "Every destination guide leads naturally into route research and the quote request form."},
            ]
            ctx = self.ctx(
                f"Business Class Flights to {name} | {self.config['site_name']}",
                f"Explore premium flights to {name}, with better route context, airport guidance, and a cleaner luxury booking path.",
                f"destinations/{slug}.html",
                f"Flights to {name}",
                d.get("luxury_summary",""),
                d.get("featured_image", self.config["default_image"]),
                sections,
                related,
                page_type="destination",
                kicker="Destination",
                highlight_cards=cards,
                sidebar_title="Browse destination structure",
                sidebar_text="Move between continent, country, city, routes, and request flow without dead ends."
            )
            write_page(self.output_root, f"destinations/{slug}.html", ctx)
            # hierarchical city path too
            write_page(self.output_root, f"destinations/{region}/{country_slug}/{slug}/index.html", ctx)
            items.append({"slug": slug, "name": name, "img": d.get("featured_image", self.config["default_image"]), "desc": d.get("luxury_summary","")[:150]})
        self.build_destination_hierarchy()

    def build_routes(self):
        items = []
        for r in self.routes:
            slug = r["route_slug"]
            origin = r["origin_city_slug"].replace("-", " ").title()
            dest = r["destination_city_slug"].replace("-", " ").title()
            cabin = r.get("primary_cabin","Business Class")
            related = [
                {"href": f"/airports/{r['origin_airport_slug']}.html", "label": f"{r['origin_airport_slug'].upper()} airport"},
                {"href": f"/airports/{r['destination_airport_slug']}.html", "label": f"{r['destination_airport_slug'].upper()} airport"},
                {"href": f"/destinations/{r['destination_city_slug']}.html", "label": f"{dest} destination guide"},
            ]
            sections = [
                {"title": "Route overview", "text": r.get("route_summary",""), "links": []},
                {"title": "Airport and airline logic", "text": "Use airport pages and airline pages to judge lounge quality, departure timing, and the total premium feel.", "links": related},
            ]
            cards = [
                {"title": "Better cabin fit", "text": "Longer routes reward stronger privacy and sleep support."},
                {"title": "Airport quality", "text": "Premium airport flow changes the full journey."},
                {"title": "Request-ready route", "text": "Once the route looks right, move directly into the quote form."},
            ]
            write_page(self.output_root, f"routes/{slug}.html", self.ctx(
                f"{origin} to {dest} {cabin} | {self.config['site_name']}",
                f"Explore premium flights from {origin} to {dest}, with airport, route, and cabin context built for luxury travel.",
                f"routes/{slug}.html",
                f"{origin} to {dest} {cabin}",
                r.get("route_summary",""),
                r.get("featured_image", self.config["default_image"]),
                sections, related, page_type="route", kicker="Route guide", highlight_cards=cards
            ))
            items.append({"slug": slug, "name": f"{origin} → {dest}", "img": r.get("featured_image", self.config["default_image"]), "desc": r.get("route_summary","")[:150]})
        self.build_index("routes", items, "Premium Route Guides", "Explore premium route guides with stronger airport, timing, and cabin context.")

    def build_airports(self):
        items = []
        for a in self.airports:
            slug, code, name = a["slug"], a["code_iata"], a["name"]
            route_links = [{"href": f"/routes/{r}.html", "label": slug_to_title(r)} for r in a.get("related_route_slugs", [])[:8]]
            airline_links = [{"href": f"/airlines/{x}.html", "label": slug_to_title(x)} for x in a.get("related_airline_slugs", [])[:6]]
            sections = [
                {"title": f"{name} overview", "text": a.get("premium_summary", ""), "links": []},
                {"title": "Major hubs and routes", "text": "Use these route and airline pages to understand which premium options actually move through this airport.", "links": route_links + airline_links},
            ]
            related = route_links[:6] + airline_links[:6]
            write_page(self.output_root, f"airports/{slug}.html", self.ctx(
                f"{code} Airport Guide | {self.config['site_name']}",
                f"Explore {name}, including premium routes, major hubs, and airport planning guidance for luxury travel.",
                f"airports/{slug}.html",
                f"{name} Airport Guide",
                a.get("premium_summary",""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airport"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary","")[:150]})
        self.build_index("airports", items, "Major Hubs and Premium Airports", "Explore airports, major hubs, and the airlines and routes that matter for premium travel.")

    def build_airlines(self):
        items = []
        for a in self.airlines:
            slug, name = a["airline_slug"], a["airline_name"]
            related = [{"href": f"/aircraft/{x}.html", "label": slug_to_title(x)} for x in a.get("related_aircraft_slugs", [])]
            sections = [{"title": "Airline overview", "text": a.get("premium_summary",""), "links": related}]
            write_page(self.output_root, f"airlines/{slug}.html", self.ctx(
                f"{name} Review | {self.config['site_name']}",
                f"Explore {name}, including route fit, aircraft context, and premium planning guidance.",
                f"airlines/{slug}.html",
                name,
                a.get("premium_summary",""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airline"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary","")[:150]})
        self.build_index("airlines", items, "Airlines", "Browse premium airlines, their route fit, and aircraft context.")

    def build_aircraft(self):
        items = []
        for a in self.aircraft:
            slug, name = a["aircraft_slug"], a["model_name"]
            related = [{"href": f"/airlines/{x}.html", "label": self.airline_map.get(x,{}).get("airline_name", slug_to_title(x))} for x in a.get("related_airline_slugs", [])]
            sections = [{"title": "Aircraft overview", "text": a.get("premium_summary",""), "links": related}]
            write_page(self.output_root, f"aircraft/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Explore {name}, airline usage, and premium cabin planning context.",
                f"aircraft/{slug}.html",
                name,
                a.get("premium_summary",""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Aircraft"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary","")[:150]})
        self.build_index("aircraft", items, "Aircraft", "Browse aircraft used on premium routes.")

    def build_lounges(self):
        items = []
        for l in self.lounges:
            slug, name = l["lounge_slug"], l["lounge_name"]
            related = [{"href": f"/airports/{l['airport_slug']}.html", "label": f"{l['airport_slug'].upper()} airport"}]
            sections = [{"title": "Lounge overview", "text": l.get("customer_summary",""), "links": related}]
            write_page(self.output_root, f"lounges/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Explore {name}, access context, and airport planning guidance.",
                f"lounges/{slug}.html",
                name,
                l.get("customer_summary",""),
                l.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Lounge"
            ))
            items.append({"slug": slug, "name": name, "img": l.get("featured_image", self.config["default_image"]), "desc": l.get("customer_summary","")[:150]})
        self.build_index("lounges", items, "Lounges", "Browse airport lounges with premium context.")

    def build_flights(self):
        items = []
        for f in self.flights:
            slug, number = f["flight_slug"], f["flight_number"]
            related = [{"href": f"/airports/{f['origin_airport_slug']}.html", "label": f"{f['origin_airport_slug'].upper()} airport"}, {"href": f"/airports/{f['destination_airport_slug']}.html", "label": f"{f['destination_airport_slug'].upper()} airport"}]
            sections = [{"title": "Flight overview", "text": f.get("flight_summary",""), "links": related}]
            write_page(self.output_root, f"flight/{slug}.html", self.ctx(
                f"{number} Flight Guide | {self.config['site_name']}",
                f"Explore {number}, route context, and premium planning guidance.",
                f"flight/{slug}.html",
                number,
                f.get("flight_summary",""),
                f.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Flight"
            ))
            items.append({"slug": slug, "name": number, "img": f.get("featured_image", self.config["default_image"]), "desc": f.get("flight_summary","")[:150]})
        self.build_index("flight", items, "Flights", "Browse flight number guides.")

    def build_500k_seed_files(self):
        seeds = load_json(self.data_root / "global_city_pair_guides.json")
        variants = load_json(self.data_root / "global_keyword_variants.json")
        matrix = []
        for row in seeds[:1000]:
            for variant in row.get("page_variants", [])[:5]:
                matrix.append({"path": f"/routes/{variant}.html", "type": "route-seed"})
        out = self.output_root / "seo-engine"
        ensure_dir(out)
        (out / "page-seed-matrix.json").write_text(json.dumps({"seed_count": len(matrix), "samples": matrix[:500]}, indent=2), encoding="utf-8")

    def build_sitemaps(self):
        all_pages = sorted([p.relative_to(self.output_root).as_posix() for p in self.output_root.rglob("*.html")])
        sitemap_dir = self.output_root / "sitemaps"
        ensure_dir(sitemap_dir)
        names = []
        for idx, chunk in enumerate(chunked(all_pages, 50000), start=1):
            name = f"sitemap-{idx}.xml"
            path = sitemap_dir / name
            lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
            for rel in chunk:
                lines.append("  <url>")
                lines.append(f"    <loc>{canonical(self.config['site_url'], rel)}</loc>")
                lines.append("  </url>")
            lines.append("</urlset>")
            path.write_text("\n".join(lines), encoding="utf-8")
            names.append(name)
        index_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for name in names:
            index_lines.append("  <sitemap>")
            index_lines.append(f"    <loc>{canonical(self.config['site_url'], 'sitemaps/' + name)}</loc>")
            index_lines.append("  </sitemap>")
        index_lines.append("</sitemapindex>")
        (self.output_root / "sitemap.xml").write_text("\n".join(index_lines), encoding="utf-8")

    def build(self):
        self.copy_static_site()
        self.build_airports()
        self.build_routes()
        self.build_lounges()
        self.build_airlines()
        self.build_aircraft()
        self.build_destinations()
        self.build_flights()
        self.build_500k_seed_files()
        self.build_sitemaps()
