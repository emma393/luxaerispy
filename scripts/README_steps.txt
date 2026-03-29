1) From repo root run:
   python3 scripts/generate_sitemap.py

2) Upload / commit these files:
   static/assets/site.css
   static/assets/site.js
   generated/site/assets/site.css
   generated/site/assets/site.js
   generated/site/sitemap-clean.xml
   generated/site/robots.txt

3) In Google Search Console:
   - Remove old sitemap submissions
   - Submit only: https://luxaeris.com/sitemap-clean.xml

4) Use Google Removals AFTER the new sitemap is live:
   - Remove old broken route prefix only if you are replacing it
   - Example: https://luxaeris.com/routes/
