
# LuxAeris Image Engine Pack

This pack gives you the files to add real free-to-use stock imagery into your repo.

## What is included
- `data/image_sources.json` — curated source pages and the exact local filenames to save
- `data/image_assignments.json` — mapping rules for destinations, airports, lounges, cabins, routes, and airlines
- `scripts/apply_image_engine.py` — updates your data files to use the local asset paths
- `image_download_manifest.csv` — quick checklist of what to download and where to place it

## What you need to do
1. Open each `source_page` in `data/image_sources.json`
2. Download the image from the source page
3. Save it to the exact `local_file` path listed
4. Run:
   `python scripts/apply_image_engine.py`

## Important
- Keep the filenames exactly as listed
- Do not hotlink these images on the live site
- Download and store them inside your repo
