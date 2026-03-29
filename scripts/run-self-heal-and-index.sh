#!/bin/bash
set -e
export SITE_URL="https://luxaeris.com"
export SITE_ROOT="generated/site"
export INDEXNOW_KEY="6e2a8c496bce49f4aebfc321063b2e26"
export KEY_LOCATION="https://luxaeris.com/6e2a8c496bce49f4aebfc321063b2e26.txt"

node scripts/self-heal-sitemaps.mjs
node scripts/submit-indexnow-from-sitemaps.mjs
