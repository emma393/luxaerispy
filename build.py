from pathlib import Path
import shutil

def main():
    base = Path(__file__).resolve().parent
    src = base / "static"
    out = base / "generated" / "site"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    print("LuxAeris production site ready in generated/site/")

if __name__ == "__main__":
    main()
