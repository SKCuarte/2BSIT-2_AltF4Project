# C01–C04 · Customer list, search/filter states

**Mockups:** `assets/customer/c01-customer-list.png`, `c02-customer-filtered.png`, `c03-customer-no-match.png`, `c04-customer-inactive.png`
**Viewport:** 1440 × 900 desktop (full app shell)
**Issue:** #112 (S2-UIX-03); derived from #110 / #90–#92
**Status:** For design review

---

## 1. Purpose and entry

The Customer list is the module landing screen, reached from **Sidebar → Customer**. It shows active customers by default, supports search plus status and payment-terms filters, and exposes the row actions allowed by the viewer's Customer rights. Inactive records stay reachable through the status filter so Restore is possible.

The mockups cover four list states:

| ID | State | What it demonstrates |
| --- | --- | --- |
| C01 | Default Active | Full shell, toolbar, six columns, row actions |
| C02 | Search “acme” + Net 30 | Filters combine; Clear filters appears |
| C03 | No matches | Distinct empty state with Clear filters |
| C04 | Status = Inactive | Restore entry point beside an inactive record |

---

## 2. Layout

- **Shell:** 240 px dark sidebar (`#0f2430`), active Customer pill (`#16798d`), profile block with Log out; 64 px top bar with hamburger, view title and role badge.
- **Content:** max 1200 px, 26 px top and 36 px side padding at desktop.
- **Header:** “Customer” page title (30 px/700) and a one-line description.
- **Toolbar:** search, status filter, payment-terms filter, optional Clear filters, and the Add customer primary button.
- **Table:** one bordered card, radius 14 px, soft header row, 13 px table text, right-aligned action group.
- **Result note:** “Showing 4 active customers.” / “1 result for ‘acme’ with Net 30.” / “Showing 1 inactive customer.”
- **Permission key:** a compact strip under the table names the A/E/D/R badges used inside buttons.

---

## 3. Field and column specification

### Toolbar

| Control | Type | Options / behaviour | Required | Notes |
| --- | --- | --- | --- | --- |
| Search | Search input | Filters by customer name or ID | No | #90 only says “search”; the name/ID target is a proposal. Debounce/minimum characters are **open**. |
| Status filter | Select | `Active` (default), `All statuses`, `Inactive` | No | Inactive is required so soft-deleted records can be restored. |
| Payment-terms filter | Select | `All payment terms`, `Net 15`, `Net 30`, `Net 45`, `COD`, `Prepaid` | No | Values come from the `CUSTOMER.terms` comment; exact approved list is **open** (#86). |
| Clear filters | Outline button | Resets search, status and terms | No | Wireframe affordance; not explicitly specified by #90. |
| Add customer | Primary button | Opens the create form | — | Visible only with `CUSTOMER_ADD`. |

### Table columns

| Column | Data source | Type / limit | Notes |
| --- | --- | --- | --- |
| Customer ID | `CUSTOMER.customer_id` | `VARCHAR(10)`, PK | Tabular numerals, muted. |
| Customer name | `CUSTOMER.customer_name` | `VARCHAR(100)`, `NOT NULL` | Rendered as an accent link to the detail view. |
| Address | `CUSTOMER.customer_address` | `VARCHAR(200)`, nullable | Single line at desktop. |
| Payment terms | `CUSTOMER.terms` | `VARCHAR(20)`, currently nullable | Issue/#91 call the field `payTerms`; the column is `terms`. |
| Status | `CUSTOMER.status` | `VARCHAR(8) NOT NULL DEFAULT 'Active'`, CHECK `Active`/`Inactive` | Pill with text, not colour alone. Active = success; Inactive = danger. |
| Actions | — | — | Edit, Deactivate, or Restore, per right and status. |

The Sprint 1 handoff lists **Name, Email, Phone, Status**, but the database has no email or phone column and the issue requires `payTerms`. The mockups follow the database. The approved column set is **open** (see `../ambiguities.md`, item A1).

Sorting and pagination are **not specified** for Customer and are not shown.

---

## 4. Row actions

| Action | Visible when | Effect | Right |
| --- | --- | --- | --- |
| Edit | Status is Active or Inactive | Opens the edit form | `CUSTOMER_EDIT` |
| Deactivate | Status is Active | Opens the deactivate confirmation | `CUSTOMER_DELETE` |
| Restore | Status is Inactive | Opens the restore confirmation | **Undefined** — #92 says “delete/manage”; do not ship until approved |

Buttons are hidden, not disabled, when the right is absent. The server must re-check every action.

---

## 5. States and feedback

| State | Presentation |
| --- | --- |
| Default | Active customers only; result count visible. |
| Filtered | Result count reflects the active filters; Clear filters is available. |
| No matches | “No customers match your filters.” plus a Clear filters button. |
| No customers at all | **Not specified.** The state matrix in the Sprint 2 spec proposes “No customers yet.” + Add customer; it is not an approved string. |
| Loading | **Not specified.** |
| Load error | **Not specified** beyond the general AC-12 rule (clear message, no sensitive data). |
| Inactive | Inactive pill and Restore action. |
| Success | Bottom-centre toast for ~2.2 s (“Customer deactivated” / “Customer restored” — proposed strings). |

---

## 6. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; six-column table as shown. |
| ≤ 860 px | Sidebar becomes an overlay and starts closed; table may scroll horizontally with a visible cue. |
| ≤ 680 px | Toolbar stacks; search spans the row; filters and Add customer follow. |
| Phone (~390 px) | Table becomes stacked cards. Each card keeps name, status, ID, terms, address and actions visible. See `05-responsive.md`. |

The S1-UIX-05 fix list requires row actions to remain discoverable on phones (UM-01) and the toolbar not to clip at narrow widths (FONT-02).

---

## 7. Role / permission visibility

| Element | Right | Without the right |
| --- | --- | --- |
| Sidebar → Customer | No named Customer view right; module access is proposed | Undecided |
| View list / open detail | No named Customer view right | Undecided |
| Add customer | `CUSTOMER_ADD` | Hidden |
| Edit | `CUSTOMER_EDIT` | Hidden |
| Deactivate | `CUSTOMER_DELETE` | Hidden |
| Restore | Undefined | Hidden until approved |

Super Admin implicitly holds all rights in the prototype. Admin grants only rights the Admin holds. Server-side checks remain mandatory.

---

## 8. Open items (do not invent)

1. Customer view right — does list/detail access require a new right or any Customer right?
2. Restore right — `CUSTOMER_DELETE`, a new right, or a manage rule?
3. Approved column set — database columns vs handoff Name/Email/Phone/Status.
4. `payTerms` vs `terms` naming and whether the column becomes NOT NULL with a CHECK.
5. Search target, debounce, minimum characters.
6. Empty, loading and load-error states.
7. Pagination and sorting.
8. Mobile pattern — cards vs a horizontally scrolling table.

Sources: Issue #110, #90–#92; `S2-UIX-01-screen-spec.md` §3, §6, §7; `db/migrations/001_hope_base_structure.sql`; `Design System and visual foundation for the Hope, Inc/style.css`; `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md`.
