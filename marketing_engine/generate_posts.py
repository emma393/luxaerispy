
from pathlib import Path
import json
import csv
import random
from datetime import datetime, timedelta

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "marketing_engine"
DATA = ROOT / "data"
TEMPLATES = ENGINE / "templates"
OUTPUT = ENGINE / "output"

def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default

def slug_to_title(slug: str) -> str:
    return slug.replace("-", " ").title()

def choose_items(destinations, airlines, routes, n=10):
    priority_dest = {"dubai","london","tokyo","paris","singapore","rome","new-york","bali"}
    picked_dest = [d for d in destinations if d.get("destination_slug") in priority_dest][:8]
    picked_air = airlines[:6]
    picked_routes = []
    for r in routes:
        if r.get("destination_city_slug") in priority_dest or r.get("origin_city_slug") in priority_dest:
            picked_routes.append(r)
        if len(picked_routes) >= n:
            break
    return picked_dest, picked_air, picked_routes

def caption_cta():
    return "Request your quote at LuxAeris."

def build_instagram_posts(destinations, airlines, routes):
    posts = []
    for d in destinations[:4]:
        name = d.get("display_name", slug_to_title(d.get("destination_slug","destination")))
        posts.append({
            "platform":"instagram",
            "content_type":"carousel",
            "title": f"Why {name} works so well for premium travel",
            "hook": f"If you are flying premium, {name} is worth looking at.",
            "caption": f"{name} suits travelers who care about airport flow, cabin quality, and arriving well. Use LuxAeris to request a premium quote with your route and cabin preferences.\n\n{caption_cta()}",
            "cta": "Request Quote",
            "target_url": "/request.html",
            "keywords": f"{name} premium travel business class first class"
        })
    for a in airlines[:4]:
        name = a.get("airline_name","Premium Airline")
        posts.append({
            "platform":"instagram",
            "content_type":"single-image",
            "title": f"{name}: when it is worth considering",
            "hook": f"Not all premium airlines fit the same traveler.",
            "caption": f"{name} should be judged by privacy, schedule quality, airport fit, and total journey feel — not just marketing. Compare the route first, then request a premium quote.\n\n{caption_cta()}",
            "cta": "Request Quote",
            "target_url": "/request.html",
            "keywords": f"{name} business class first class review"
        })
    return posts

def build_tiktok_posts(destinations, airlines, routes):
    posts = []
    for r in routes[:6]:
        origin = slug_to_title(r.get("origin_city_slug","origin"))
        dest = slug_to_title(r.get("destination_city_slug","destination"))
        posts.append({
            "platform":"tiktok",
            "content_type":"short-video-script",
            "title": f"{origin} to {dest}: premium route insight",
            "hook": f"Most travelers choose this route the wrong way.",
            "caption": f"{origin} to {dest} is not just about the airline. It is about airport flow, timing, and the cabin that matches the length of the journey.\n\n{caption_cta()}",
            "script": f"Hook: Most travelers choose {origin} to {dest} the wrong way. Point 1: airport flow matters. Point 2: cabin comfort matters more on longer routes. Point 3: request a private quote instead of guessing.",
            "cta": "Request Quote",
            "target_url": "/request.html",
            "keywords": f"{origin} {dest} business class first class"
        })
    for a in airlines[:3]:
        name = a.get("airline_name","Premium Airline")
        posts.append({
            "platform":"tiktok",
            "content_type":"talking-head-script",
            "title": f"{name} vs the route itself",
            "hook": f"Do not choose a premium airline without checking this first.",
            "caption": f"{name} can be excellent on one route and less compelling on another. Match the cabin to the route, airport, and timing.\n\n{caption_cta()}",
            "script": f"Hook: Do not choose {name} without checking the route. Explain airport fit, cabin layout, sleep value, and why route logic beats hype.",
            "cta": "Request Quote",
            "target_url": "/request.html",
            "keywords": f"{name} route comparison premium travel"
        })
    return posts

def build_pinterest_posts(destinations, routes):
    posts = []
    for d in destinations[:8]:
        name = d.get("display_name", slug_to_title(d.get("destination_slug","destination")))
        posts.append({
            "platform":"pinterest",
            "content_type":"pin",
            "title": f"Luxury flights to {name}",
            "hook": f"Premium route inspiration for {name}",
            "caption": f"Explore premium route options, airport context, and better cabin choices for {name}. {caption_cta()}",
            "cta": "Request Quote",
            "target_url": f"/destinations/{d.get('destination_slug','')}.html",
            "keywords": f"{name} business class flights luxury travel"
        })
    for r in routes[:6]:
        origin = slug_to_title(r.get("origin_city_slug","origin"))
        dest = slug_to_title(r.get("destination_city_slug","destination"))
        posts.append({
            "platform":"pinterest",
            "content_type":"pin",
            "title": f"{origin} to {dest} premium travel guide",
            "hook": f"Better premium route planning",
            "caption": f"Use airport, route, and cabin guidance before requesting your premium quote for {origin} to {dest}. {caption_cta()}",
            "cta": "Request Quote",
            "target_url": f"/routes/{r.get('route_slug','')}.html",
            "keywords": f"{origin} to {dest} business class first class"
        })
    return posts

def write_platform_file(platform: str, posts):
    out = OUTPUT / f"{platform}_posts.json"
    out.write_text(json.dumps(posts, indent=2, ensure_ascii=False), encoding="utf-8")

def write_schedule_csv(all_posts):
    start = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
    rows = []
    offset = 0
    for post in all_posts:
        rows.append({
            "platform": post["platform"],
            "publish_datetime_utc": (start + timedelta(hours=offset)).isoformat() + "Z",
            "title": post.get("title",""),
            "hook": post.get("hook",""),
            "caption": post.get("caption",""),
            "cta": post.get("cta",""),
            "target_url": post.get("target_url",""),
            "keywords": post.get("keywords",""),
            "content_type": post.get("content_type","")
        })
        offset += 6 if post["platform"] == "pinterest" else 12
    out = OUTPUT / "schedule.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

def write_daily_text_briefs(all_posts):
    buckets = {}
    for post in all_posts:
        buckets.setdefault(post["platform"], []).append(post)
    for platform, posts in buckets.items():
        lines = [platform.upper()]
        for i, post in enumerate(posts, start=1):
            lines.append(f"{i}. {post['title']}")
            lines.append(f"   Hook: {post['hook']}")
            lines.append(f"   Caption: {post['caption']}")
            if "script" in post:
                lines.append(f"   Script: {post['script']}")
            lines.append("")
        (OUTPUT / f"{platform}_brief.txt").write_text("\n".join(lines), encoding="utf-8")

def main():
    destinations = load_json(DATA / "destinations.json", [])
    airlines = load_json(DATA / "airlines.json", [])
    routes = load_json(DATA / "routes.json", [])

    picked_dest, picked_air, picked_routes = choose_items(destinations, airlines, routes)

    instagram = build_instagram_posts(picked_dest, picked_air, picked_routes)
    tiktok = build_tiktok_posts(picked_dest, picked_air, picked_routes)
    pinterest = build_pinterest_posts(picked_dest, picked_routes)

    all_posts = instagram + tiktok + pinterest

    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_platform_file("instagram", instagram)
    write_platform_file("tiktok", tiktok)
    write_platform_file("pinterest", pinterest)
    write_schedule_csv(all_posts)
    write_daily_text_briefs(all_posts)

    print(f"Generated {len(all_posts)} posts into {OUTPUT}")

if __name__ == "__main__":
    main()
