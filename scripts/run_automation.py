
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

def run(cmd):
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)

def main():
    run([sys.executable, "scripts/refresh_search_index.py"])
    run([sys.executable, "scripts/generate_cluster_batch.py"])
    run([sys.executable, "scripts/generate_internal_links_report.py"])
    run([sys.executable, "build.py"])
    print("Automation cycle complete.")

if __name__ == "__main__":
    main()
