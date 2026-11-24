# PH02–PH03 · Add / edit price

**Mockups:** `assets/price-history/ph02-price-add.png`, `ph03-price-edit-errors.png`
**Viewport:** 1440 × 900 desktop, over a dimmed Product detail
**Issue:** #112 (S2-UIX-03); derived from #111 / #96
**Status:** For design review

---

## 1. Purpose and entry

| Screen | Entry | Exit |
| --- | --- | --- |
| PH02 Add price | “Add price” in Price History | Add → history + toast; Cancel/Close → history |
| PH03 Edit price | Row “Edit” in Price History | Save → history + toast; Cancel/Close → history |

The form edits one effective-dated `PRICEHIST` row. The composite key is `(product_id, effective_date)`, so the product is fixed by context and the date is the other key part.

---

## 2. Layout

- Dimmed Product detail behind a 560 px modal.
- Header: “Add price” / “Edit price”, product context (`P-001 · pcs` or `P-001 · 2026-10-01`), Close.
- Body: two-column form grid.
- Footer: Cancel + primary Add/Save.
- Edit shows the effective date disabled (read-only proposal) and the unit price editable.
- PH03 shows the negative-price error state.

---

## 3. Field specification

| Field | Control | DB column | Type / limit | Required | Validation / notes |
| --- | --- | --- | --- | --- | --- |
| Product | Context text | `PRICEHIST.product_id` | `VARCHAR(6)`, FK | Fixed | Not editable in the modal; inherited from the product. |
| Effective date | Date input | `PRICEHIST.effective_date` | `DATE NOT NULL`, composite PK | Yes | Must be unique per product. Create shows an editable date; edit shows it read-only (proposal). |
| Unit price | Number, `step=0.01`, `min=0` | `PRICEHIST.unit_price` | `NUMERIC(10,2)`, CHECK `>= 0` | Yes | Numeric, two decimals, zero or greater. Whether zero means free or invalid is **open**. |
| Status | System | `PRICEHIST.status` | `VARCHAR(8)`, default Active, CHECK Active/Inactive | System | Not an input; set by the create/edit rules. |

---

## 4. Validation and feedback

| Case | Presentation | Source |
| --- | --- | --- |
| Effective date empty | Field message; no submit | #96; DB NOT NULL |
| Duplicate effective date for the product | “A price already exists for this effective date.” — proposed | #96; composite PK |
| Unit price empty | Field message | #96 |
| Unit price non-numeric | Reject; numeric input + server validation | #96; DB NUMERIC |
| Unit price negative | “Unit price must be zero or greater.” — shown in PH03 | DB CHECK |
| Unit price > 2 decimals | Round/reject per implementation; **not specified** | `NUMERIC(10,2)` |
| Add success | Close modal/refresh history; toast ~2.2 s | #96; handoff toast rule |
| Edit success | Close modal/refresh history; toast ~2.2 s | #96; handoff toast rule |
| Server/permission error | Clear message, preserve entered values | #96 |

The error field uses the design-system danger token, red border, `aria-invalid="true"`, and `aria-describedby`.

---

## 5. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | 560 px modal, two-column form. |
| ≤ 860 px | Modal shrinks to available width. |
| ≤ 680 px | Form grid becomes one column; footer stays visible. |
| Phone (~390 px) | Full-screen sheet; fields stack; Add/Save remains visible; date input uses the native picker. |

---

## 6. Role / permission visibility

| Element | Right | Without the right |
| --- | --- | --- |
| Add price form | `PRICE_ADD` | Entry hidden; direct call denied |
| Edit price form | `PRICE_EDIT` | Row action hidden; direct call denied |
| Save (add) | `PRICE_ADD` | Not reachable |
| Save changes (edit) | `PRICE_EDIT` | Not reachable |
| Effective date (edit) | — | Read-only in the proposal; if editable, it must handle a duplicate-date move |
| Delete | `PRICE_DELETE` | Not part of these forms |

---

## 7. Open items (do not invent)

1. Can `effective_date` be edited, or must Edit keep it read-only?
2. Is zero a valid price or an invalid one?
3. Rounding/validation for more than two decimals.
4. Whether Add Price creates an `Active` row automatically.
5. Exact duplicate-date and success-toast strings.
6. Whether the modal closes on success or stays open with a refreshed table.

Sources: Issue #111, #96; `S2-UIX-02-screen-spec.md`; `db/migrations/001_hope_base_structure.sql` (PRICEHIST); `Design System and visual foundation for the Hope, Inc/style.css`.
