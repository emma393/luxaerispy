# LuxAeris Combined Production Repo

This repo combines:
- the final working LuxAeris static website in `static/`
- the Python SEO generation engine in `luxaeris_engine/`
- structured datasets in `data/`
- schemas, templates, examples, and docs for scaling production data
- `build.py` to combine the static website with generated SEO pages
- `netlify.toml` for Netlify deployment
- a GitHub Actions workflow to build the site automatically

## Run

```bash
pip install -r requirements.txt
python build.py
```

Output:
```bash
generated/site/
```

## Netlify
- Build command: `python build.py`
- Publish directory: `generated/site`


## Production scale note

This package includes a curated real-airport seed dataset and a production-ready structure.  
It is designed to scale toward very large page counts by expanding JSON data and page families.

Included scale profile file:
- `data/build_profile.json`

Recommended usage:
- keep Netlify on the balanced profile for normal deploys
- use CI or batch generation for higher page volumes
- expand airports, routes, lounges, airline-cabin pages, and destination clusters gradually to protect quality
