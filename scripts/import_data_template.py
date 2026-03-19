
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
    airports = load("airports.json")
    routes = load("routes.json")
    destinations = load("destinations.json")
    lounges = load("lounges.json")

    # Add your new rows here from licensed, curated, or manually prepared sources.
    # Example:
    # airports.append({...})
    # routes.append({...})

    save("airports.json", airports)
    save("routes.json", routes)
    save("destinations.json", destinations)
    save("lounges.json", lounges)
    print("Data import template completed.")

if __name__ == "__main__":
    main()
