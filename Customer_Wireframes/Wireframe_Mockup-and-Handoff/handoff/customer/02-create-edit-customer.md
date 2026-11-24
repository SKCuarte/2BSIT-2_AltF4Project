# C05–C07 · Add / edit customer

**Mockups:** `assets/customer/c05-customer-create.png`, `c06-customer-create-errors.png`, `c07-customer-edit.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #110 / #91
**Status:** For design review

---

## 1. Purpose and entry

| Screen | Entry | Exit |
| --- | --- | --- |
| C05 Add customer | “Add customer” on the list | Save → list + toast; Cancel → list |
| C06 Add customer — validation | Invalid submit from C05 | Stays on the form with field errors |
| C07 Edit customer | Row “Edit” or detail “Edit” | Save → detail/list + toast; Cancel → detail/list |

The create/edit container is an **inline panel** above the list, matching the existing Customer module pattern. A dialog would also match the design system, but the inline panel keeps consistency with the built screen. The container choice is **open** (see `../ambiguities.md`, A12).

---

## 2. Layout

- Back link above the panel (“Back to customer list” / “Back to customer detail”).
- White panel, 1 px border, radius 14 px, 24 px padding, max-width 860 px.
- Panel header: title, supporting line, and a “New record” / Active status pill.
- Two-column form grid (16 px column gap, 18 px row gap); Address spans both columns.
- Footer: primary Save and outline Cancel, separated by a 1 px divider.
- On edit, a second panel below holds the Deactivate action.

---

## 3. Field specification

| Field | Control | DB column | Type / limit | Required | Validation / notes |
| --- | --- | --- | --- | --- | --- |
| Customer ID | Text, `maxlength=10` | `customer_id` | `VARCHAR(10)`, PK | Yes (database) | Create shows manual entry. Edit shows it read-only. Entry vs generation and editability are **open**. |
| Customer name | Text, `maxlength=100` | `customer_name` | `VARCHAR(100)`, `NOT NULL` | Yes | Trim; reject empty. |
| Payment terms | Select | `terms` (issue: `payTerms`) | `VARCHAR(20)` | Pending #86 | Values shown: `Net 15`, `Net 30`, `Net 45`, `COD`, `Prepaid`. Currently nullable; #86 proposes NOT NULL/CHECK. |
| Status | Disabled select | `status` | `VARCHAR(8)`, default `Active`, CHECK `Active`/`Inactive` | System | Always Active on create. Never edited here; changed only by Deactivate/Restore. |
| Address | Text, `maxlength=200` | `customer_address` | `VARCHAR(200)`, nullable | No | Optional; single line. |
| Last updated | Read-only text on detail | `stamp` | `VARCHAR(80)`, `NOT NULL` | System | Not editable; shown on the detail view. |

**Naming:** Issue #110 and #91 use `payTerms`; migration 001 names the column `terms`. The UI label is “Payment terms”. Confirm the final API/column name before implementation.

---

## 4. Validation and feedback

| Case | Presentation | Source |
| --- | --- | --- |
| Required field empty | Message directly under the field; no submit; entered values preserved | #91; AC-13 |
| Customer ID over 10 characters | Prevented by `maxlength`; server-side rule still required | `VARCHAR(10)` |
| Customer name over 100 characters | Prevented by `maxlength` | `VARCHAR(100)` |
| Duplicate Customer ID | “That customer ID is already in use.” — proposed copy, mirroring User Management | Pattern inference, not approved |
| Invalid/empty payment terms | Field-level message; rejected server-side | #86; #91 |
| Create success | Return to list; toast “Customer added” (~2.2 s) | #91; handoff toast rule |
| Edit success | Return to detail/list; toast “Changes saved” | #91; handoff toast rule |
| Server/permission error | Clear message, no sensitive data | AC-12 |

The C06 mockup shows two errors at once: duplicate ID and missing name. Error state uses the design-system danger token, a red field border, `aria-invalid="true"`, and `aria-describedby` pointing at the message.

---

## 5. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; two-column form as shown. |
| ≤ 860 px | Sidebar overlay; panel keeps its max-width and uses available width. |
| ≤ 680 px | Form grid becomes one column; Address keeps full width; footer buttons remain in one row or wrap without clipping. |
| Phone (~390 px) | Single column; 16 px page padding; inputs full width; Save/Cancel stack or wrap; no horizontal page scroll. |

The fix list warns about clipped toolbars and mid-word wrapping at narrow effective widths (FONT-01/FONT-02); the form must be checked at 200% zoom.

---

## 6. Role / permission visibility

| Element | Right | Without the right |
| --- | --- | --- |
| Add customer screen | `CUSTOMER_ADD` | Route/entry hidden; direct navigation denied server-side |
| Edit customer screen | `CUSTOMER_EDIT` | Entry hidden; direct navigation denied |
| Save (create) | `CUSTOMER_ADD` | Not reachable |
| Save changes (edit) | `CUSTOMER_EDIT` | Not reachable |
| Deactivate panel on edit | `CUSTOMER_DELETE` | Hide the panel and action |
| Status field | System-managed | Read-only in all cases |

Hiding the entry is not authorization; the API must enforce the same right on every write.

---

## 7. Open items (do not invent)

1. Customer ID: typed or generated; editable after creation?
2. `payTerms` vs `terms`; required vs nullable; exact CHECK values.
3. Whether create/edit is an inline panel or a dialog (mockup uses inline).
4. Duplicate-ID message and success-toast strings are proposals.
5. Whether Status can ever be set on create other than the database default.
6. Loading/submit-in-progress and server-error presentation.

Sources: Issue #110, #91; `S2-UIX-01-screen-spec.md` §4–§5; `db/migrations/001_hope_base_structure.sql`; `Design System and visual foundation for the Hope, Inc/style.css`; `hi-fi_mockup/Hi-Fi_mockup.md`.
