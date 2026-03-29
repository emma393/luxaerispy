#!/bin/bash

echo "Running LuxAeris self-heal + index..."

node scripts/self-heal-sitemaps.mjs
node scripts/submit-indexnow-from-sitemaps.mjs

echo "Done."
bash scripts/run-self-heal-and-index.sh


