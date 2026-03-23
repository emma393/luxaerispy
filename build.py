from pathlib import Path
import shutil
import json

SITE_CONFIG = {
    "site_name": "LuxAeris",
    "site_url": "https://luxaeris.com",
    "brand_tagline": "Private fares. Premium journeys.",
    "default_image": "/assets/images/real/dubai.jpg",
    "request_quote_url": "/request.html",
}


def ensure_site_config(base: Path):
    data_dir = base / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    cfg = data_dir / "site_config.json"
    if not cfg.exists():
        cfg.write_text(json.dumps(SITE_CONFIG, indent=2), encoding="utf-8")


def copy_static(base: Path):
    src = base / "static"
    out = base / "generated" / "site"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    print("LuxAeris production site ready in generated/site/ (copied from static)")


def main():
    base = Path(__file__).resolve().parent
    ensure_site_config(base)
    copy_static(base)


if __name__ == "__main__":
    main()
