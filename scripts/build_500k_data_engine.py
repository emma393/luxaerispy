
from pathlib import Path
import json
from itertools import permutations

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name, default=None):
    if default is None: default = []
    p = DATA / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default

def save(name, payload):
    (DATA / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

def main():
    destinations = load("destinations.json")
    route_keywords = load("global_keyword_variants.json", {}).get("route_keywords", [])
    hubs = [d["destination_slug"] for d in destinations[:350]]
    page_seeds = []
    for o, d in permutations(hubs, 2):
        base = f"{o}-to-{d}"
        page_seeds.append({"path": f"routes/{base}.html", "type": "route"})
        for k in route_keywords[:6]:
            slug = k.replace(" ", "-")
            page_seeds.append({"path": f"routes/{base}-{slug}.html", "type": "route-variant"})
        if len(page_seeds) >= 500000:
            break
    save("page_generation_engine_500k.json", {
        "planned_pages": len(page_seeds),
        "sample": page_seeds[:1000]
    })
    print(f"Prepared {len(page_seeds)} planned page seeds.")

if __name__ == "__main__":
    main()
