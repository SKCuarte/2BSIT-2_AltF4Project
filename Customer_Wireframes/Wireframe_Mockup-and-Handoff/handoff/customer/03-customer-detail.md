# C08 · Customer detail

**Mockup:** `assets/customer/c08-customer-detail.png`
**Viewport:** 1440 × 900 desktop
**Issue:** #112 (S2-UIX-03); derived from #110 (objective)
**Status:** For design review

---

## 1. Purpose and entry

Read-only record view opened from the customer name link in the list. It exposes the two actions that make sense from here — Edit and Deactivate — subject to the viewer's rights.

The detail view is named in the Issue #110 objective but is not in its acceptance-criteria checklist. No Sprint 1 reference defines a Customer detail design, so this is a minimal, database-grounded view. Detail contents are **open** (see `../ambiguities.md`, A5).

---

## 2. Layout

- Back link (“Back to customer list”).
- White detail card, 1 px border, radius 14 px, 24 px padding, max-width 940 px.
- Header row: customer name (25 px/700), status pill, right-aligned Edit and Deactivate buttons.
- Two-column definition grid with a top border; each item has a small uppercase label and a value.
- A muted info note below the card explains that related records are not shown.

---

## 3. Field specification

| Display | Data source | Type / limit | Notes |
| --- | --- | --- | --- |
| Customer name | `CUSTOMER.customer_name` | `VARCHAR(100) NOT NULL` | Card title. |
| Status | `CUSTOMER.status` | `VARCHAR(8)`, CHECK `Active`/`Inactive` | Pill; text label, not colour alone. |
| Customer ID | `CUSTOMER.customer_id` | `VARCHAR(10)`, PK | Read-only. |
| Payment terms | `CUSTOMER.terms` | `VARCHAR(20)` | Display value; issue calls it `payTerms`. |
| Address | `CUSTOMER.customer_address` | `VARCHAR(200)` | Optional; render “—” if empty (proposed). |
| Last updated | `CUSTOMER.stamp` | `VARCHAR(80) NOT NULL` | Read-only audit text such as “EDITED user1 2026-10-13 1:01 PM”. |

No email or phone is shown because the database has no such columns. The handoff's Name/Email/Phone/Status set would require schema work; that conflict is **open**.

---

## 4. States and actions

| State | Presentation |
| --- | --- |
| Active customer | Active pill; Edit + Deactivate available per rights. |
| Inactive customer | Inactive pill; Edit + Restore available per rights. The mockup only shows Active; the inactive variant follows C04. |
| Deactivate blocked | Deactivate opens the blocked dialog when related sales exist (C10). |
| Missing optional value | Proposed em dash “—”; **not specified** by the references. |
| Loading / load error | **Not specified.** |

| Action | Right | Without the right |
| --- | --- | --- |
| Edit | `CUSTOMER_EDIT` | Hidden |
| Deactivate | `CUSTOMER_DELETE` | Hidden |
| Restore | Undefined (#92) | Hidden until approved |
| View detail | No named Customer view right | Undecided |

---

## 5. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Sidebar open; two-column definition grid. |
| ≤ 860 px | Sidebar overlay; card uses full content width. |
| ≤ 680 px | Definition grid becomes one column; header actions wrap below the title without clipping. |
| Phone (~390 px) | Single column; actions remain visible; long address wraps at word boundaries. |

---

## 6. Role / permission visibility

The detail screen inherits the list rules. The server must check the right for each action, not only hide the button. If a Customer view right is later approved, the route must enforce it as well.

---

## 7. Open items (do not invent)

1. What belongs on the detail screen; should it list related sales?
2. Should the blocked-deactivation dialog list the blocking records or link to them?
3. Empty-value presentation (dash vs blank).
4. Whether an inactive detail view shows Restore in the header.
5. Customer view permission.
6. Loading and error states.

Sources: Issue #110; `S2-UIX-01-screen-spec.md` §5, §7; `db/migrations/001_hope_base_structure.sql`; `hi-fi_mockup/Hi-Fi_mockup.md`.
