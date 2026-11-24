#!/usr/bin/env bash
# Builds the combined and per-module PDFs from the rendered PNG assets.
set -euo pipefail

ROOT="/home/blck/Documents/Hope, Inc/Wireframe_Mockup-and-Handoff"
ASSETS="$ROOT/assets"
PAGES="/tmp/opencode/hope-pdf-pages"
rm -rf "$PAGES"
mkdir -p "$PAGES"

n=0
add () { # source, label
  n=$((n + 1))
  local src="$1" label="$2" out
  out=$(printf '%s/page-%02d.png' "$PAGES" "$n")
  cp "$src" "$out"
  printf '  %02d  %s\n' "$n" "$label"
}

add "$ASSETS/00-cover.png" "Cover"
add "$ASSETS/00-legend.png" "Screen index"

for f in "$ASSETS"/customer/c0*.png "$ASSETS"/customer/c1[01]*.png; do
  add "$f" "$(basename "$f" .png)"
done

# Phone customer board gets a 1440x900 presentation page.
n=$((n + 1))
out=$(printf '%s/page-%02d.png' "$PAGES" "$n")
magick -size 1440x900 xc:'#eef3f5' \
  -fill '#5d7080' -font DejaVu-Sans -pointsize 18 -gravity north -annotate +0+38 'Phone viewport · 390 × 844' \
  \( "$ASSETS/customer/c12-customer-mobile.png" -bordercolor '#c9d5dc' -border 1 \) \
  -gravity center -composite "$out"
printf '  %02d  c12-customer-mobile\n' "$n"

for f in "$ASSETS"/product/p0[1-6]*.png; do
  add "$f" "$(basename "$f" .png)"
done

n=$((n + 1))
out=$(printf '%s/page-%02d.png' "$PAGES" "$n")
magick -size 1440x900 xc:'#eef3f5' \
  -fill '#5d7080' -font DejaVu-Sans -pointsize 18 -gravity north -annotate +0+38 'Phone viewport · 390 × 844' \
  \( "$ASSETS/product/p07-product-mobile.png" -bordercolor '#c9d5dc' -border 1 \) \
  -gravity center -composite "$out"
printf '  %02d  p07-product-mobile\n' "$n"

for f in "$ASSETS"/price-history/ph0[1-5]*.png; do
  add "$f" "$(basename "$f" .png)"
done

n=$((n + 1))
out=$(printf '%s/page-%02d.png' "$PAGES" "$n")
magick -size 1440x900 xc:'#eef3f5' \
  -fill '#5d7080' -font DejaVu-Sans -pointsize 18 -gravity north -annotate +0+38 'Phone viewport · 390 × 844' \
  \( "$ASSETS/price-history/ph06-price-history-mobile.png" -bordercolor '#c9d5dc' -border 1 \) \
  -gravity center -composite "$out"
printf '  %02d  ph06-price-history-mobile\n' "$n"

echo "Building combined PDF ($n pages)"
magick -density 144 "$PAGES"/page-*.png -units PixelsPerInch "$ROOT/High-Fidelity-Mockups.pdf"

echo "Building module PDFs"
magick -density 144 "$PAGES"/page-03.png "$PAGES"/page-0[4-9].png "$PAGES"/page-1[0-4].png -units PixelsPerInch "$ROOT/Customer-Mockups.pdf"
magick -density 144 "$PAGES"/page-15.png "$PAGES"/page-1[6-9].png "$PAGES"/page-2[0-1].png -units PixelsPerInch "$ROOT/Product-Mockups.pdf"
magick -density 144 "$PAGES"/page-22.png "$PAGES"/page-2[3-7].png -units PixelsPerInch "$ROOT/Price-History-Mockups.pdf"

# Contact sheet for quick review.
magick montage "$PAGES"/page-*.png -thumbnail 360x225 -tile 4x -geometry +10+10 -background '#dde5ea' "$ROOT/assets/00-contact-sheet.png"

echo "PDFs:"
ls -lh "$ROOT"/*.pdf
