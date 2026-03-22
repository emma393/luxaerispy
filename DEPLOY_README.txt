Netlify deploy settings for this Python repo:
- Build command: python build.py
- Publish directory: generated/site

Default behavior:
- build.py copies the stable prebuilt site from /static to /generated/site.

Optional future scaling:
- set environment variable FULL_REBUILD=1 to force the LuxAerisBuilder Python rebuild path.
