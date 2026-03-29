from __future__ import annotations
import json, shutil
from pathlib import Path
from collections import defaultdict
from .utils import load_json, slug_to_title, ensure_dir, canonical, chunked
from .page_writer import write_page

BAD_HERO_IMAGES = {
    "/assets/images/real/business-class.jpg",
    "/assets/images/real/first-class.jpg",
    "/assets/images/real/premium-economy.jpg",
}

def slug_country(value: str) -> str:
    return value.lower().replace(" ", "-").replace("&", "and").replace("'", "")

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
        self.dest_map = {d.get("destination_slug", ""): d for d in self.destinations}
        self.airport_map = {a.get("slug", ""): a for a in self.airports}

    def copy_static_site(self):
        if self.output_root.exists():
            shutil.rmtree(self.output_root)
        shutil.copytree(self.static_root, self.output_root)

    def asset_exists(self, rel_asset: str) -> bool:
        return (self.static_root / rel_asset.lstrip("/")).exists()

    def safe_destination_image(self, destination_slug: str, fallback: str | None = None) -> str:
        fallback = fallback or self.config["default_image"]
        options = [
            f"/assets/images/cities/{destination_slug}.webp",
            f"/assets/images/cities/{destination_slug}.jpg",
            f"/assets/generated_png/dest-{destination_slug}.png",
            self.dest_map.get(destination_slug, {}).get("featured_image", ""),
            fallback,
            self.config["default_image"],
        ]
        for candidate in options:
            if not candidate or candidate in BAD_HERO_IMAGES:
                continue
            if candidate.startswith("/assets/") and not self.asset_exists(candidate):
                continue
            return candidate
        return self.config["default_image"]

    def safe_route_image(self, route: dict) -> str:
        candidate = route.get("featured_image") or ""
        if (
            not candidate
            or candidate in BAD_HERO_IMAGES
            or "business-class" in candidate
            or "first-class" in candidate
            or "premium-economy" in candidate
        ):
            return self.safe_destination_image(route.get("destination_city_slug", ""), self.config["default_image"])
        if candidate.startswith("/assets/") and not self.asset_exists(candidate):
            return self.safe_destination_image(route.get("destination_city_slug", ""), self.config["default_image"])
        return candidate

    def route_title_parts(self, route: dict):
        origin_airport = self.airport_map.get(route.get("origin_airport_slug", ""), {})
        dest_airport = self.airport_map.get(route.get("destination_airport_slug", ""), {})
        origin_city = origin_airport.get("city_name", slug_to_title(route.get("origin_city_slug", "origin")))
        dest_city = dest_airport.get("city_name", slug_to_title(route.get("destination_city_slug", "destination")))
        origin_code = origin_airport.get("code_iata", route.get("origin_airport_slug", "").upper())
        dest_code = dest_airport.get("code_iata", route.get("destination_airport_slug", "").upper())
        return origin_city, dest_city, origin_code, dest_code

    def is_us_route(self, route: dict) -> bool:
        origin = self.airport_map.get(route.get("origin_airport_slug", ""), {})
        dest = self.airport_map.get(route.get("destination_airport_slug", ""), {})
        return origin.get("country_name") == "United States" or dest.get("country_name") == "United States"

    def prioritized_related_routes(self, route: dict, limit: int = 10) -> list[dict]:
        same_dest, same_origin, reverse, us_routes = [], [], [], []
        target_slug = route.get("route_slug")
        for other in self.routes:
            if other.get("route_slug") == target_slug:
                continue
            if other.get("destination_airport_slug") == route.get("destination_airport_slug"):
                same_dest.append(other)
            if other.get("origin_airport_slug") == route.get("origin_airport_slug"):
                same_origin.append(other)
            if other.get("origin_airport_slug") == route.get("destination_airport_slug") and other.get("destination_airport_slug") == route.get("origin_airport_slug"):
                reverse.append(other)
            if self.is_us_route(other):
                us_routes.append(other)
        ordered = reverse + same_dest + same_origin + us_routes
        seen, out = set(), []
        for other in ordered:
            slug = other.get("route_slug")
            if not slug or slug in seen:
                continue
            seen.add(slug)
            _, _, ocode, dcode = self.route_title_parts(other)
            out.append({"href": f"/routes/{slug}.html", "label": f"{ocode} to {dcode} business class"})
            if len(out) >= limit:
                break
        return out

    def ctx(self, title, description, rel_path, h1, intro, image_url, sections, related_links,
            page_type="generic", kicker="Guide", highlight_cards=None,
            sidebar_title="Next useful pages", sidebar_text="Use these related pages to continue your premium travel research."):
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
            f'<a class="visual-card" href="/{rel_dir}/{i["slug"]}.html"><img src="{i["img"]}" alt="{i["name"]}" loading="lazy"><div class="visual-card-body"><h3>{i["name"]}</h3><p>{i["desc"]}</p></div></a>'
            for i in items[:300]
        ])
        img = items[0]["img"] if items else self.config["default_image"]
        page_url = canonical(self.config["site_url"], rel_dir + "/index.html")
        html = f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta http-equiv="content-language" content="en"><meta name="language" content="English">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | {self.config["site_name"]}</title>
