# P07 · Product responsive behaviour

**Mockup:** `assets/product/p07-product-mobile.png` (390 × 844)
**Desktop reference:** `assets/product/p01-product-list.png`
**Issue:** #112 (S2-UIX-03); derived from #111 and the S1-UIX-05 fix list
**Status:** For design review

---

## 1. Breakpoint contract

| Width | Layout |
| --- | --- |
| > 860 px | 240 px sidebar open; six-column table; toolbar in one row. |
| ≤ 860 px | Sidebar overlay, starts closed; table may scroll horizontally with a visible cue. |
| ≤ 680 px | Toolbar stacks; search spans; filters and Add product follow. |
| Phone (~390 px) | Product rows become cards; actions stay visible. |

---

## 2. Phone layout (P07)

- 60 px top bar: hamburger, “Product”, role badge.
- Page title 23 px and a one-line description.
- Toolbar grid: search full width; unit and status selects share a row; Add product full width.
- Product cards:
  - Name + status pill.
  - Meta line: ID · unit · current price · effective date.
  - Action row: View, Edit, Price History, Deactivate (Active) or View, Restore, Price History (Inactive).
- Missing price shows “No current price” in the meta line.

---

## 3. Field / content behaviour

| Desktop column | Phone treatment | Notes |
| --- | --- | --- |
| Product ID | Meta line | Keep the ID visible for search/scan. |
| Product | Card title | Tap target for detail. |
| Unit | Meta line | Short code is acceptable. |
| Current price | Meta line | Bold amount + effective date; never `$0.00` for missing. |
| Status | Pill | Text label remains. |
| Actions | Wrapped button row | Do not hide behind horizontal scroll (UM-01). |

---

## 4. Interaction details

- Keep all row actions visible; wrap to a second line rather than clipping.
- Price History opens as a full-screen or near-full-screen sheet on phone (see `../price-history/04-responsive.md`).
- Touch targets should be at least 44 × 44 px; the 32 px buttons in the mockup are a desktop size and need padding on touch.
- Check at 200% zoom for clipped toolbars and mid-word wrapping (FONT-01/FONT-02).
- A tablet may retain the table with a visible horizontal-scroll cue.

---

## 5. Role / permission visibility

Same rules as desktop:

| Action | Right | Without the right |
| --- | --- | --- |
| Add product | `PRODUCT_ADD` | Hidden |
| View | No named View Product right | Undecided |
| Edit | `PRODUCT_EDIT` | Hidden |
| Price History | No named View Price right | Hidden until rule approved |
| Deactivate | `PRODUCT_DELETE` | Hidden |
| Restore | Undefined | Hidden until approved |

Hiding on a card is not authorization; the API must enforce each right.

---

## 6. Open items

1. Cards vs horizontal table on phone.
2. Whether Price History opens as a full-screen sheet or a bottom sheet.
3. Touch-target standard.
4. Whether the unit/status filters collapse behind a “Filters” control.
5. Tablet breakpoint for switching from table to cards.

Sources: `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md` (UM-01, FONT-01, FONT-02, RD-01); `S2-UIX-02-screen-spec.md` (responsive behaviour).
