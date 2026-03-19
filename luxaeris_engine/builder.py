
from __future__ import annotations
import json
import shutil
from pathlib import Path
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
        html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="content-language" content="en"><meta name="language" content="English"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title} | {self.config["site_name"]}</title><meta name="description" content="{description}"><meta name="robots" content="index, follow"><link rel="canonical" href="{canonical(self.config["site_url"], rel_dir + "/index.html")}"><link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/site.js"></script></head>
<body><header class="site-header"><div class="container nav"><a class="logo-wrap" href="/index.html"><img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo"><div><div class="brand-name">{self.config["site_name"]}</div><div class="brand-tag">{self.config["brand_tagline"]}</div></div></a></div></header>
<section class="section"><div class="container"><p class="kicker">Explore</p><h1 class="section-title">{title}</h1><p class="section-intro">{description}</p><div class="index-visual-grid">{cards}</div></div></section></body></html>'''
        p = self.output_root / rel_dir / "index.html"
        ensure_dir(p.parent)
        p.write_text(html, encoding="utf-8")

    def build_destinations(self):
        items = []
        for d in self.destinations:
            slug, name = d["destination_slug"], d["display_name"]
            related = [{"href": f"/routes/{x}.html", "label": slug_to_title(x)} for x in d.get("route_slugs", [])[:12]]
            sections = [
                {"title": f"Why {name} works for premium travel", "text": d.get("luxury_summary", ""), "links": []},
                {"title": "Best routes to consider", "text": "These route guides connect the destination with practical premium options and stronger airport context.", "links": related},
                {"title": "Airport and arrival experience", "text": f"{name} is best judged through route timing, airport flow, and whether the arrival experience matches the purpose of the trip.", "links": []},
            ]
            cards = [
                {"title": "Best routes", "text": "Start with high-quality route options rather than random public fare searches."},
                {"title": "Airport experience", "text": "Airport flow, lounge access, and arrival practicality can change the trip completely."},
                {"title": "Cabin fit", "text": "Choose the cabin based on route length, sleep value, and the total premium experience."},
            ]
            write_page(self.output_root, f"destinations/{slug}.html", self.ctx(
                f"Business Class Flights to {name} | {self.config['site_name']}",
                f"Compare luxury business class and first class flights to {name}. Explore premium routes and request a tailored fare quote with LuxAeris.",
                f"destinations/{slug}.html",
                f"Flights to {name}",
                d.get("luxury_summary", ""),
                d.get("featured_image", self.config["default_image"]),
                sections,
                related,
                page_type="destination",
                kicker="Destination",
                highlight_cards=cards,
                sidebar_title="Continue planning",
                sidebar_text="Open related route pages and move into a premium quote request when the route, airport, and cabin fit your trip."
            ))
            items.append({"slug": slug, "name": name, "img": d.get("featured_image", self.config["default_image"]), "desc": d.get("luxury_summary", "")[:150]})
        self.build_index("destinations", items, "Luxury Flight Destinations", "Explore luxury destinations with better route context, airport logic, and premium cabin guidance.")

    def build_routes(self):
        items = []
        for r in self.routes:
            slug = r["route_slug"]
            origin = r["origin_city_slug"].replace("-", " ").title()
            dest = r["destination_city_slug"].replace("-", " ").title()
            cabin = r.get("primary_cabin", "Business Class")
            related = [
                {"href": f"/airports/{r['origin_airport_slug']}.html", "label": f"{r['origin_airport_slug'].upper()} airport"},
                {"href": f"/airports/{r['destination_airport_slug']}.html", "label": f"{r['destination_airport_slug'].upper()} airport"},
                {"href": f"/destinations/{r['destination_city_slug']}.html", "label": f"{dest} destination guide"},
            ]
            sections = [
                {"title": "Route overview", "text": r.get("route_summary", ""), "links": []},
                {"title": "Airport and timing logic", "text": "A premium route should be judged through airport flow, timing, and whether the cabin matches the length and purpose of the journey.", "links": related},
                {"title": "What to compare before requesting a quote", "text": "Compare airline quality, cabin privacy, departure time, and arrival practicality before choosing the route structure.", "links": []},
            ]
            cards = [
                {"title": "Best airlines", "text": "Compare the route first, then the airline. The best airline on paper is not always best on this specific route."},
                {"title": "Cabin comfort", "text": "Longer routes reward better privacy, stronger sleep support, and smoother airport transitions."},
                {"title": "Ground experience", "text": "Departure airport quality and lounge access shape the total premium feel."},
            ]
            write_page(self.output_root, f"routes/{slug}.html", self.ctx(
                f"{origin} to {dest} {cabin} | {self.config['site_name']}",
                f"Compare {cabin.lower()} flights from {origin} to {dest}. Explore premium airlines, airport flow, and request a tailored fare quote.",
                f"routes/{slug}.html",
                f"{origin} to {dest} {cabin}",
                r.get("route_summary", ""),
                r.get("featured_image", self.config["default_image"]),
                sections,
                related,
                page_type="route",
                kicker="Route guide",
                highlight_cards=cards,
                sidebar_title="Related planning pages",
                sidebar_text="Use airport and destination pages to judge the total journey, not just the route name."
            ))
            items.append({"slug": slug, "name": f"{origin} → {dest}", "img": r.get("featured_image", self.config["default_image"]), "desc": r.get("route_summary", "")[:150]})
        self.build_index("routes", items, "Premium Route Guides", "Explore premium route guides with stronger airport, timing, and cabin context.")

    def build_airports(self):
        items = []
        for a in self.airports:
            slug, code, name = a["slug"], a["code_iata"], a["name"]
            route_links = [{"href": f"/routes/{r}.html", "label": slug_to_title(r)} for r in a.get("related_route_slugs", [])[:12]]
            airline_links = [{"href": f"/airlines/{x}.html", "label": slug_to_title(x)} for x in a.get("related_airline_slugs", [])[:8]]
            sections = [
                {"title": f"{name} overview", "text": a.get("premium_summary", ""), "links": []},
                {"title": "Related premium routes", "text": "These route guides help visitors move from airport research into route research and a quote request.", "links": route_links},
                {"title": "Related airlines", "text": "These airline guides are commonly relevant for travelers comparing premium options through this airport.", "links": airline_links},
            ]
            related = route_links[:8] + airline_links[:8]
            write_page(self.output_root, f"airports/{slug}.html", self.ctx(
                f"{code} Airport Lounge and Premium Travel Guide | {self.config['site_name']}",
                f"Premium travel guide to {name}. Discover lounges, airlines, airport flow, and premium route context with LuxAeris.",
                f"airports/{slug}.html",
                f"{name} Airport Guide",
                a.get("premium_summary", ""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airport"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary", "")[:150]})
        self.build_index("airports", items, "Premium Airport Guides", "Explore premium airport guides, lounges, routes, and travel planning context.")

    def build_lounges(self):
        items = []
        for l in self.lounges:
            slug, name, airport_slug = l["lounge_slug"], l["lounge_name"], l["airport_slug"]
            related = [{"href": f"/airports/{airport_slug}.html", "label": f"{airport_slug.upper()} airport guide"}]
            feats = [{"href": "#", "label": f} for f in l.get("features", [])]
            sections = [
                {"title": "Lounge overview", "text": l.get("customer_summary", ""), "links": []},
                {"title": "Useful lounge features", "text": "The most valuable premium lounges usually improve the pre-flight experience through better comfort, food, and practical amenities.", "links": feats},
                {"title": "Airport context", "text": "Open the airport guide to compare this lounge with broader airport flow and route context.", "links": related}
            ]
            write_page(self.output_root, f"lounges/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Guide to {name}. Explore terminal location, access context, and premium travel detail with LuxAeris.",
                f"lounges/{slug}.html",
                name,
                l.get("customer_summary", ""),
                l.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Lounge"
            ))
            items.append({"slug": slug, "name": name, "img": l.get("featured_image", self.config["default_image"]), "desc": l.get("customer_summary", "")[:150]})
        self.build_index("lounges", items, "Premium Lounge Guides", "Explore airport lounge guides with practical premium-travel context.")

    def build_airlines(self):
        items = []
        for a in self.airlines:
            slug, name = a["airline_slug"], a["airline_name"]
            related = [{"href": f"/aircraft/{x}.html", "label": slug_to_title(x)} for x in a.get("related_aircraft_slugs", [])]
            sections = [
                {"title": "Airline cabin overview", "text": a.get("premium_summary", ""), "links": []},
                {"title": "Related aircraft", "text": "Aircraft type influences privacy, seat layout, and the overall premium feel of the journey.", "links": related},
            ]
            write_page(self.output_root, f"airlines/{slug}.html", self.ctx(
                f"{name} Review | {self.config['site_name']}",
                f"Compare {name.lower()}, route fit, aircraft, and premium travel context before requesting a tailored fare quote.",
                f"airlines/{slug}.html",
                name,
                a.get("premium_summary", ""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airline"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary", "")[:150]})
        self.build_index("airlines", items, "Premium Airline Cabin Guides", "Compare premium airlines, cabin positioning, aircraft context, and better route fit.")

    def build_aircraft(self):
        items = []
        for a in self.aircraft:
            slug, name = a["aircraft_slug"], a["model_name"]
            related = [{"href": f"/airlines/{x}.html", "label": self.airline_map.get(x, {}).get("airline_name", slug_to_title(x))} for x in a.get("related_airline_slugs", [])]
            sections = [
                {"title": "Aircraft overview", "text": a.get("premium_summary", ""), "links": []},
                {"title": "Airlines using this aircraft style", "text": "Different airlines configure the same aircraft very differently, which is why aircraft and airline should be judged together.", "links": related}
            ]
            write_page(self.output_root, f"aircraft/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Explore {name.lower()} cabins, airline use, and premium travel context with LuxAeris.",
                f"aircraft/{slug}.html",
                name,
                a.get("premium_summary", ""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Aircraft"
            ))
            items.append({"slug": slug, "name": name, "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary", "")[:150]})
        self.build_index("aircraft", items, "Premium Aircraft Guides", "Explore aircraft pages for premium cabins, seat context, airline use, and better long-haul decisions.")

    def build_flights(self):
        items = []
        for f in self.flights:
            slug, number = f["flight_slug"], f["flight_number"]
            related = [
                {"href": f"/airports/{f['origin_airport_slug']}.html", "label": f"{f['origin_airport_slug'].upper()} airport"},
                {"href": f"/airports/{f['destination_airport_slug']}.html", "label": f"{f['destination_airport_slug'].upper()} airport"},
            ]
            sections = [
                {"title": "Flight overview", "text": f.get("flight_summary", ""), "links": []},
                {"title": "Route context", "text": "Flight-number pages help connect a specific premium flight with its route, airport quality, and broader planning context.", "links": related}
            ]
            write_page(self.output_root, f"flight/{slug}.html", self.ctx(
                f"{number} Flight Guide | {self.config['site_name']}",
                f"Explore {number} route context, airport fit, and premium travel planning insight with LuxAeris.",
                f"flight/{slug}.html",
                number,
                f.get("flight_summary", ""),
                f.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Flight"
            ))
            items.append({"slug": slug, "name": number, "img": f.get("featured_image", self.config["default_image"]), "desc": f.get("flight_summary", "")[:150]})
        self.build_index("flight", items, "Flight Number Guides", "Explore flight-number pages with route context, airport links, and better premium travel research paths.")

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
        self.build_sitemaps()
