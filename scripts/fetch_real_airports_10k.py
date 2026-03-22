
from __future__ import annotations
import csv, json, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

OURAIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"

def slugify(value: str) -> str:
    return (
        value.lower().replace("&", "and").replace("'", "").replace(".", "")
        .replace("/", "-").replace(" ", "-")
    )

def main() -> None:
    raw_csv = DATA / "_ourairports_airports.csv"
    urllib.request.urlretrieve(OURAIRPORTS_URL, raw_csv)

    master = []
    compact = []
    with raw_csv.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get("type") == "closed":
                continue
            iata = (row.get("iata_code") or "").strip().upper()
            ident = (row.get("ident") or "").strip().upper()
            code = iata or ident
            if not code:
                continue
            city = (row.get("municipality") or "").strip() or (row.get("name") or "").strip()
            country = (row.get("iso_country") or "").strip()
            region = (row.get("iso_region") or "").strip()
            name = (row.get("name") or "").strip() or city
            airport = {
                "code": code,
                "iata": iata,
                "icao": ident,
                "name": name,
                "city": city,
                "country_iso2": country,
                "region_code": region,
                "type": row.get("type") or "",
                "latitude_deg": row.get("latitude_deg") or "",
                "longitude_deg": row.get("longitude_deg") or "",
                "scheduled_service": row.get("scheduled_service") or "",
                "slug": slugify(city) + "-" + slugify(code),
            }
            master.append(airport)
            compact.append({
                "label": f"{code} — {city}, {country}",
                "code": code,
                "city": city,
                "country": country,
                "slug": airport["slug"],
            })

    # de-duplicate compact labels
    seen = set()
    compact_unique = []
    for item in compact:
        if item["label"] in seen:
            continue
        seen.add(item["label"])
        compact_unique.append(item)

    (DATA / "airports_master_10k.json").write_text(json.dumps(master, indent=2, ensure_ascii=False), encoding="utf-8")
    (ROOT / "static" / "assets" / "airports-search-10k.json").write_text(json.dumps(compact_unique, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Built {len(master)} airports into data/airports_master_10k.json")
    print(f"Built {len(compact_unique)} search records into static/assets/airports-search-10k.json")

if __name__ == "__main__":
    main()
