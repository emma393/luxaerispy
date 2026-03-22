
from pathlib import Path
import json
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name):
    path = DATA / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []

def main():
    airports = load("airports.json")
    routes = load("routes.json")
    destinations = load("destinations.json")
    lounges = load("lounges.json")

    airport_by_slug = {a.get("slug"): a for a in airports}
    report = {"airports": [], "routes": [], "destinations": []}

    for a in airports[:300]:
        related_routes = [r.get("route_slug") for r in routes if r.get("origin_airport_slug") == a.get("slug") or r.get("destination_airport_slug") == a.get("slug")][:8]
        related_lounges = [l.get("lounge_slug") for l in lounges if l.get("airport_slug") == a.get("slug")][:6]
        report["airports"].append({
            "airport_slug": a.get("slug"),
            "link_to_routes": related_routes,
            "link_to_lounges": related_lounges
        })

    for r in routes[:1000]:
        report["routes"].append({
            "route_slug": r.get("route_slug"),
            "link_to_origin_airport": r.get("origin_airport_slug"),
            "link_to_destination_airport": r.get("destination_airport_slug"),
            "link_to_destination_page": r.get("destination_city_slug")
        })

    for d in destinations[:300]:
        related_routes = [r.get("route_slug") for r in routes if r.get("destination_city_slug") == d.get("destination_slug")][:10]
        report["destinations"].append({
            "destination_slug": d.get("destination_slug"),
            "link_to_routes": related_routes
        })

    out = ROOT / "internal_links_report.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")

if __name__ == "__main__":
    main()
