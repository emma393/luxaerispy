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
