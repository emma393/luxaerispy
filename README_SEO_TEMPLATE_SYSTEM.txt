LUXAERIS DYNAMIC SEO TEMPLATE SYSTEM

Replace / add these files in your core repo:
- build.py
- seo_template_system.py
- data/seo_template_rules.json

Build as usual:
python build.py

This system automatically injects:
- title
- meta description
- canonical
- robots
- og:title / og:description / og:url / og:image
- twitter title / description / image
- TravelAgency JSON-LD

Redirect pages are marked noindex,follow automatically.
Use data/seo_template_rules.json for custom page overrides.
