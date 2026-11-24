# PH06 · Price History responsive behaviour

**Mockup:** `assets/price-history/ph06-price-history-mobile.png` (390 × 844)
**Desktop reference:** `assets/price-history/ph01-price-history.png`
**Issue:** #112 (S2-UIX-03); derived from #111 and the S1-UIX-05 fix list
**Status:** For design review

---

## 1. Breakpoint contract

| Width | Layout |
| --- | --- |
| > 860 px | 900 px modal over the product screen; table with five columns. |
| ≤ 860 px | Modal shrinks; table may scroll horizontally with a visible cue. |
| ≤ 680 px | Modal becomes near-full-screen; header and footer stay visible; body scrolls. |
| Phone (~390 px) | Full-screen sheet; price rows become stacked cards; Add price remains visible. |

---

## 2. Phone layout (PH06)

- 60 px top bar: hamburger, “Price History”, role badge.
- Product context title (`P-001 · Industrial Widget A`) and “pcs · current $13.75”.
- Full-width Add price button.
- Price cards:
  - Effective date as the card title; state pill (Current / Historical / Future).
  - Unit price in bold.
  - Audit stamp line.
  - Edit + Delete actions in a wrapped row.
- The sheet keeps Add price at the top and does not require horizontal scrolling.

---

## 3. Field / content behaviour

| Desktop column | Phone treatment | Notes |
| --- | --- | --- |
| Effective date | Card title | ISO date is readable; a localized format is **open**. |
| Unit price | Bold meta value | Tabular numerals. |
| Status | Pill | Current / Historical / Future labels remain text. |
| Last updated | Meta line | May truncate with a full value on detail; do not hide it entirely. |
| Actions | Wrapped row | Edit + Delete visible; no hidden swipe actions. |

---

## 4. Interaction details

- The sheet header and Add price action stay visible while the card list scrolls.
- Edit/Delete open the same small dialogs as desktop, sized to the phone width.
- A native date picker is used for Add/Edit price on touch devices.
- Touch targets should be at least 44 × 44 px; the 32 px mockup buttons need padding on touch.
- Check at 200% zoom for clipped text and horizontal overflow (FONT-01/FONT-02).
- Keep the modal footer/action area visible (RD-01).

---

## 5. Role / permission visibility

Same rules as desktop:

| Action | Right | Without the right |
| --- | --- | --- |
| Open Price History | No named View Price right | Hidden until rule approved |
| Add price | `PRICE_ADD` | Button hidden |
| Edit price | `PRICE_EDIT` | Row action hidden |
| Delete price | `PRICE_DELETE` | Row action hidden |

Hiding an action is not authorization; the API must enforce each right.

---

## 6. Open items

1. Full-screen sheet vs bottom sheet.
2. Localized vs ISO date display.
3. Touch-target standard.
4. Whether the audit stamp is fully visible or truncated on phone.
5. Whether the sheet is dismissible by swipe/back and how unsaved Add/Edit state is handled.

Sources: `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md` (UM-01, FONT-01, FONT-02, RD-01); `S2-UIX-02-screen-spec.md` (responsive behaviour).