<meta name="description" content="{description}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{page_url}">
<meta property="og:title" content="{title} | {self.config["site_name"]}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:url" content="{page_url}">
<meta property="og:image" content="{canonical(self.config["site_url"], img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title} | {self.config["site_name"]}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{canonical(self.config["site_url"], img)}">
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg">
<link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/site.js"></script></head>
<body>
<div class="topbar"><div class="container topbar-inner"><span>No booking fees on tailored requests</span><span>Business Class • First Class • Premium Economy</span></div></div>
<header class="site-header"><div class="container nav"><a class="logo-wrap" href="/index.html"><img class="logo-img" src="/assets/images/logo-header.png" alt="LuxAeris shield logo"><div><div class="brand-name">{self.config["site_name"]}</div><div class="brand-tag">{self.config["brand_tagline"]}</div></div></a><nav class="nav-links"><a href="/index.html">Home</a><a href="/destinations/index.html">Destinations</a><a href="/airlines/index.html">Airlines</a><a href="/airports/index.html">Airports</a><a href="/routes/index.html">Routes</a><a href="/cabins/index.html">Cabins</a><a href="/search.html">Search</a><a class="btn btn-primary" href="/request.html">Request Quote</a></nav></div></header>
<a class="btn btn-primary floating-request" href="/request.html">Request Quote</a>
<section class="section" style="padding-top:120px"><div class="container"><p class="kicker">Explore</p><h1 class="section-title">{title}</h1><p class="section-intro">{description}</p><div class="index-visual-grid">{cards}</div></div></section>
</body></html>'''
        p = self.output_root / rel_dir / "index.html"
        ensure_dir(p.parent)
        p.write_text(html, encoding="utf-8")

    def build_destination_hierarchy(self):
        regions = defaultdict(list)
        for d in self.destinations:
            regions[d.get("region_cluster","global")].append(d)

        def region_image(region, items):
            if region == "asia":
                for d in items:
                    if d.get("destination_slug") == "tokyo":
                        return self.safe_destination_image("tokyo", d.get("featured_image", self.config["default_image"]))
            first = items[0] if items else {}
            return self.safe_destination_image(first.get("destination_slug", ""), first.get("featured_image", self.config["default_image"]))

        cards = []
        for region, items in sorted(regions.items()):
            cards.append({"slug": region, "name": slug_to_title(region), "img": region_image(region, items), "desc": f"Browse {len(items)} premium destinations in {slug_to_title(region)}."})
        self.build_index("destinations", cards, "Destinations by Continent", "Browse destinations by continent, then country, then city.")

        for region, items in regions.items():
            by_country = defaultdict(list)
            for d in items:
                by_country[d.get("country","International")].append(d)
            country_cards = []
            for country, arr in sorted(by_country.items()):
                cslug = slug_country(country)
                img = region_image(region, arr)
                country_cards.append({"slug": cslug, "name": country, "img": img, "desc": f"Browse {len(arr)} premium destinations in {country}."})
            self.build_index(f"destinations/{region}", country_cards, f"{slug_to_title(region)} Destinations", f"Explore premium destinations across {slug_to_title(region)} by country.")
            for country, arr in by_country.items():
                cslug = slug_country(country)
                city_cards = [{"slug": d["destination_slug"], "name": d["display_name"], "img": self.safe_destination_image(d["destination_slug"], d.get("featured_image", self.config["default_image"])), "desc": d.get("luxury_summary","")[:150]} for d in arr]
                self.build_index(f"destinations/{region}/{cslug}", city_cards, f"{country} Destinations", f"Explore premium destinations in {country} by city.")

    def build_destinations(self):
        for d in self.destinations:
            slug, name = d["destination_slug"], d["display_name"]
            region = d.get("region_cluster","global")
            cslug = slug_country(d.get("country","International"))
            related = [{"href": f"/routes/{x}.html", "label": slug_to_title(x)} for x in d.get("route_slugs", [])[:10]]
            sections = [
                {"title": f"Why {name} works for premium travel", "text": d.get("luxury_summary", ""), "links": []},
                {"title": "Useful route guides", "text": "Open route guides to compare airport quality, timing, and cabin choices.", "links": related},
                {"title": "Destination structure", "text": f"This city is filed under {slug_to_title(region)} → {d.get('country','International')} → {name}.", "links": [
                    {"href": f"/destinations/{region}/index.html", "label": f"{slug_to_title(region)} destinations"},
                    {"href": f"/destinations/{region}/{cslug}/index.html", "label": f"{d.get('country','International')} destinations"},
                ]},
            ]
            cards = [
                {"title": "Continent to city navigation", "text": "Browse from continent to country to city instead of a flat list."},
                {"title": "Airport-aware planning", "text": "Premium arrival quality depends on airport flow, transfer logic, and route timing."},
                {"title": "Quote-ready structure", "text": "Every destination guide leads naturally into route research and the quote request form."},
            ]
            ctx = self.ctx(
                f"Business Class Flights to {name} | {self.config['site_name']}",
                f"Explore premium flights to {name}, with route context, airport guidance, and a cleaner luxury booking path.",
                f"destinations/{slug}.html",
                f"Flights to {name}",
                d.get("luxury_summary",""),
                self.safe_destination_image(slug, d.get("featured_image", self.config["default_image"])),
                sections, related, page_type="destination", kicker="Destination", highlight_cards=cards,
                sidebar_title="Browse destination structure", sidebar_text="Move between continent, country, city, routes, and request flow."
            )
            write_page(self.output_root, f"destinations/{slug}.html", ctx)
            write_page(self.output_root, f"destinations/{region}/{cslug}/{slug}.html", ctx)
        self.build_destination_hierarchy()

    def build_airport_hierarchy(self):
        regions = defaultdict(list)
        for a in self.airports:
            regions[a.get("region_cluster","global")].append(a)
        cards = []
        for region, items in sorted(regions.items()):
            img = items[0].get("featured_image", self.config["default_image"])
            cards.append({"slug": region, "name": slug_to_title(region), "img": img, "desc": f"Browse airports in {slug_to_title(region)} by country."})
        self.build_index("airports", cards, "Airports by Continent", "Browse airports by continent, then country, then airport.")
        for region, items in regions.items():
            by_country = defaultdict(list)
            for a in items:
                by_country[a.get("country_name","International")].append(a)
            country_cards = []
            for country, arr in sorted(by_country.items()):
                cslug = slug_country(country)
                country_cards.append({"slug": cslug, "name": country, "img": arr[0].get("featured_image", self.config["default_image"]), "desc": f"Browse {len(arr)} airports in {country}."})
            self.build_index(f"airports/{region}", country_cards, f"{slug_to_title(region)} Airports", f"Browse airports in {slug_to_title(region)} by country.")
            for country, arr in by_country.items():
                cslug = slug_country(country)
                airport_cards = [{"slug": a["slug"], "name": a["name"], "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary","")[:150]} for a in arr]
                self.build_index(f"airports/{region}/{cslug}", airport_cards, f"{country} Airports", f"Browse airports in {country}.")

    def build_airports(self):
        for a in self.airports:
            slug, code, name = a["slug"], a["code_iata"], a["name"]
            region = a.get("region_cluster","global")
            cslug = slug_country(a.get("country_name","International"))
            route_links = [{"href": f"/routes/{r}.html", "label": slug_to_title(r)} for r in a.get("related_route_slugs", [])[:8]]
            airline_links = [{"href": f"/airlines/{x}.html", "label": slug_to_title(x)} for x in a.get("related_airline_slugs", [])[:6] if (self.output_root / f"airlines/{x}.html").exists()]
            sections = [
                {"title": f"{name} overview", "text": a.get("premium_summary",""), "links": []},
                {"title": "Major hubs and routes", "text": "Use these route and airline pages to understand which premium options move through this airport.", "links": route_links + airline_links},
            ]
            related = route_links[:6] + airline_links[:6]
            ctx = self.ctx(
                f"{code} Airport Guide | {self.config['site_name']}",
                f"Explore {name}, including premium routes, major hubs, and airport planning guidance for luxury travel.",
                f"airports/{slug}.html",
                f"{name} Airport Guide",
                a.get("premium_summary",""),
                a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airport"
            )
            write_page(self.output_root, f"airports/{slug}.html", ctx)
            write_page(self.output_root, f"airports/{region}/{cslug}/{slug}.html", ctx)
        self.build_airport_hierarchy()

    def build_route_city_hub(self, region: str, country_slug: str, city_slug: str, city_routes: list[dict]):
        dest = self.dest_map.get(city_slug, {})
        city_name = dest.get("display_name", slug_to_title(city_slug))
        featured = [r for r in city_routes if self.is_us_route(r)] or city_routes
        related = [{"href": f"/routes/{r['route_slug']}.html", "label": f"{self.route_title_parts(r)[2]} to {self.route_title_parts(r)[3]}"} for r in featured[:12]]
        sections = [
            {"title": f"Premium routes for {city_name}", "text": f"Use this hub to compare premium routes into {city_name}. U.S.-linked long-haul routes are shown first where available.", "links": related[:8]},
            {"title": "Continue by airport or destination", "text": "Open the destination guide or airport pages to compare timing, arrival flow, and airport quality.", "links": [
                {"href": f"/destinations/{city_slug}.html", "label": f"{city_name} destination guide"}
            ]},
        ]
        cards = [
            {"title": "U.S.-focused route cluster", "text": "Primary linking favors U.S.-touching premium routes before lower-value non-U.S. patterns."},
            {"title": "Route comparison", "text": "Compare multiple premium routes to the same city without leaving the destination cluster."},
            {"title": "Fewer dead ends", "text": "City hubs collect the route guides that would otherwise sit isolated deeper in the site."},
        ]
        ctx = self.ctx(
            f"{city_name} Route Guides | {self.config['site_name']}",
            f"Browse premium route guides for {city_name}, with U.S.-focused long-haul options shown first.",
            f"routes/{region}/{country_slug}/{city_slug}.html",
            f"{city_name} Route Guides",
            f"Open route guides for {city_name} and compare airport quality, cabin fit, and arrival logic.",
            self.safe_destination_image(city_slug, dest.get('featured_image', self.config['default_image'])),
            sections,
            related,
            page_type='route',
            kicker='Route hub',
            highlight_cards=cards,
            sidebar_title='Popular route guides for this city',
            sidebar_text='Use these route pages to compare the premium options that matter most for this destination.'
        )
        write_page(self.output_root, f"routes/{region}/{country_slug}/{city_slug}.html", ctx)

    def build_route_hierarchy(self):
        focus_routes = [r for r in self.routes if self.is_us_route(r)] or self.routes
        by_region = defaultdict(list)
        for r in focus_routes:
            d = self.dest_map.get(r.get("destination_city_slug"), {})
            by_region[d.get("region_cluster","global")].append(r)
        cards = []
        for region, items in sorted(by_region.items()):
            d = self.dest_map.get(items[0].get("destination_city_slug"), {}) if items else {}
            img = self.safe_destination_image(d.get("destination_slug", ""), d.get("featured_image", self.config["default_image"]))
            cards.append({"slug": region, "name": slug_to_title(region), "img": img, "desc": f"Browse mainly U.S.-linked premium routes into {slug_to_title(region)} by country and city."})
        self.build_index("routes", cards, "Routes by Continent", "Browse mainly U.S.-linked premium routes by continent, then country, then city.")
        for region, items in by_region.items():
            by_country = defaultdict(list)
            for r in items:
                d = self.dest_map.get(r.get("destination_city_slug"), {})
                by_country[d.get("country","International")].append(r)
            country_cards = []
            for country, arr in sorted(by_country.items()):
                cslug = slug_country(country)
                d = self.dest_map.get(arr[0].get("destination_city_slug"), {})
                country_cards.append({"slug": cslug, "name": country, "img": self.safe_destination_image(d.get("destination_slug", ""), d.get("featured_image", self.config["default_image"])), "desc": f"Browse mostly U.S.-focused route guides for {country}."})
            self.build_index(f"routes/{region}", country_cards, f"{slug_to_title(region)} Routes", f"Browse mostly U.S.-focused premium routes in {slug_to_title(region)} by country.")
            for country, arr in by_country.items():
                cslug = slug_country(country)
                by_city = defaultdict(list)
                for r in arr:
                    by_city[r.get("destination_city_slug","city")].append(r)
                city_cards = []
                for city_slug, rs in sorted(by_city.items()):
                    d = self.dest_map.get(city_slug,{})
                    city_cards.append({"slug": city_slug, "name": d.get("display_name", slug_to_title(city_slug)), "img": self.safe_destination_image(city_slug, d.get("featured_image", self.config["default_image"])), "desc": f"Open route guides for {d.get('display_name', slug_to_title(city_slug))}."})
                    self.build_route_city_hub(region, cslug, city_slug, rs)
                self.build_index(f"routes/{region}/{cslug}", city_cards, f"{country} Route Cities", f"Browse route cities in {country}.")

    def build_routes(self):
        for r in self.routes:
            slug = r["route_slug"]
            origin_city, dest_city, origin_code, dest_code = self.route_title_parts(r)
            cabin = r.get("primary_cabin","Business Class")
            d = self.dest_map.get(r.get("destination_city_slug"), {})
            region = d.get("region_cluster","global")
            cslug = slug_country(d.get("country","International"))
            city_slug = r.get("destination_city_slug","city")
            sidebar_links = [
                {"href": f"/airports/{r['origin_airport_slug']}.html", "label": f"{origin_code} airport guide"},
                {"href": f"/airports/{r['destination_airport_slug']}.html", "label": f"{dest_code} airport guide"},
                {"href": f"/destinations/{city_slug}.html", "label": f"{dest_city} destination guide"},
            ] + self.prioritized_related_routes(r, 7)
            sections = [
                {"title": "Route overview", "text": r.get("route_summary",""), "links": []},
                {"title": "Airport and airline logic", "text": f"Use airport pages and related route guides to judge lounge quality, departure timing, and the total premium feel between {origin_city} and {dest_city}.", "links": sidebar_links[:3]},
                {"title": "Related premium routes", "text": "These nearby route guides reinforce the strongest demand clusters and help you compare better premium options.", "links": self.prioritized_related_routes(r, 10)},
            ]
            cards = [
                {"title": "Better cabin fit", "text": "Longer routes reward stronger privacy, sleep support, and cleaner airport flow."},
                {"title": "Airport quality", "text": f"Evaluate {origin_code} and {dest_code} as part of the full premium journey, not just the seat."},
                {"title": "U.S.-focused route logic", "text": "LuxAeris prioritizes U.S.-linked long-haul patterns and surfaces them first in route hubs and related links."},
            ]
            ctx = self.ctx(
                f"{origin_code} to {dest_code} {cabin} | {self.config['site_name']}",
                f"Explore premium flights from {origin_city} ({origin_code}) to {dest_city} ({dest_code}), with airport, route, and cabin context built for luxury travel.",
                f"routes/{slug}.html",
                f"{origin_code} to {dest_code} {cabin}",
                r.get("route_summary",""),
                self.safe_route_image(r),
                sections, sidebar_links, page_type="route", kicker="Route guide", highlight_cards=cards,
                sidebar_title="Useful pages for this route", sidebar_text="Open airport, destination, and nearby route guides to compare premium options without leaving the route cluster."
            )
            write_page(self.output_root, f"routes/{slug}.html", ctx)
            write_page(self.output_root, f"routes/{region}/{cslug}/{city_slug}/{slug}.html", ctx)
        self.build_route_hierarchy()

    def build_airline_hierarchy(self):
        alliances = defaultdict(list)
        for a in self.airlines:
            alliances[a.get("alliance", "Independent")].append(a)
        cards = []
        for alliance, items in sorted(alliances.items()):
            aslug = slug_country(alliance)
            cards.append({"slug": aslug, "name": alliance, "img": items[0].get("featured_image", self.config["default_image"]), "desc": f"Browse {len(items)} premium airlines in {alliance}."})
        self.build_index("airlines", cards, "Airlines by Alliance", "Browse airlines by alliance, then open each airline guide.")
        for alliance, items in alliances.items():
            aslug = slug_country(alliance)
            airline_cards = [{"slug": a["airline_slug"], "name": a["airline_name"], "img": a.get("featured_image", self.config["default_image"]), "desc": a.get("premium_summary","")[:150]} for a in items]
            self.build_index(f"airlines/{aslug}", airline_cards, f"{alliance} Airlines", f"Explore premium airlines in {alliance}.")

    def build_airlines(self):
        for a in self.airlines:
            slug, name = a["airline_slug"], a["airline_name"]
            aslug = slug_country(a.get("alliance","Independent"))
            related = [{"href": f"/aircraft/{x}.html", "label": slug_to_title(x)} for x in a.get("related_aircraft_slugs", [])]
            sections = [{"title": "Airline overview", "text": a.get("premium_summary",""), "links": related}]
            ctx = self.ctx(
                f"{name} Review | {self.config['site_name']}",
                f"Explore {name}, including route fit, aircraft context, and premium planning guidance.",
                f"airlines/{slug}.html", name, a.get("premium_summary",""), a.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Airline"
            )
            write_page(self.output_root, f"airlines/{slug}.html", ctx)
            write_page(self.output_root, f"airlines/{aslug}/{slug}.html", ctx)
        self.build_airline_hierarchy()

    def build_aircraft(self):
        items = []
        for a in self.aircraft:
            slug, name = a["aircraft_slug"], a["model_name"]
            related = [{"href": f"/airlines/{x}.html", "label": self.airline_map.get(x,{}).get("airline_name", slug_to_title(x))} for x in a.get("related_airline_slugs", [])]
            sections = [{"title": "Aircraft overview", "text": a.get("premium_summary",""), "links": related}]
            write_page(self.output_root, f"aircraft/{slug}.html", self.ctx(
                f"{name} | {self.config['site_name']}",
                f"Explore {name}, airline usage, and premium cabin planning context.",
                f"aircraft/{slug}.html", name, a.get("premium_summary",""), a.get("featured_image", self.config["default_image"]),
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
                f"lounges/{slug}.html", name, l.get("customer_summary",""), l.get("featured_image", self.config["default_image"]),
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
                f"flight/{slug}.html", number, f.get("flight_summary",""), f.get("featured_image", self.config["default_image"]),
                sections, related, kicker="Flight"
            ))
            items.append({"slug": slug, "name": number, "img": f.get("featured_image", self.config["default_image"]), "desc": f.get("flight_summary","")[:150]})
        self.build_index("flight", items, "Flights", "Browse flight number guides.")

    def build_sitemaps(self):
        all_pages = sorted([p.relative_to(self.output_root).as_posix() for p in self.output_root.rglob("*.html") if not p.name.startswith("sitemap")])
        groups = {"core": [], "pages": [], "routes": [], "airlines": [], "destinations": [], "airports": []}
        for rel in all_pages:
            if rel == "index.html" or rel in {"about.html","contact.html","faq.html","request.html","search.html"}:
                groups["core"].append(rel)
            elif rel.startswith("routes/"):
                groups["routes"].append(rel)
            elif rel.startswith("airlines/"):
                groups["airlines"].append(rel)
            elif rel.startswith("destinations/"):
                groups["destinations"].append(rel)
            elif rel.startswith("airports/"):
                groups["airports"].append(rel)
            else:
                groups["pages"].append(rel)

        created = []
        for group_name, pages in groups.items():
            if not pages:
                continue
            for idx, chunk in enumerate(chunked(sorted(pages), 5000), start=1):
                filename = f"sitemap-{group_name}.xml" if idx == 1 and len(pages) <= 5000 else f"sitemap-{group_name}-{idx}.xml"
                path = self.output_root / filename
                lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
                for rel in chunk:
                    lines.append("  <url>")
                    lines.append(f"    <loc>{canonical(self.config['site_url'], rel)}</loc>")
                    lines.append("  </url>")
                lines.append("</urlset>")
                path.write_text("\n".join(lines), encoding="utf-8")
                created.append(filename)

        created.sort(key=lambda n: (0 if "core" in n else 1 if "pages" in n else 2 if "routes" in n else 3 if "airlines" in n else 4 if "destinations" in n else 5, n))
        index_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for name in created:
            index_lines.append("  <sitemap>")
            index_lines.append(f"    <loc>{canonical(self.config['site_url'], name)}</loc>")
            index_lines.append("  </sitemap>")
        index_lines.append("</sitemapindex>")
        index = "\n".join(index_lines)
        (self.output_root / "sitemap.xml").write_text(index, encoding="utf-8")
        (self.output_root / "sitemap-clean.xml").write_text(index, encoding="utf-8")

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
