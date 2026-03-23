from pathlib import Path
import shutil
import unicodedata
import re


def _safe_slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def normalize_site(site_root: Path) -> None:
    html_files = [p for p in site_root.rglob("*.html") if p.is_file()]
    for html in html_files:
        rel = html.relative_to(site_root)
        # create folder alias for every non-index html file
        if html.name != "index.html":
            alias_dir = site_root / rel.with_suffix("")
            alias_dir.mkdir(parents=True, exist_ok=True)
            alias_index = alias_dir / "index.html"
            shutil.copy2(html, alias_index)
        # create .html alias for every folder index file
        if html.name == "index.html":
            parent_rel = rel.parent
            if str(parent_rel) != ".":
                alias_html = site_root / (str(parent_rel) + ".html")
                alias_html.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(html, alias_html)

    # normalized ASCII aliases for any odd filenames
    for html in [p for p in site_root.rglob("*.html") if p.is_file()]:
        safe_name = _safe_slug(html.stem) + ".html"
        if safe_name != html.name:
            alias = html.with_name(safe_name)
            if not alias.exists():
                shutil.copy2(html, alias)
            alias_dir = alias.with_suffix("")
            alias_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(alias, alias_dir / "index.html")

    redirects = site_root / "_redirects"
    redirects.write_text(
        """/request /request.html 200
/search /search.html 200
/destinations/* /destinations/:splat 200
/routes/* /routes/:splat 200
/airlines/* /airlines/:splat 200
/airports/* /airports/:splat 200
/tools/* /tools/:splat 200
""",
        encoding="utf-8",
    )


def main():
    base = Path(__file__).resolve().parent
    src = base / "static"
    out = base / "generated" / "site"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    normalize_site(out)
    print("LuxAeris production site ready in generated/site/")


if __name__ == "__main__":
    main()
