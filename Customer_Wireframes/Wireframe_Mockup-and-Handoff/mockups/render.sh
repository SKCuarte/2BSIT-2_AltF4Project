#!/usr/bin/env bash
# Renders every generated mockup board to PNG with headless Firefox.
set -euo pipefail

ROOT="/home/blck/Documents/Hope, Inc/Wireframe_Mockup-and-Handoff"
SRC="$ROOT/mockups"
OUT="$ROOT/assets"
PROFILE="/tmp/opencode/ffprofile"
BASE="file:///home/blck/Documents/Hope,%20Inc/Wireframe_Mockup-and-Handoff/mockups"

mkdir -p "$OUT/customer" "$OUT/product" "$OUT/price-history"

shot () { # name, width, height, dest
  local name="$1" w="$2" h="$3" dest="$4"
  timeout 90 firefox -profile "$PROFILE" -no-remote --headless \
    --screenshot "$dest" --window-size="${w},${h}" "$BASE/${name}.html" >/dev/null 2>&1
  printf '  %s -> %s\n' "$name" "${dest#$ROOT/}"
}

echo "Rendering cover and legend"
shot cover 1440 900 "$OUT/00-cover.png"
shot legend 1440 900 "$OUT/00-legend.png"

echo "Rendering Customer boards"
for n in c01-customer-list c02-customer-filtered c03-customer-no-match c04-customer-inactive \
         c05-customer-create c06-customer-create-errors c07-customer-edit c08-customer-detail \
         c09-customer-deactivate c10-customer-deactivate-blocked c11-customer-restore; do
  shot "$n" 1440 900 "$OUT/customer/$n.png"
done
shot c12-customer-mobile 390 844 "$OUT/customer/c12-customer-mobile.png"

echo "Rendering Product boards"
for n in p01-product-list p02-product-no-match p03-product-create p04-product-edit-errors \
         p05-product-detail p06-product-price-states; do
  shot "$n" 1440 900 "$OUT/product/$n.png"
done
shot p07-product-mobile 390 844 "$OUT/product/p07-product-mobile.png"

echo "Rendering Price History boards"
for n in ph01-price-history ph02-price-add ph03-price-edit-errors ph04-price-delete ph05-product-restore; do
  shot "$n" 1440 900 "$OUT/price-history/$n.png"
done
shot ph06-price-history-mobile 390 844 "$OUT/price-history/ph06-price-history-mobile.png"

echo "Done."
