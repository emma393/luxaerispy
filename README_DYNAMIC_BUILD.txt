Put build_from_repo.py inside your existing core/ folder.

Run from the repo root:

python3 -m pip install -r core/requirements-generator.txt
python3 core/build_from_repo.py --repo-root .

This uses the existing working repo's JSON data in core/data and the existing static design as the base,
then rebuilds generated/site dynamically instead of just copying static files.

Verified against the uploaded working-v4 repo:
- routes: 10,198 pages
- destinations: 551 pages
- airports: 554 pages
- airlines: 18 pages
- total HTML pages rebuilt: 11,345

To scale further, expand:
- core/data/routes.json
- core/data/destinations.json
- core/data/airports.json
- core/data/airlines.json
