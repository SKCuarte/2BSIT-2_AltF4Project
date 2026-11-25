#!/usr/bin/env bash
# Renders every S2-UIX-04 state board to PNG with headless Firefox.
set -euo pipefail

ROOT="/home/blck/Documents/Hope, Inc/Wireframe_Empty-Error-Confirm"
SRC="$ROOT/mockups"
OUT="$ROOT/assets"
PROFILE="/tmp/opencode/ffprofile"
BASE="file:///home/blck/Documents/Hope,%20Inc/Wireframe_Empty-Error-Confirm/mockups"

mkdir -p "$OUT"

shot () { # name, width, height
  local name="$1" w="$2" h="$3"
  if [ -e "$OUT/$name.png" ]; then
    echo "  SKIP (exists): $name.png"
    return
  fi
  timeout 90 firefox -profile "$PROFILE" -no-remote --headless \
    --screenshot "$OUT/$name.png" --window-size="${w},${h}" "$BASE/${name}.html" >/dev/null 2>&1
  printf '  %s.png\n' "$name"
}

echo "Cover and index"
shot 00-cover 1440 900
shot 01-state-index 1440 900

echo "Empty states"
shot empty-state_product-list 1440 900
shot no-results_product-list 1440 900
shot empty-state_customer-list 1440 900
shot no-results_customer-list 1440 900
shot empty-state_price-history 1440 900

echo "Error states"
shot error-field-validation_product-form 1440 900
shot error-summary_product-form 1440 900
shot error-api_product-list 1440 900
shot error-api_customer-form 1440 900
shot error-api_price-history 1440 900

echo "Confirmations"
shot confirm-soft-delete_customer 1440 900
shot confirm-soft-delete_product 1440 900
shot confirm-soft-delete_price-history 1440 900

echo "Blocked deletes"
shot blocked-delete_customer 1440 900
shot blocked-delete_product 1440 900

echo "Phone states"
shot empty-state_product-list_mobile 390 844
shot no-results_customer-list_mobile 390 844
shot confirm-soft-delete_customer_mobile 390 844
shot blocked-delete_product_mobile 390 844

echo "Done."
