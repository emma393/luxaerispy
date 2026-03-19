
Replace these files in your repo:
- luxaeris_engine/page_writer.py
- luxaeris_engine/builder.py
- static/assets/site.css
- requirements.txt

What this fixes:
- restores write_page import so Netlify build stops failing
- restores a valid LuxAerisBuilder.build() method
- upgrades destination and route pages to a higher-end luxury layout
- keeps generator-driven page creation working
