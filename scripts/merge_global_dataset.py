
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name, default):
    path = DATA / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default

def save(name, payload):
    (DATA / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

def dedupe_by_key(items, key):
    seen = set()
    out = []
    for item in items:
        val = item.get(key)
        if val in seen:
            continue
        seen.add(val)
        out.append(item)
    return out

def main():
    current_destinations = load("destinations.json", [])
    global_destinations = load("global_destinations_seed.json", [])
    merged_destinations = dedupe_by_key(current_destinations + global_destinations, "destination_slug")
    save("destinations.json", merged_destinations)

    # Keep route seeds as additional files so the existing site does not break.
    # They can be consumed by the builder in the next SEO-dominance phase.
    print("Merged global destinations into destinations.json")
    print("Global route and cluster seed files remain available in /data for next-phase generator expansion.")

if __name__ == "__main__":
    main()
