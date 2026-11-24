# PH04–PH05 · Delete price and restore product

**Mockups:** `assets/price-history/ph04-price-delete.png`, `ph05-product-restore.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #111 / #95–#96
**Status:** For design review

---

## 1. Purpose and states

| ID | Dialog | Trigger | Result |
| --- | --- | --- | --- |
| PH04 | Delete price confirmation | Row “Delete” in Price History | Delete/deactivate the row (semantics open) |
| PH05 | Restore product confirmation | “Restore” on an Inactive product | Product status returns to Active |

Both are destructive or state-changing actions, so both use a confirmation dialog. Delete price uses the danger button; Restore product uses the primary teal button because restoring is not destructive.

---

## 2. Layout

- Dimmed app shell or Product detail behind the dialog.
- Dialog: 460–520 px wide, radius 18 px, 26 px padding, `--shadow-md`.
- PH04: danger icon, title “Delete P-001 price?”, context `$13.75 · effective 2026-10-01`, impact note, Cancel + Delete price.
- PH05: warning icon, title “Restore Safety Gloves XL?”, context `P-004 · pair`, warning that no current price exists, Cancel + Restore product.

---

## 3. Content and data effects

### PH04 Delete price

| Element | Value / effect |
| --- | --- |
| Target | One `PRICEHIST` row: `product_id`, `effective_date` |
| Context | Unit price + effective date |
| Effect (proposed) | Remove or deactivate the row; the next applicable active row becomes current |
| Impact copy | “The next applicable active price will become current if one exists. Sales already recorded keep their historical applicable price.” |
| Child safety | `SALESDETAIL` references Product, and sale totals derive the applicable price from `PRICEHIST`; the UI must not corrupt historical sales expectations |

### PH05 Restore product

| Element | Value / effect |
| --- | --- |
| Target | One `PRODUCT` row |
| Context | Product ID, unit, current status |
| Effect | `PRODUCT.status` `Inactive` → `Active` |
| Warning | Restoring does not create a price; P-004 has no current price |
| Follow-up | An authorized user can add P-004's first effective-dated price through Price History |

There are no editable fields in either dialog.

---

## 4. Validation and feedback

| Case | Behaviour |
| --- | --- |
| Delete current price | Confirm, then recompute current price; if no row qualifies, show “No current price” |
| Delete a historical/future row | Confirm; current price may be unchanged |
| Delete fails (FK/child safety) | Keep the dialog open; show a clear message; **exact copy not specified** |
| Restore an already-active product | Action should not be offered |
| Restore without a price | Allowed; warning shown; do not auto-create a price |
| Permission denied | Do not open; server returns a clear error |
| Success | Close; toast ~2.2 s (“Price deleted” / “Product restored” — proposed) |

---

## 5. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Centered 460–520 px dialog. |
| ≤ 860 px | Dialog remains centered over the overlay. |
| ≤ 680 px | Dialog width `min(100% - 32px, 520px)`; copy wraps; footer actions stay visible. |
| Phone (~390 px) | 16 px side margins; actions wrap if needed; never below the viewport. |

RD-01 requires the action footer to remain visible while content scrolls.

---

## 6. Role / permission visibility

| Action | Right | Without the right |
| --- | --- | --- |
| Delete price | `PRICE_DELETE` | Row action hidden; direct call denied |
| Restore product | **Undefined** (#95 requires restore but no right exists) | Hidden until approved; prototype shows Super Admin |
| Cancel / Close | None | Always available |

Server-side enforcement is mandatory. Hiding the button is not authorization.

---

## 7. Open items (do not invent)

1. Does Delete price hard-delete the row or set `status = 'Inactive'`?
2. Which right authorizes Product Restore — `PRODUCT_DELETE`, a new right, or a manage policy?
3. What happens to sales when the current price is deleted?
4. Exact success and failure strings.
5. Whether deleting the last price is allowed.
6. Whether a restore creates an audit stamp entry.

Sources: Issue #111, #95–#96; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql` (PRODUCT, PRICEHIST, SALESDETAIL); `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md` (RD-01).
