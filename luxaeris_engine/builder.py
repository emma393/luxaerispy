
from __future__ import annotations
import json, shutil
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

    def ctx(self, title, description, rel_path, h1, intro, sections, related_links):
        return {
            "title": title,
            "description": description,
            "canonical_url": canonical(self.config["site_url"], rel_path),
            "og_image": canonical(self.config["site_url"], self.config["default_image"]),
            "h1": h1,
            "intro": intro,
            "sections": sections,
            "related_links": related_links,
            "image_url": self.config["default_image"],
            "request_quote_url": self.config["request_quote_url"],
            "site_name": self.config["site_name"],
            "brand_tagline": self.config["brand_tagline"],
            "schema": json.dumps({"@context":"https://schema.org","@type":"TravelAgency","name":self.config["site_name"],"url":self.config["site_url"],"description":"Luxury business class and first class travel booking platform.","areaServed":"Worldwide"})
        }

    def build_index(self, rel_dir, items, title, description):
        links = [{"href": f"/{rel_dir}/{i['slug']}.html", "label": i['name']} for i in items]
        write_page(self.output_root, f"{rel_dir}/index.html", self.ctx(f"{title} | {self.config['site_name']}", description, f"{rel_dir}/index.html", title, description, [{"title": title, "text": description, "links": links[:500]}], links[:30]))

    def build_airports(self):
        items = []
        for a in self.airports:
            slug, code, name = a["slug"], a["code_iata"], a["name"]
            summary = a["premium_summary"]
            route_links = [{"href": f"/routes/{r}.html", "label": slug_to_title(r)} for r in a.get("related_route_slugs", [])]
            write_page(self.output_root, f"airports/{slug}.html", self.ctx(
                f"{code} Airport Lounge and Premium Travel Guide | {self.config['site_name']}",
                f"Premium travel guide to {name}. Discover lounges, airlines, airport flow, and premium route context with LuxAeris.",
                f"airports/{slug}.html",
                f"{name} Airport Guide",
                summary,
                [{"title": f"{name} overview", "text": summary, "links": []},
                 {"title": "Why this airport matters", "text": "Airport flow, lounge access, and route quality can shape a premium trip as much as the seat itself.", "links": []},
                 {"title": "Related premium routes", "text": "These route guides help visitors move from airport research into route research and a quote request.", "links": route_links}],
                route_links
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("airports", items, "Premium Airport Guides", "Explore premium airport guides, lounges, routes, and travel planning context for business class and first class itineraries.")

    def build_routes(self):
        items = []
        for r in self.routes:
            slug = r["route_slug"]
            origin = r["origin_city_slug"].replace("-", " ").title()
            dest = r["destination_city_slug"].replace("-", " ").title()
            cabin = r["primary_cabin"]
            summary = r["route_summary"]
            related = [{"href": f"/airports/{r['origin_airport_slug']}.html", "label": f"{r['origin_airport_slug'].upper()} airport"},
                       {"href": f"/airports/{r['destination_airport_slug']}.html", "label": f"{r['destination_airport_slug'].upper()} airport"}]
            name = f"{origin} to {dest} {cabin}"
            write_page(self.output_root, f"routes/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Compare {cabin.lower()} flights from {origin} to {dest}. Explore premium airlines, airport flow, and request a tailored fare quote.",
                f"routes/{slug}.html",
                name,
                summary,
                [{"title": "Route overview", "text": summary, "links": []},
                 {"title": "What matters on this route", "text": "The best premium result comes from comparing aircraft, airport flow, overnight timing, and total rest quality together.", "links": []}],
                related
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("routes", items, "Premium Flight Route Guides", "Explore business class and first class route guides with clearer airport, schedule, and premium-cabin context.")

    def build_lounges(self):
        items = []
        for l in self.lounges:
            slug, name, airport_slug = l["lounge_slug"], l["lounge_name"], l["airport_slug"]
            summary = l["customer_summary"]
            related = [{"href": f"/airports/{airport_slug}.html", "label": f"{airport_slug.upper()} airport guide"}]
            feats = [{"href": "#", "label": f} for f in l.get("features", [])]
            write_page(self.output_root, f"lounges/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Guide to {name}. Explore terminal location, access context, and premium travel detail with LuxAeris.",
                f"lounges/{slug}.html",
                name,
                summary,
                [{"title": "Lounge overview", "text": summary, "links": []},
                 {"title": "Useful lounge features", "text": "The most valuable premium lounges usually improve the pre-flight experience through better comfort, food, and practical amenities.", "links": feats}],
                related
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("lounges", items, "Premium Lounge Guides", "Explore airport lounge guides with practical premium-travel context, lounge features, and related airport research.")

    def build_airlines(self):
        items = []
        for a in self.airlines:
            slug, name = a["airline_slug"], a["airline_name"]
            summary = a["premium_summary"]
            related = [{"href": f"/aircraft/{x}.html", "label": slug_to_title(x)} for x in a.get("related_aircraft_slugs", [])]
            write_page(self.output_root, f"airlines/{slug}.html", self.ctx(
                f"{name} Review | {self.config['site_name']}",
                f"Compare {name.lower()}, route fit, aircraft, and premium travel context before requesting a tailored fare quote.",
                f"airlines/{slug}.html",
                name,
                summary,
                [{"title": "Airline cabin overview", "text": summary, "links": []},
                 {"title": "Related aircraft", "text": "Aircraft type influences privacy, seat layout, and the overall premium feel of the journey.", "links": related}],
                related
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("airlines", items, "Premium Airline Cabin Guides", "Compare premium airlines, cabin positioning, aircraft context, and better route fit for luxury travel.")

    def build_aircraft(self):
        items = []
        for a in self.aircraft:
            slug, name = a["aircraft_slug"], a["model_name"]
            summary = a["premium_summary"]
            related = [{"href": f"/airlines/{x}.html", "label": self.airline_map.get(x, {}).get("airline_name", slug_to_title(x))} for x in a.get("related_airline_slugs", [])]
            write_page(self.output_root, f"aircraft/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Explore {name.lower()} cabins, airline use, and premium travel context with LuxAeris.",
                f"aircraft/{slug}.html",
                name,
                summary,
                [{"title": "Aircraft overview", "text": summary, "links": []},
                 {"title": "Airlines using this aircraft style", "text": "Different airlines configure the same aircraft very differently, which is why aircraft and airline should be judged together.", "links": related}],
                related
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("aircraft", items, "Premium Aircraft Guides", "Explore aircraft pages for premium cabins, seat context, airline use, and better long-haul booking decisions.")

    def build_destinations(self):
        items = []
        for d in self.destinations:
            slug, name = d["destination_slug"], d["display_name"]
            summary = d["luxury_summary"]
            related = [{"href": f"/routes/{x}.html", "label": slug_to_title(x)} for x in d.get("route_slugs", [])]
            write_page(self.output_root, f"destinations/{slug}.html", self.ctx(
                f"Business Class Flights to {name} | {self.config['site_name']}",
                f"Compare luxury business class and first class flights to {name}. Explore premium routes and request a tailored fare quote with LuxAeris.",
                f"destinations/{slug}.html",
                f"Flights to {name}",
                summary,
                [{"title": "Destination overview", "text": summary, "links": []},
                 {"title": "Relevant premium routes", "text": "These routes support destination-led planning by linking the place itself with premium flight options.", "links": related}],
                related
            ))
            items.append({"slug": slug, "name": name})
        self.build_index("destinations", items, "Luxury Flight Destinations", "Explore luxury flight destinations worldwide, compare premium route options, and move into a tailored quote request.")

    def build_flights(self):
        items = []
        for f in self.flights:
            slug, number = f["flight_slug"], f["flight_number"]
            summary = f["flight_summary"]
            related = [{"href": f"/airports/{f['origin_airport_slug']}.html", "label": f"{f['origin_airport_slug'].upper()} airport"},
                       {"href": f"/airports/{f['destination_airport_slug']}.html", "label": f"{f['destination_airport_slug'].upper()} airport"}]
            write_page(self.output_root, f"flight/{slug}.html", self.ctx(
                f"{number} Flight Guide | {self.config['site_name']}",
                f"Explore {number} route context, airport fit, and premium travel planning insight with LuxAeris.",
                f"flight/{slug}.html",
                number,
                summary,
                [{"title": "Flight overview", "text": summary, "links": []},
                 {"title": "Route context", "text": "Flight-number pages help connect a specific premium flight with its route, airport flow, and airline context.", "links": related}],
                related
            ))
            items.append({"slug": slug, "name": number})
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
