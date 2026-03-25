from pathlib import Path
import shutil

def copy_contents(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

def main():
    base = Path(__file__).resolve().parent
    src = base / "static"
    out = base / "generated" / "site"
    if not src.exists():
        raise FileNotFoundError(f"Missing source folder: {src}")
    if out.exists():
        shutil.rmtree(out)
    copy_contents(src, out)
    if not (out / "index.html").exists():
        raise FileNotFoundError("generated/site/index.html was not created")
    if not (out / "robots.txt").exists():
        (out / "robots.txt").write_text("User-agent: *\nAllow: /\n\nSitemap: https://luxaeris.com/sitemap.xml\n", encoding="utf-8")
    if not (out / "sitemap.xml").exists():
        (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://luxaeris.com/</loc></url>\n</urlset>\n', encoding="utf-8")
    print("LuxAeris production site ready in generated/site/")

if __name__ == "__main__":
    main()
