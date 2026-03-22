
# LuxAeris Automation Engine Guide

## What this adds
This pack adds a practical automation layer for LuxAeris:
- data import template
- cluster batch reporting
- search-index refresh
- internal linking report
- one-command automation runner

## Weekly workflow
1. Add new airports, routes, lounges, destinations, or airline data.
2. Run:
   `python scripts/run_automation.py`
3. Commit updated files to GitHub.
4. Netlify rebuilds automatically.

## Scripts
- `scripts/import_data_template.py`
- `scripts/generate_cluster_batch.py`
- `scripts/refresh_search_index.py`
- `scripts/generate_internal_links_report.py`
- `scripts/run_automation.py`

## What can be automated safely
- search index refresh
- sitemap refresh through build
- internal-link recommendations
- cluster growth reporting
- deploys through GitHub + Netlify

## What should stay manual
- data quality review
- final publishing decisions for high-value clusters
- Reddit and Quora posting
- image selection for important landing pages
