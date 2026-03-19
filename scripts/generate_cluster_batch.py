
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))

def main():
    config = load("automation_config.json")
    destinations = load("destinations.json")
    routes = load("routes.json")
    airports = load("airports.json")

    report = []
    for cluster in config["clusters"]:
        if "destinations" in cluster:
            matched_dest = [d for d in destinations if d.get("destination_slug") in cluster["destinations"]]
            matched_routes = [r for r in routes if r.get("destination_city_slug") in cluster["destinations"]]
            report.append({
                "cluster": cluster["name"],
                "destinations": len(matched_dest),
                "routes": len(matched_routes)
            })
        else:
            family = cluster.get("page_family")
            count = 0
            if family == "lounges":
                count = len(load("lounges.json"))
            elif family == "airlines":
                count = len(load("airlines.json"))
            report.append({
                "cluster": cluster["name"],
                "page_family": family,
                "count": count
            })

    output = ROOT / "cluster_batch_report.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {output}")

if __name__ == "__main__":
    main()
