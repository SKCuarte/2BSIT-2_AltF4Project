# P05–P06 · Product detail and current-price indicator

**Mockups:** `assets/product/p05-product-detail.png`, `p06-product-price-states.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #111 / #97
**Status:** For design review

---

## 1. Purpose and entry

Product detail is opened from the product name link or “View” on the list. It shows product identity, the effective current price, and the actions allowed by Product/Price rights.

P06 is a state board that makes the three current-price outcomes explicit: **Current**, **Future-dated**, and **No current price**.

---

## 2. Layout

- Back link to the product list.
- Product title (30 px/700) and metadata line: ID · unit · status.
- Current-price card: large amount (30 px/800, accent), “Current price · effective …”, and a Current pill.
- Action row: Edit product, Open Price History, Deactivate (or Restore).
- Detail card with a two-column definition grid.
- Muted info note explaining that current price is derived.

P06 uses three state cards in a responsive grid; each card has a title, state pill, value, and explanation.

---

## 3. Field specification

| Display | Data source | Type / limit | Notes |
| --- | --- | --- | --- |
| Product ID | `PRODUCT.product_id` | `VARCHAR(6)`, PK | Read-only. |
| Product name | `PRODUCT.product_name` | `VARCHAR(30)` | Title. |
| Unit | `PRODUCT.unit` | `VARCHAR(10)`, CHECK list | Display short code. |
| Status | `PRODUCT.status` | `VARCHAR(8)`, CHECK Active/Inactive | Pill. |
| Last updated | `PRODUCT.stamp` | `VARCHAR(80)` | Read-only audit text. |
| Current price | Derived from `PRICEHIST` | `NUMERIC(10,2)` | Latest **active** row with `effective_date ≤` display date. |
| Current price effective date | `PRICEHIST.effective_date` | `DATE` | Shown next to the amount. |
| As-of date | Display context | `DATE` | Mockup shows 2026-11-24. A user-selectable date is **open**. |

### Current-price resolution

1. Filter `PRICEHIST` to `product_id = current product` and `status = 'Active'`.
2. Keep rows with `effective_date ≤` the display date.
3. Sort by `effective_date` descending and take the first.
4. If no row qualifies, show **“No current price” / “Not set”** — never `$0.00`.
5. A future-dated row is shown as scheduled/upcoming but is not current until its effective date.

---

## 4. States

| State | Presentation |
| --- | --- |
| Current | Accent amount + Current pill + effective date. |
| Future-dated | Warning/Upcoming pill; amount shown but not labelled Current. The previous price remains current. |
| No current price | Warning text “No current price” / “Not set”; no inferred zero. |
| Multiple active rows | Latest effective date ≤ display date wins. |
| Inactive product | Inactive pill; Price History may remain available to authorized users; Restore instead of Deactivate. |
| Loading / load error | **Not specified.** |

---

## 5. Actions and permissions

| Action | Right | Without the right |
| --- | --- | --- |
| Edit product | `PRODUCT_EDIT` | Hidden |
| Open Price History | No named View Price right; proposed any `PRICE_*` right or a view rule | Hidden until the rule is approved |
| Deactivate | `PRODUCT_DELETE` | Hidden |
| Restore | Undefined (#95) | Hidden until approved |
| View detail | No named View Product right | Undecided; module access proposed |

The detail view must not expose Add/Edit/Delete price controls directly; those live inside Price History under their own rights.

---

## 6. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; price card and definition grid as shown. |
| ≤ 860 px | Sidebar overlay; cards use full width. |
| ≤ 680 px | Definition grid becomes one column; action buttons wrap. |
| Phone (~390 px) | Price card stacks amount and meta; actions wrap; no horizontal scroll. |

---

## 7. Open items (do not invent)

1. Is current price always as of today, or can the user pick a display date? (#97 allows either; no date control is approved.)
2. Is there a separate View Product / View Price right?
3. Does opening Price History require a price right?
4. What label should the no-price state use — “No current price”, “Not set”, or another approved string?
5. Is `$0.00` a valid free item or an invalid price?
6. Should the detail view show a price-history preview or only the current price?

Sources: Issue #111, #97; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql` (PRODUCT, PRICEHIST); `db/verification/hope_verification.sql`; `hi-fi_mockup/Hi-Fi_mockup.md`.
