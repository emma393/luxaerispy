
from __future__ import annotations
import json
import math
import re
from pathlib import Path
from typing import Any

def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def slug_to_title(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()

def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text

def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

def canonical(site_url: str, rel_path: str) -> str:
    site_url = site_url.rstrip("/")
    rel_path = rel_path.lstrip("/")
    return f"{site_url}/{rel_path}"
