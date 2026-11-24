# P03–P04 · Add / edit product

**Mockups:** `assets/product/p03-product-create.png`, `p04-product-edit-errors.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #111 / #94
**Status:** For design review

---

## 1. Purpose and entry

| Screen | Entry | Exit |
| --- | --- | --- |
| P03 Add product | “Add product” on the list | Save → list + toast; Cancel → list |
| P04 Edit product | “Edit” on a row or detail | Save → detail/list + toast; Cancel → detail/list |

The form edits **Product identity only**. Current price is not entered here; it is a derived value changed through Price History.

---

## 2. Layout

- Back link above the panel.
- White panel, 1 px border, radius 14 px, 24 px padding, max-width 860 px.
- Header: “Add product” / “Edit product”, supporting line, and a “New record” or Active pill.
- Two-column grid: Product ID, Product name, Unit, and Status (create) or Current price (edit).
- Footer: primary Save + outline Cancel.
- Create shows a note that price is not entered here; edit shows the current price as read-only.

---

## 3. Field specification

| Field | Control | DB column | Type / limit | Required | Validation / notes |
| --- | --- | --- | --- | --- | --- |
| Product ID | Text, `maxlength=6` | `product_id` | `VARCHAR(6)`, PK | Yes (database) | Create shows manual entry; edit is read-only. Entry/generation and editability are **open**. |
| Product name | Text, `maxlength=30` | `product_name` | `VARCHAR(30)`, nullable in DB | Proposed required | Migration 001 does not mark it NOT NULL; the UI proposal marks it required. Confirm. |
| Unit | Select | `unit` | `VARCHAR(10)`, CHECK `pc`, `ea`, `mtr`, `pkg`, `ltr`, `pcs`, `pair`, `can`, `meter` | Yes (proposed) | Reject any value outside the CHECK list. |
| Status | Disabled select | `status` | `VARCHAR(8)`, default Active, CHECK Active/Inactive | System | Active on create; never edited here. |
| Current price | Read-only display | Derived from `PRICEHIST` | `NUMERIC(10,2)` + `DATE` | — | Edit only. Shows amount and effective date. |
| Last updated | Read-only text | `stamp` | `VARCHAR(80)`, NOT NULL | System | Not shown on this form; available on detail. |

The P04 mockup shows the Unit error state: red border, `aria-invalid`, and “Unit is required and must be a valid unit of measure.” The current price remains read-only at `$13.75 · effective 2026-10-01`.

---

## 4. Validation and feedback

| Case | Presentation | Source |
| --- | --- | --- |
| Required Product ID empty | Field message; no submit; values preserved | #94; DB PK |
| Product ID over 6 characters | Prevented by `maxlength`; server rule still required | `VARCHAR(6)` |
| Product name over 30 characters | Prevented by `maxlength` | `VARCHAR(30)` |
| Unit missing/invalid | Field message; reject outside CHECK list | #94; DB CHECK |
| Duplicate Product ID | Proposed: “That product ID is already in use.” | Pattern inference, not approved |
| Create success | Return to list; toast “Product added” (~2.2 s) | #94; handoff toast rule |
| Edit success | Return to detail/list; toast “Changes saved” | #94; handoff toast rule |
| Server/permission error | Clear message, no sensitive data | AC-12 pattern |

Error fields use the design-system danger token, `aria-invalid="true"`, and `aria-describedby`.

---

## 5. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; two-column form. |
| ≤ 860 px | Sidebar overlay; panel uses available width. |
| ≤ 680 px | Form grid becomes one column; footer actions remain visible. |
| Phone (~390 px) | Single column; full-width inputs; no horizontal page scroll; check at 200% zoom. |

---

## 6. Role / permission visibility

| Element | Right | Without the right |
| --- | --- | --- |
| Add product screen | `PRODUCT_ADD` | Entry hidden; direct navigation denied |
| Edit product screen | `PRODUCT_EDIT` | Entry hidden; direct navigation denied |
| Save (create) | `PRODUCT_ADD` | Not reachable |
| Save changes (edit) | `PRODUCT_EDIT` | Not reachable |
| Current price display | No price right required to read | Read-only; do not expose Add/Edit price controls here |
| Status field | System-managed | Read-only |

Server-side enforcement is mandatory for both writes.

---

## 7. Open items (do not invent)

1. Product ID: typed or generated; editable after creation?
2. Is `product_name` required? The DB allows NULL.
3. Is Unit required in the API, or only in the UI proposal?
4. Does Add Product create the first price row, or is Price History the only price workflow?
5. Duplicate-ID and success-toast strings.
6. Whether the form is a panel or dialog.

Sources: Issue #111, #94; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql`; `Design System and visual foundation for the Hope, Inc/style.css`; `hi-fi_mockup/Hi-Fi_mockup.md`.
