# LuxAeris Production Hybrid Repo Complete

This combined repo includes:
- working hybrid LuxAeris site base
- luxury UI + header/video visibility fixes
- request-form validation updates
- generator build fixes
- image engine manifests and assignment rules
- global SEO dataset seeds
- automation scripts
- marketing engine

Recommended deploy settings:
- Build command: python build.py
- Publish directory: generated/site

Important notes:
- The homepage video path is: static/assets/videos/hero-plane-window.mp4
- The image engine pack includes source-page manifests and local target paths. Download those images into the exact listed filenames before applying image assignments.
- The global dataset files are seed files for expansion. Run scripts/merge_global_dataset.py to merge global destinations into your active data.
- The route/city-pair seed files are ready for the next builder expansion phase.
