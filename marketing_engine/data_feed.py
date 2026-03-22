
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load_dataset(name: str, default=None):
    if default is None:
        default = []
    path = DATA / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default

def get_priority_destinations():
    destinations = load_dataset("destinations.json", [])
    wanted = {"dubai","london","tokyo","paris","singapore","rome","new-york","bali"}
    return [d for d in destinations if d.get("destination_slug") in wanted]

def get_priority_routes():
    routes = load_dataset("routes.json", [])
    wanted = {"dubai","london","tokyo","paris","singapore","rome","new-york","bali"}
    return [r for r in routes if r.get("destination_city_slug") in wanted or r.get("origin_city_slug") in wanted][:100]
