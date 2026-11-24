# S2-UIX-01 — Customer Screen Specification

**Companion to:** `customer-wireframes.html`
**Issue:** [#110](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/110) — `[S2-UIX-01] Wireframes: customer screens`
**Status of this document:** supporting specification derived from the wireframes and their sources. It is not a new requirement set; every line traces to Issue #110, a linked Sprint 2 ticket, the database, or a Sprint 1 design artifact.

---

## 1. App shell and layout

The Customer screens sit inside the existing Hope, Inc. ERP shell.

| Element | Specification | Source |
| --- | --- | --- |
| Sidebar | 240 px wide, `#0f2430`; text `#dbe7ee`; muted `#8fa6b4`; active item `#16798d` pill; logo, module links, profile block with Log out | Hi-Fi handoff (S1-UIX-04); `Hope, Inc (ui-ux)/style.css`; `built screens and fix list/screenshots/dashboard-desktop.png` |
| Navigation items | Dashboard, Customer, Product, Human Resources, Sales, Reports, User Management (User Management is role-gated) | Hi-Fi handoff; built preview |
| Top bar | Hamburger, current view title, role badge; sticky | Hi-Fi handoff; built preview |
| Content column | max 1200 px, 4% side padding, page background `--bg` | Hi-Fi handoff; built preview |
| Cards / tables | radius 14 px, 1 px border, 20–24 px padding | Hi-Fi handoff; design-system `--radius-lg` |
| Controls | radius 10 px, 42 px control height, 9 × 16 px padding | Design-system `--radius-md`, `--control-height` |
| Dialogs | radius 18 px, dimmed backdrop | Hi-Fi handoff; design-system `--radius-xl` |
| Status tags | pill shape | Hi-Fi handoff |

Breakpoints (Hi-Fi handoff):

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open by default |
| ≤ 860 px | Sidebar becomes an overlay and starts closed |
| ≤ 680 px | Toolbars stack; multi-column cards become one column |
| ≤ 480 px | (Auth name fields stack — not relevant to Customer) |

---

## 2. Screen inventory

| # | Screen | Entry point | Exit / next | Issue coverage |
| --- | --- | --- | --- | --- |
| 01 | Customer list | Sidebar → Customer | Detail, Edit, Add, Deactivate | List + search/filter (AC 1) |
| 02 | Search/filter states | Toolbar on the list | Same list, filtered | Search/filter controls (AC 1) |
| 03 | Create customer | “Add customer” | Save → list + toast; Cancel → list | Create form incl. `payTerms` (AC 1) |
| 03b | Create validation | Invalid submit | Stays on form with field errors | Create form incl. `payTerms` (AC 1); #91 |
| 04 | Edit customer | Row “Edit” or detail “Edit” | Save → detail/list + toast; Cancel | Edit form incl. `payTerms` (AC 1) |
| 05 | Customer detail | Customer name link | Edit, Deactivate, Back | Detail view (issue objective) |
| 06 | Deactivate confirm | “Deactivate” | Confirm → Inactive; Cancel | Soft-delete (AC 1) |
| 06b | Deactivate blocked | Confirm when child records exist | Close; customer stays Active | Soft-delete integrity (#92) |
| 07 | Restore confirm | “Restore” in Inactive view | Confirm → Active; Cancel | Restore (AC 1) |
| 08 | Responsive | Viewport change | — | Layout alignment (AC 2) |
| 09 | State/permission/token notes | Reference | — | Both ACs |

No route paths are specified in the issue; the wireframes are screen-level only.

---

## 3. Customer list

### Toolbar

| Control | Behaviour | Source |
| --- | --- | --- |
| Search input | Filters by customer name or ID | #90 says “working search”; name/ID target is a proposal |
| Status filter | `Active` (default), `All statuses`, `Inactive` | #90 (“active customers” + status filter); restore needs Inactive |
| Payment-terms filter | `All payment terms`, `Net 15`, `Net 30`, `Net 45`, `COD`, `Prepaid` | #90 (“payment-term filtering”); values from the `terms` column comment |
| Clear filters | Resets search, status and terms | Wireframe affordance; not specified |
| Add customer | Opens the create form; rendered only with Add Customer | #90 |

### Table columns

| Column | Database source | Note |
| --- | --- | --- |
| Customer ID | `customer_id` | Primary key |
| Customer name | `customer_name` | Links to the detail view |
| Address | `customer_address` | |
| Payment terms | `terms` | Issue calls it `payTerms` |
| Status | `status` | Active / Inactive pill |
| Actions | — | Edit, Deactivate, Restore (per right and status) |

The Sprint 1 handoff instead lists **Name, Email, Phone, Status**. The database has no email or phone column, and the issue requires `payTerms`, so the wireframe follows the database. This is flagged as an open question, not resolved.

### Row actions

| Action | Visible when | Effect |
| --- | --- | --- |
| Edit | Edit Customer right | Opens the edit form |
| Deactivate | Delete Customer right and status Active | Opens the deactivate confirmation |
| Restore | Status Inactive and the restore right (undefined) | Opens the restore confirmation |

Sorting and pagination are **not** specified for Customer. The wireframe shows neither.

---

## 4. Field specification (create / edit)

| Field | DB column | Type / limit | Required | Control | Notes |
| --- | --- | --- | --- | --- | --- |
| Customer ID | `customer_id` | VARCHAR(10), PK | Yes (database) | Text, maxlength 10 | Entry vs generation, and editability, are undecided |
| Customer name | `customer_name` | VARCHAR(100), NOT NULL | Yes | Text, maxlength 100 | |
| Address | `customer_address` | VARCHAR(200) | No | Text, maxlength 200 | |
| Payment terms | `terms` | VARCHAR(20) | Pending #86 (NOT NULL) | Select | Values: Net 15, Net 30, Net 45, COD, Prepaid (column comment) |
| Status | `status` | VARCHAR(8), default `Active`, CHECK Active/Inactive | System | Read-only pill | Changed only by Deactivate/Restore |
| Last updated | `stamp` | VARCHAR(80), NOT NULL | System | Read-only text | Shown on detail |
| Email | — | — | — | Not included | Handoff column with no database field |
| Phone | — | — | — | Not included | Handoff column with no database field |

**Naming:** Issue #110 and #91 use `payTerms`; migration 001 names the column `terms`. #86 proposes CHECK/NOT NULL constraints for `payTerms`, but no such migration exists in `main` yet. The wireframe labels the control “Payment terms” and notes both names.

---

## 5. Validation and feedback

| Case | Presentation | Source |
| --- | --- | --- |
| Required field empty | Message under the field; no submit; values preserved | #91; Acceptance Criteria AC-13 |
| Customer ID over 10 characters | Prevented by `maxlength`; server-side rule still required | DB VARCHAR(10) |
| Customer name over 100 characters | Prevented by `maxlength` | DB VARCHAR(100) |
| Duplicate Customer ID | “That customer ID is already in use.” | Pattern from AC-11 / User Management copy; not an approved string |
| Invalid or empty payment terms | Field-level message; rejected server-side | #86; #91 |
| Create success | Return to list; toast “Customer added” (2.2 s) | #91; handoff toast rule |
| Edit success | Return to detail/list; toast “Changes saved” | #91; handoff toast rule |
| Deactivate success | Row leaves Active view; toast “Customer deactivated” | #92; handoff toast rule |
| Restore success | Row leaves Inactive view; toast “Customer restored” | #92; handoff toast rule |
| Server/permission error | Clear message, no sensitive data | AC-12 |

Toast placement and duration are taken from the Hi-Fi handoff: bottom centre, disappears after 2.2 seconds. The exact success strings are proposals.

---

## 6. State matrix

| State | Screen | Presentation |
| --- | --- | --- |
| Default list | 01 | Active customers |
| Filtered results | 02a | Result count and active filter values retained |
| No matches | 02b | “No customers match your filters.” + Clear filters |
| No customers at all | 01 | “No customers yet.” + Add customer (if right held) |
| Create success | 03 | Return to list, toast |
| Edit success | 04 | Return to detail/list, toast |
| Validation error | 03b / 04 | Field-level errors, `aria-invalid`, `aria-describedby` |
| Deactivate confirm | 06 | Danger dialog, explicit “can be restored” copy |
| Deactivate blocked | 06b | Warning dialog, only Close |
| Inactive list | 02c | Inactive tag + Restore |
| Restore confirm | 07 | Primary dialog |
| Loading | Any | Not specified |
| Load error | Any | Not specified beyond AC-12 |

---

## 7. Permission matrix

The rights catalogue in `db/migrations/003_user_management.sql` defines Customer as three rights: Add, Edit, Delete Customer.

| Control | Right | Without the right |
| --- | --- | --- |
| Add customer | Add Customer | Hidden |
| Edit | Edit Customer | Hidden |
| Deactivate | Delete Customer | Hidden |
| Restore | Undefined (“delete/manage” in #92) | Undecided |
| View list / detail | Undefined (“Customer view permission” in #90) | Undecided |

Super Admin implicitly holds all rights in the prototype; the server-side check is still required by #90–#92.

---

## 8. Accessibility and interaction notes

| Item | Note | Source |
| --- | --- | --- |
| Focus | 2 px accent outline / `--focus-ring` on inputs, buttons, links | Design system |
| Form errors | `aria-invalid` and `aria-describedby` on the field; message below input | Design system error pattern |
| Table | Real `<table>` with `<th scope="col">` | Design system |
| Dialogs | `role="dialog"`, `aria-modal="true"`, labelled by the title; Esc/backdrop close per handoff | Hi-Fi handoff |
| Status | Text label inside the pill, not colour alone | Handoff status tags |
| Narrow widths | Avoid mid-word title wrapping and clipped toolbars (S1-UIX-05 FONT-01/FONT-02) | Fix list |
| Phone row actions | Keep actions visible instead of hiding them behind horizontal scroll (UM-01) | Fix list |
| Contrast | Use design-system tokens; S1-UIX-05 flagged low-contrast error text and faint field borders | Fix list A11Y-01/A11Y-02 |

---

## 9. Explicitly out of scope

These are not in Issue #110 or its linked tickets, so the wireframes do not define them:

- Customer import/export, bulk actions, or column chooser
- Pagination, sorting, or saved filter views
- Customer–sales drill-down screens
- Audit history beyond the existing `stamp` text
- Dark-theme Customer screens (the design system supports dark mode, but the issue does not ask for a dark wireframe)
- Actual HTML production implementation, API contracts, or SQL changes
