
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))

def main():
    model = load("page_count_model.json")
    print(json.dumps(model, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
