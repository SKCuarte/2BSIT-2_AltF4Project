# P01–P02 · Product list and no-match state

**Mockups:** `assets/product/p01-product-list.png`, `p02-product-no-match.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #111 / #93
**Status:** For design review

---

## 1. Purpose and entry

The Product list is reached from **Sidebar → Product**. It shows active products by default, their unit, the effective current price, status, and the actions allowed by Product/Price rights.

| ID | State | Demonstrates |
| --- | --- | --- |
| P01 | Product list | Five rows including an inactive product with no current price; current-price column; permission badges |
| P02 | No matches | Empty state with Clear filters |

---

## 2. Layout

- Full app shell: 240 px sidebar, 64 px top bar, role badge.
- Page title “Product” and one-line description.
- Toolbar: search, unit filter, status filter, optional Clear filters, Add product.
- Table card: radius 14 px, soft header, 13 px text, right-aligned action group.
- Current-price column uses a two-line cell: bold amount + small effective date. A missing price uses the warning colour and “No current price”, never `$0.00`.
- Result note and a permission-key strip follow the table.

---

## 3. Field and column specification

### Toolbar

| Control | Type | Options | Required | Notes |
| --- | --- | --- | --- | --- |
| Search | Search input | Product ID or name | No | #93 says search; the exact fields are **open**. |
| Unit filter | Select | `All units`, `pc`, `ea`, `mtr`, `pkg`, `ltr`, `pcs`, `pair`, `can`, `meter` | No | Values from the `PRODUCT.unit` CHECK. |
| Status filter | Select | `Active`, `Inactive`, `All statuses` | No | Inactive exposes Restore. |
| Clear filters | Outline button | Resets all controls | No | Wireframe affordance. |
| Add product | Primary button | Opens the create form | — | Visible only with `PRODUCT_ADD`. |

### Table columns

| Column | Data source | Type / limit | Notes |
| --- | --- | --- | --- |
| Product ID | `PRODUCT.product_id` | `VARCHAR(6)`, PK | Tabular numerals, muted. |
| Product | `PRODUCT.product_name` | `VARCHAR(30)`, nullable | Accent link to detail. |
| Unit | `PRODUCT.unit` | `VARCHAR(10)`, CHECK list | Display the stored short code. |
| Current price | Derived from `PRICEHIST` | `NUMERIC(10,2)` + `DATE` | Latest **active** row with `effective_date ≤` display date. Not a Product column. |
| Status | `PRODUCT.status` | `VARCHAR(8)`, default Active, CHECK Active/Inactive | Pill with text. |
| Actions | — | — | View, Edit, Price History, Deactivate/Restore per rights. |

The Hi-Fi handoff's generic “Price” column is replaced by the effective-dated `PRICEHIST` model. The current price is read-only here and changes only through Price History.

Sorting and pagination are **not specified** for Product and are not shown. Category filtering is **not possible**: #93 mentions category/unit filtering, but migration 001 has `unit` and no category column.

---

## 4. Row actions

| Action | Visible when | Effect | Right |
| --- | --- | --- | --- |
| View | Always (per module access) | Opens product detail | No named View Product right |
| Edit | Active product | Opens edit form | `PRODUCT_EDIT` |
| Price History | Always (per price-history access) | Opens the Price History modal | No named View Price right |
| Deactivate | Active product | Opens deactivate confirmation | `PRODUCT_DELETE` |
| Restore | Inactive product | Opens restore confirmation | Undefined (#95) |

Buttons are hidden, not disabled, without the right. The server must re-check.

---

## 5. States and feedback

| State | Presentation |
| --- | --- |
| Default | Active products; current price and effective date per row. |
| Filtered | Result count reflects filters. |
| No matches | “No products match your filters.” + Clear filters. |
| No products at all | **Not specified.** |
| Missing price | Warning text “No current price” + “Add an effective-date price”. |
| Inactive product | Inactive pill; Restore instead of Deactivate; price history may remain available. |
| Loading / load error | **Not specified.** |
| Success | Bottom-centre toast ~2.2 s (proposed strings). |

---

## 6. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; six-column table. |
| ≤ 860 px | Sidebar overlay; table may scroll horizontally with a cue. |
| ≤ 680 px | Toolbar stacks; search spans; filters and Add product follow. |
| Phone (~390 px) | Product rows become cards; actions stay visible. See `04-responsive.md`. |

---

## 7. Role / permission visibility

| Element | Right | Without the right |
| --- | --- | --- |
| View list / detail | No named View Product right | Undecided; module access proposed |
| Add product | `PRODUCT_ADD` | Hidden |
| Edit | `PRODUCT_EDIT` | Hidden |
| Deactivate | `PRODUCT_DELETE` | Hidden |
| Restore | Undefined | Hidden until approved |
| Price History | No named View Price right | Proposed: any `PRICE_*` right or a new view rule |
| Add price | `PRICE_ADD` | Hidden inside the modal |
| Edit price | `PRICE_EDIT` | Hidden on row |
| Delete price | `PRICE_DELETE` | Hidden on row |

Super Admin implicitly holds all rights in the prototype; Admin grants only held rights. Server-side enforcement is mandatory.

---

## 8. Open items (do not invent)

1. Separate View Product right or module access?
2. Restore authorization.
3. Whether opening Price History requires a separate View Price right.
4. Canonical search fields and filters (category is not in the schema).
5. Pagination/sorting.
6. Missing-price label and whether `$0.00` is valid.
7. Empty/loading/error states.

Sources: Issue #111, #93–#97; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql`; `db/migrations/003_user_management.sql`; `db/seeds/030_rights_catalogue.sql`; `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md`.
