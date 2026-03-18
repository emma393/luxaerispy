from pathlib import Path
from luxaeris_engine.builder import LuxAerisBuilder

def main():
    builder = LuxAerisBuilder(Path(__file__).resolve().parent)
    builder.build()
    print("LuxAeris combined production site generated in generated/site/")

if __name__ == "__main__":
    main()
