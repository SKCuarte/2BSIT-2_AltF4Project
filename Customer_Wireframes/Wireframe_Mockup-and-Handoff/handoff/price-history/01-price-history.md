# PH01 · Price History modal

**Mockup:** `assets/price-history/ph01-price-history.png`
**Viewport:** 1440 × 900 desktop, over a dimmed Product detail
**Issue:** #112 (S2-UIX-03); derived from #111 / #96–#97
**Status:** For design review

---

## 1. Purpose and entry

Price History is opened from the Product list or detail. It lists the effective-dated price rows for one product and exposes Add/Edit/Delete price actions under their own rights. The current price is read-only context; it changes only through these rows.

| Element | Value |
| --- | --- |
| Entry | “Price History” on a product row or “Open Price History” on detail |
| Scope | One product (`P-001`) |
| Exit | Close returns to the underlying product screen |

---

## 2. Layout

- Dimmed app shell behind the modal (`rgba(8,20,28,.58)`).
- Modal: 900 px wide, max-height 730 px, radius 18 px, 1 px border, `--shadow-md`.
- Header: “Price History: P-001”, product name + unit, Close button.
- Toolbar: current-price strip (“Current: $13.75 as of 2026-11-24”) and Add price (right).
- Body: scrollable table card with five columns.
- Footer: sticky Close action, always visible while the table scrolls.

The footer requirement comes from the S1-UIX-05 RD-01 finding: the rights dialog's footer disappeared below the fold; this modal deliberately keeps its footer fixed.

---

## 3. Field specification

| Column | Data source | Type / limit | Notes |
| --- | --- | --- | --- |
| Effective date | `PRICEHIST.effective_date` | `DATE NOT NULL`, composite PK part | Sort latest first in the list; display ISO date. |
| Unit price | `PRICEHIST.unit_price` | `NUMERIC(10,2)`, CHECK `>= 0` | Right-aligned, tabular numerals. |
| Status | `PRICEHIST.status` | `VARCHAR(8)`, default Active, CHECK Active/Inactive | UI labels: Current, Historical, Future. These are display labels, not stored values. |
| Last updated | `PRICEHIST.stamp` | `VARCHAR(80) NOT NULL` | Read-only audit text. |
| Actions | — | — | Edit and Delete per rights. |

**Current-price strip:** derived from the same rule as the Product detail — latest active row with `effective_date ≤` display date. It is not an editable field.

**Display labels:**
- `Current` — the row that currently resolves the current price.
- `Historical` — an active or inactive older row; the mockup shows an older active row as Historical.
- `Future` — `effective_date` is after the display date.

The exact mapping of the stored `status` to these labels is **open** (e.g., is an older active row “Historical” or “Active”?). The mockup uses a neutral Historical label for clarity.

---

## 4. Actions and permissions

| Action | Right | Without the right |
| --- | --- | --- |
| Open Price History | No named View Price right; proposed any `PRICE_*` right or a new view rule | Hidden until approved |
| Add price | `PRICE_ADD` | Hidden |
| Edit price | `PRICE_EDIT` | Hidden on each row |
| Delete price | `PRICE_DELETE` | Hidden on each row |
| Close | None | Always available |

The server must re-check each right. Opening the modal is not authorization to read every price row unless the view rule permits it.

---

## 5. States and feedback

| State | Presentation |
| --- | --- |
| Rows exist | Table sorted by effective date, latest first; current row highlighted. |
| No rows | **Not specified.** Propose an empty state inside the modal; do not show a blank table. |
| No current price | Current strip shows “No current price” / “Not set”; rows may still exist (e.g., only future-dated). |
| Duplicate effective date | Rejected by the composite PK; show a field error in Add/Edit. |
| Delete success | Row removed or deactivated (semantics open); toast ~2.2 s. |
| Loading / error | **Not specified.** |
| Modal footer | Fixed; table scrolls internally. |

---

## 6. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | 900 px modal centered; table visible. |
| ≤ 860 px | Modal shrinks to available width; table may scroll horizontally with a cue. |
| ≤ 680 px | Modal becomes near-full-screen; header and footer stay visible; body scrolls. |
| Phone (~390 px) | Full-screen sheet with stacked price cards; Add price remains visible. See `04-responsive.md`. |

---

## 7. Open items (do not invent)

1. Is there a separate View Price right?
2. Does opening Price History require any price right, or only product/module access?
3. Delete semantics — physical delete or `status = 'Inactive'`?
4. Can `effective_date` be edited, or must a new row replace the old one?
5. Exact label mapping for Current / Historical / Future.
6. Empty, loading and error states.
7. Sort order (latest first is shown; not explicitly specified).

Sources: Issue #111, #96–#97; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql` (PRICEHIST); `db/verification/hope_verification.sql`; `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md` (RD-01).
