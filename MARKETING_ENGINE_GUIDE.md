
# LuxAeris Marketing Engine

This pack adds a practical AI content system into your repo.

## What it does
- reads your routes, destinations, and airline data
- generates post ideas, hooks, captions, and scripts
- creates platform-specific output for Instagram, TikTok, and Pinterest
- exports a scheduler-friendly CSV

## Main files
- `marketing_engine/generate_posts.py`
- `marketing_engine/data_feed.py`
- `marketing_engine/config.json`
- `marketing_engine/templates/hooks.txt`
- `marketing_engine/templates/captions.txt`
- `marketing_engine/output/`

## How to use
Run:
`python marketing_engine/generate_posts.py`

Then open:
- `marketing_engine/output/schedule.csv`
- `marketing_engine/output/instagram_brief.txt`
- `marketing_engine/output/tiktok_brief.txt`
- `marketing_engine/output/pinterest_brief.txt`

## Best workflow
1. Add or refresh LuxAeris data
2. Run the marketing generator
3. Upload the CSV or copy the content into Metricool, Buffer, or Later
4. Review before publishing

## What stays manual
- final image or video creation
- final caption polish for major posts
- direct platform engagement
