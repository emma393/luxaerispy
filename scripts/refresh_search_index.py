
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
STATIC = ROOT / "static" / "assets"

def load(name):
    path = DATA / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []

def main():
    airports = load("airports.json")
    destinations = load("destinations.json")
    airlines = load("airlines.json")
    lounges = load("lounges.json")
    routes = load("routes.json")
    flights = load("flights.json")

    index = []
    for a in airports:
        index.append({
            "type":"Airport",
            "title": a.get("name",""),
            "url": f"airports/{a.get('slug','')}.html",
            "keywords": f"{a.get('name','')} {a.get('city_name','')} {a.get('city_code','')} {a.get('code_iata','')}",
            "summary": a.get("premium_summary","")[:180]
        })
    for d in destinations:
        index.append({
            "type":"Destination",
            "title": d.get("display_name",""),
            "url": f"destinations/{d.get('destination_slug','')}.html",
            "keywords": f"{d.get('display_name','')} premium travel",
            "summary": d.get("luxury_summary","")[:180]
        })
    for a in airlines:
        index.append({
            "type":"Airline",
            "title": a.get("airline_name",""),
            "url": f"airlines/{a.get('airline_slug','')}.html",
            "keywords": f"{a.get('airline_name','')} business class first class",
            "summary": a.get("premium_summary","")[:180]
        })
    for l in lounges:
        index.append({
            "type":"Lounge",
            "title": l.get("lounge_name",""),
            "url": f"lounges/{l.get('lounge_slug','')}.html",
            "keywords": f"{l.get('lounge_name','')} lounge",
            "summary": l.get("customer_summary","")[:180]
        })
    for r in routes[:5000]:
        oc = r.get("origin_city_slug","").replace("-", " ").title()
        dc = r.get("destination_city_slug","").replace("-", " ").title()
        index.append({
            "type":"Route",
            "title": f"{oc} to {dc}",
            "url": f"routes/{r.get('route_slug','')}.html",
            "keywords": f"{oc} {dc} premium route business class",
            "summary": r.get("route_summary","")[:180]
        })
    for f in flights[:5000]:
        index.append({
            "type":"Flight",
            "title": f.get("flight_number",""),
            "url": f"flight/{f.get('flight_slug','')}.html",
            "keywords": f"{f.get('flight_number','')} flight",
            "summary": f.get("flight_summary","")[:180]
        })

    STATIC.mkdir(parents=True, exist_ok=True)
    out = STATIC / "search-index.json"
    out.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out} with {len(index)} items")

if __name__ == "__main__":
    main()
