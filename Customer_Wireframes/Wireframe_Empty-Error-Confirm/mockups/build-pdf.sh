#!/usr/bin/env bash
# Builds the S2-UIX-04 state PDF from the rendered PNG assets.
set -euo pipefail

ROOT="/home/blck/Documents/Hope, Inc/Wireframe_Empty-Error-Confirm"
A="$ROOT/assets"
PAGES="/tmp/opencode/hope-state-pages"
rm -rf "$PAGES"; mkdir -p "$PAGES"

n=0
add () {
  n=$((n + 1))
  cp "$1" "$(printf '%s/page-%02d.png' "$PAGES" "$n")"
  printf '  %02d  %s\n' "$n" "$(basename "$1" .png)"
}

phone_page () { # source, label
  n=$((n + 1))
  local out; out=$(printf '%s/page-%02d.png' "$PAGES" "$n")
  magick -size 1440x900 xc:'#eef3f5' \
    -fill '#5d7080' -font DejaVu-Sans -pointsize 18 -gravity north -annotate +0+40 "$2" \
    \( "$1" -bordercolor '#c9d5dc' -border 1 \) \
    -gravity center -composite "$out"
  printf '  %02d  %s (phone)\n' "$n" "$(basename "$1" .png)"
}

add "$A/00-cover.png"
add "$A/01-state-index.png"
add "$A/empty-state_product-list.png"
add "$A/no-results_product-list.png"
add "$A/empty-state_customer-list.png"
add "$A/no-results_customer-list.png"
add "$A/empty-state_price-history.png"
add "$A/error-field-validation_product-form.png"
add "$A/error-summary_product-form.png"
add "$A/error-api_product-list.png"
add "$A/error-api_customer-form.png"
add "$A/error-api_price-history.png"
add "$A/confirm-soft-delete_customer.png"
add "$A/confirm-soft-delete_product.png"
add "$A/confirm-soft-delete_price-history.png"
add "$A/blocked-delete_customer.png"
add "$A/blocked-delete_product.png"

phone_page "$A/empty-state_product-list_mobile.png"     'Phone viewport · 390 × 844 · empty product list'
phone_page "$A/no-results_customer-list_mobile.png"     'Phone viewport · 390 × 844 · no-result search'
phone_page "$A/confirm-soft-delete_customer_mobile.png" 'Phone viewport · 390 × 844 · soft-delete confirmation'
phone_page "$A/blocked-delete_product_mobile.png"       'Phone viewport · 390 × 844 · blocked delete'

echo "Building PDF ($n pages)"
magick -density 144 "$PAGES"/page-*.png -units PixelsPerInch "$ROOT/Empty-Error-Confirm-States.pdf"

magick montage "$PAGES"/page-*.png -thumbnail 360x225 -tile 4x -geometry +10+10 -background '#dde5ea' "$A/00-contact-sheet.png"

ls -lh "$ROOT/Empty-Error-Confirm-States.pdf"
