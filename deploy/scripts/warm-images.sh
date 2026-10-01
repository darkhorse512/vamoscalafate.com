#!/usr/bin/env bash
#
# Pre-generates optimised images for the main pages after a deploy.
#
# The web process encodes one image at a time (see next.config: memory
# safety on a 2-vCPU VPS), so the first visitor to an image-heavy page after
# a deploy would otherwise wait for dozens of encodes. Requesting the common
# widths here, one at a time and at low priority, moves that wait off real
# visitors. Results land in the shared image cache, so they survive future
# deploys too.
#
# Safe to run any time; already-cached images return immediately.

set -uo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
# Phone, tablet and desktop widths from next.config deviceSizes.
WIDTHS="${WIDTHS:-414 768 1280}"

pages=(/ /excursiones /destinos /blog /tres-excursiones-imperdibles-en-el-calafate)
# Every excursion page, from the sitemap.
while read -r url; do pages+=("${url#https://vamoscalafate.com}"); done < <(
  curl -s "$BASE/sitemap.xml" | grep -o 'https://vamoscalafate.com/excursiones/[^<]*' | sort -u
)

urls=$(
  for page in "${pages[@]}"; do
    curl -s "$BASE$page" | grep -o '/_next/image?url=[^" ,]*' | sed 's/&amp;/\&/g'
  done | sed -E 's/&w=[0-9]+/\&w=WIDTH/' | sort -u
)

count=0
for url in $urls; do
  for width in $WIDTHS; do
    nice -n 15 curl -s -o /dev/null --max-time 60 "$BASE${url/WIDTH/$width}"
    count=$((count + 1))
  done
done
echo "[warm-images] requested $count image variants for ${#pages[@]} pages"
