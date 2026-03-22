
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name):
    path = DATA / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []

def save(name, payload):
    (DATA / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

def main():
    assignments = json.loads((DATA / "image_assignments.json").read_text(encoding="utf-8"))
    dest_map = assignments.get("destination_featured_images", {})
    fallbacks = assignments.get("fallbacks", {})
    airline_overrides = assignments.get("airline_overrides", {})

    airports = load("airports.json")
    destinations = load("destinations.json")
    routes = load("routes.json")
    lounges = load("lounges.json")
    airlines = load("airlines.json")
    aircraft = load("aircraft.json")
    flights = load("flights.json")

    airport_by_slug = {a.get("slug"): a for a in airports}

    for d in destinations:
        slug = d.get("destination_slug", "")
        d["featured_image"] = dest_map.get(slug, fallbacks.get("route"))

    for a in airports:
        city_slug = a.get("city_slug", "")
        a["featured_image"] = dest_map.get(city_slug, fallbacks.get("airport"))

    for l in lounges:
        ap = airport_by_slug.get(l.get("airport_slug"))
        l["featured_image"] = ap.get("featured_image") if ap else fallbacks.get("lounge")

    for r in routes:
        city_slug = r.get("destination_city_slug", "")
        r["featured_image"] = dest_map.get(city_slug, fallbacks.get("route"))

    for a in airlines:
        slug = a.get("airline_slug", "")
        a["featured_image"] = airline_overrides.get(slug, fallbacks.get("cabin"))

    for a in aircraft:
        a["featured_image"] = fallbacks.get("cabin")

    for f in flights:
        ap = airport_by_slug.get(f.get("destination_airport_slug"))
        f["featured_image"] = ap.get("featured_image") if ap else fallbacks.get("route")

    save("destinations.json", destinations)
    save("airports.json", airports)
    save("routes.json", routes)
    save("lounges.json", lounges)
    save("airlines.json", airlines)
    save("aircraft.json", aircraft)
    save("flights.json", flights)
    print("Applied image engine assignments.")

if __name__ == "__main__":
    main()
