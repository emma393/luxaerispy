
import json, os
from pathlib import Path

def build():
    data = json.load(open('data/destinations.json'))
    os.makedirs('generated',exist_ok=True)
    for d in data:
        f = open(f"generated/{d['slug']}.html","w")
        f.write(f"<h1>{d['name']}</h1><p>{d['desc']}</p>")
        f.close()

if __name__ == "__main__":
    build()
