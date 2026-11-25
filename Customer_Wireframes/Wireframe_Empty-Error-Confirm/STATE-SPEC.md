# Standardized UI states — specification

**Issue:** [#113](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/113) — `[S2-UIX-04] Empty, error and confirm-delete states`
**Modules used for the boards:** Customer · Product · Price History
**Mockups:** `Empty-Error-Confirm-States.pdf` (21 pages) and `assets/*.png`
**Prepared:** 2026-11-24
**Status:** For design review

This document defines every state in the deck: what triggers it, the exact message text, the actions available, and whether the pattern is reusable in other modules.

Copy marked **(proposed)** is not defined by the issue, the linked tickets, the database, or the approved design references. It is a grounded proposal that needs sign-off — it is not a requirement. Copy marked **(grounded)** follows an existing approved string or a database/constraint fact.

---

## 1. Design basis

The boards reuse the approved design system without introducing a parallel style:

| Element | Source | Value used |
| --- | --- | --- |
| Surface, page, soft fill | `Design System …/style.css` | `#ffffff`, `#fbfcfd`, `#f1f6f8` |
| Text, muted, border | same | `#10222e`, `#5d7080`, `#e1e8ed` |
| Accent, hover, subtle | same | `#0e5a6b`, `#0a4653`, `#d9ecf0` |
| Success / warning / danger | same | `#18794e`, `#8a5200`, `#c0392b` |
| Tinted backgrounds | same | `#e7f6ee`, `#fff3d6`, `#fdecea`, `#eaf2ff` |
| Type | same | Avenir Next / Segoe UI / system-ui; 12.5–13 px body, 17–21 px titles |
| Shape | same | radius 10 px controls, 14 px cards, 18 px dialogs; `--shadow-md` |
| Controls | same | 42 px height, existing `.btn`, `.input`, `.select`, `.table-card`, `.dialog`, `.pill` |

The only new classes are the four state patterns below (`banner`, `child-table`, `empty-state` variants, `dialog.blocked`). Each is composed from those tokens and primitives; no new colour, type size, radius or shadow was added.

---

## 2. Choosing the right state

| Situation | State | Board |
| --- | --- | --- |
| The module has **no records at all** | S1 Empty table | `empty-state_product-list`, `empty-state_customer-list` |
| Records exist but **the filters exclude them** | S2 No results | `no-results_product-list`, `no-results_customer-list` |
| A submit failed because **fields are invalid** | S3 field errors / S4 summary + field errors | `error-field-validation_product-form`, `error-summary_product-form` |
| A **read** failed (network/server) | S5 load error banner | `error-api_product-list`, `error-api_price-history` |
| A **write** failed (network/server) | S6 save error banner | `error-api_customer-form` |
| A reversible state change needs confirmation | S7 soft-delete confirmation | `confirm-soft-delete_*` |
| The action is **blocked by child records** | S8 delete-blocked warning | `blocked-delete_customer`, `blocked-delete_product` |

**Rule 1 — Empty is not the same as no results.** They differ in cause, message and action:

| | S1 Empty table | S2 No results |
| --- | --- | --- |
| Cause | The dataset is empty | The dataset has rows, filters removed them |
| Title | "No products yet" | "No products match your filters" |
| Body | Explains what will appear | Repeats the active filters |
| Primary action | **Create** the first record (`Add product`) | **Clear the filters** |
| Toolbar | No "Clear filters" (nothing to clear) | "Clear filters" shown |
| Result count | Omitted | "0 results for …" |

Showing the wrong one sends the user to the wrong action: "Add product" when products already exist, or "Clear filters" when there is nothing to clear.

---

## 3. State specifications

### S1 — Empty table (no records)

| | |
| --- | --- |
| **Trigger** | The list request succeeds and returns zero rows **and** no search/filter is active. |
| **Boards** | `empty-state_product-list.png`, `empty-state_customer-list.png`, `empty-state_price-history.png` (in-modal variant), `empty-state_product-list_mobile.png` |
| **Anatomy** | Card or modal body → 54 px neutral icon circle → title (17 px/700) → body (12.5 px muted, max 380 px) → primary button |
| **Title** | "No products yet" / "No customers yet" / "No prices recorded yet" **(proposed)** |
| **Body** | Product: "Products you add will appear here with their unit and effective current price." · Customer: "Customers you add will appear here with their payment terms and status." · Price: "This product has no effective-dated price. Add the first one so sales can use it." **(proposed)** |
| **Action** | `Add product` / `Add customer` / `Add price` — primary, opens the create flow. Hidden when the viewer lacks `PRODUCT_ADD` / `CUSTOMER_ADD` / `PRICE_ADD`. |
| **Icon** | Neutral `box` glyph. Never a warning or danger colour — an empty dataset is not an error. |
| **Reusable** | **Yes.** Any list or table. Change only the noun and the create action. The in-modal variant removes the border and background so it sits inside a dialog. |

### S2 — No search results

| | |
| --- | --- |
| **Trigger** | The list request succeeds but the active search and/or filters match zero rows. |
| **Boards** | `no-results_product-list.png`, `no-results_customer-list.png`, `no-results_customer-list_mobile.png` |
| **Anatomy** | Same card as S1; icon is `search-off` |
| **Title** | "No products match your filters" / "No customers match your filters" **(grounded pattern)** — mirrors the approved "No accounts match your filters." |
| **Body** | Repeats the active filters so the user can see what excluded everything: "Nothing matches “acme” with Net 45 payment terms." **(proposed)** |
| **Actions** | `Clear filters` (outline) in both the toolbar and the empty state. The primary create action stays in the toolbar but is not repeated in the state. |
| **Result note** | "0 results for “acme” with Net 45." below the state. |
| **Reusable** | **Yes.** Any searchable or filterable list. If the module has no filters, S2 does not apply. |

### S3 — Field-level validation

| | |
| --- | --- |
| **Trigger** | Submit fails client- or server-side validation. |
| **Board** | `error-field-validation_product-form.png` |
| **Anatomy** | Field keeps its label → control with danger border and 3 px danger ring → message directly below in 11.5 px/600 danger text. |
| **Messages** | "Product ID is required." · "Product name is required." · "Choose a unit of measure." **(proposed)** |
| **Actions** | No state-level action. The user corrects the field and re-submits with the existing `Save` button. Entered values are preserved. |
| **Ordering** | Errors appear in the same order as the fields. The first invalid field receives focus on submit. |
| **Reusable** | **Yes.** Every form. Message = `{Field} is required.` or a specific rule message. |

### S4 — Summary + field validation

| | |
| --- | --- |
| **Trigger** | Submit fails validation **and** more than one field is invalid, or the invalid field may be out of view (long form, modal, scrolled panel). |
| **Board** | `error-summary_product-form.png` |
| **Anatomy** | Danger banner at the top of the form → title, one-line explanation, list of jump links → then the S3 field errors remain visible. |
| **Banner title** | "Check 3 fields before saving." **(proposed)** — count is dynamic |
| **Banner body** | "The form was not saved. Jump to the first field that needs attention." **(proposed)** |
| **Banner list** | Each invalid field as an in-page link with its reason: "Product ID — required". |
| **Actions** | Links move focus to the field. `Save` remains the submit action. No extra button. |
| **Rule** | S4 never replaces S3. The summary is additive; a field must still carry its own message. |
| **Reusable** | **Yes.** Any form with 2+ invalid fields. Single-field failures use S3 only. |

### S5 — Load error (API / server)

| | |
| --- | --- |
| **Trigger** | A read request fails: network error, timeout, 5xx, or an unhandled server error. |
| **Boards** | `error-api_product-list.png`, `error-api_price-history.png` |
| **Anatomy** | Danger banner (`role="alert"`) with icon, bold title, one-line cause, right-aligned `Retry`. The data region shows a neutral "unavailable" placeholder rather than stale rows. |
| **Title** | "We couldn’t load products." / "We couldn’t load price history." **(proposed)** |
| **Body** | "The server didn’t respond. Nothing was changed — try again in a moment." **(proposed)** |
| **Actions** | `Retry` re-issues the read. Toolbar stays usable so the user can change filters and re-query. |
| **Do not** | Show an empty state for a failed read — "No products yet" would be a false statement. |
| **Reusable** | **Yes.** Every list, table and modal that loads data. |

### S6 — Save error (API / server)

| | |
| --- | --- |
| **Trigger** | A create/update/delete request fails after the form was valid: network, timeout, 5xx, or a conflict the client cannot resolve. |
| **Board** | `error-api_customer-form.png` |
| **Anatomy** | Danger banner at the top of the form panel, above the fields. The form keeps every entered value. |
| **Title** | "We couldn’t save this customer." **(proposed)** |
| **Body** | "Your entries are still here. Check your connection, then save again." **(proposed)** |
| **Actions** | No new button — the existing `Save changes` is the retry. `Cancel` still discards. |
| **Rule** | If the failure is a field problem (duplicate ID, invalid value), use S3/S4 instead of S6. S6 is only for failures the user cannot fix by editing a field. |
| **Reusable** | **Yes.** Any form submit. Swap the noun: "We couldn’t save this product." |

### S7 — Soft-delete confirmation

| | |
| --- | --- |
| **Trigger** | The user chooses a state-changing action that hides a record but keeps it recoverable: Deactivate customer, Deactivate product, Delete price row. |
| **Boards** | `confirm-soft-delete_customer.png`, `confirm-soft-delete_product.png`, `confirm-soft-delete_price-history.png`, `confirm-soft-delete_customer_mobile.png` |
| **Anatomy** | Backdrop `rgba(8,20,28,.58)` → 460–520 px dialog, radius 18 px → danger icon → question title → consequence copy → optional inset note → `Cancel` + danger confirm. |
| **Title** | "Deactivate Acme Corporation?" · "Deactivate Industrial Widget A?" · "Delete this price?" **(proposed)** |
| **Consequence copy** | Customer: "The customer will be marked Inactive and hidden from the active list. The record and its sales history are kept, and it can be restored later." Product: "The product will be marked Inactive and hidden from the active list. Its price history is kept, and it can be restored later." Price: "The entry will be removed from this product’s price history. The next applicable price becomes current if one exists." **(proposed)** |
| **Inset note** | "Existing sales records are not changed." / "Existing sales lines and prices are not changed." |
| **Confirm button** | Verb + object: `Deactivate customer`, `Deactivate product`, `Delete price`. Never a bare "OK". |
| **Rule** | Copy must describe the **reversible** outcome. The approved hard-delete string "The account is removed permanently." must **not** be reused here. |
| **Reusable** | **Yes.** Every soft delete or deactivation. Keep the verb/object pattern. |

### S8 — Delete blocked by child records

| | |
| --- | --- |
| **Trigger** | The action would violate a child reference. Grounded in the `ON DELETE RESTRICT` relationships: `SALES → CUSTOMER`, `SALESDETAIL → PRODUCT`, `PRICEHIST → PRODUCT`. The DBA verification script (`db/verification/child_delete_checks_verification.sql`, S2-DBA-04) confirms C-001 and P-001 are blocked. |
| **Boards** | `blocked-delete_customer.png`, `blocked-delete_product.png`, `blocked-delete_product_mobile.png` |
| **Anatomy** | Warning-toned dialog (600 px desktop) → warning icon → "X can’t be deactivated" → count summary → **child-record table** → "no data changed" note → `Close`. |
| **Title** | "Acme Corporation can’t be deactivated" / "Industrial Widget A can’t be deactivated" **(proposed)** |
| **Summary** | "1 sales record uses this customer. Resolve or reassign it before deactivating." · "3 records depend on this product: 2 sales lines and 1 price entry." **(proposed)** |
| **Child table** | Columns `Record · Reference · Date · Detail`. Customer shows the sale `T-001 · 2026-10-01 · Active`. Product shows `T-001 Qty 10`, `T-003 Qty 20`, and the `2026-10-01 · $13.75` price entry. Rows come from the live child query, not from hard-coded copy. |
| **Actions** | `Close` only. There is no "force delete" — a blocked action cannot be overridden from this dialog. |
| **Naming rule** | The dialog **must name the blocking records**. A generic "This record is in use." is not sufficient for #113. |
| **Empty case** | If the child query returns zero rows, do not show S8 — proceed to S7. The two states are mutually exclusive. |
| **Reusable** | **Yes.** Any parent/child delete. The table columns adapt; the count summary and the "no data changed" note stay. |

---

## 4. Message text register

| ID | String | Status |
| --- | --- | --- |
| M1 | "No products yet" / "No customers yet" / "No prices recorded yet" | proposed |
| M2 | "Products you add will appear here with their unit and effective current price." | proposed |
| M3 | "Customers you add will appear here with their payment terms and status." | proposed |
| M4 | "No products match your filters" / "No customers match your filters" | grounded pattern ("No accounts match your filters.") |
| M5 | "Nothing matches “{term}” with {filters}." | proposed |
| M6 | "{Field} is required." / "Choose a unit of measure." | proposed |
| M7 | "Check {n} fields before saving." | proposed |
| M8 | "The form was not saved. Jump to the first field that needs attention." | proposed |
| M9 | "We couldn’t load {module}." / "The server didn’t respond. Nothing was changed — try again in a moment." | proposed |
| M10 | "We couldn’t save this {record}." / "Your entries are still here. Check your connection, then save again." | proposed |
| M11 | "Deactivate {name}?" / "Delete this price?" | proposed |
| M12 | "{Name} can’t be deactivated" / "{n} records depend on this product…" | proposed |
| M13 | "The customer stays Active. No data was changed." | proposed |
| M14 | "Existing sales records are not changed." | proposed |

---

## 5. Cross-state rules

1. **Permission gating.** Every action in a state obeys the same right as the underlying screen: `CUSTOMER_ADD/EDIT/DELETE`, `PRODUCT_ADD/EDIT/DELETE`, `PRICE_ADD/EDIT/DELETE`. If the right is absent, hide the action — never show a state that offers an action the user cannot perform. Hiding is not authorization; the API must re-check.
2. **One state per region.** An empty state, a load error and a populated table are mutually exclusive in the same data region. Never stack them.
3. **Announcement.** Banners use `role="alert"`; a failed save moves focus to the banner title. Field errors use `aria-invalid="true"` and `aria-describedby` pointing at the message. Dialog titles are labelled with `aria-labelledby`.
4. **Focus management.** Dialogs trap focus, start on the first control (or the title for read-only dialogs), and return focus to the triggering button on close.
5. **Success feedback.** These states never replace the toast. A successful action closes the dialog and shows the approved bottom-centre toast for ~2.2 s.
6. **No colour-only meaning.** Every state carries text and an icon, not just a red border.
7. **Reversibility.** Soft-delete copy must state that the record is kept and can be restored; hard-delete copy must not be reused.

---

## 6. Reusability matrix

| Pattern | Customer | Product | Price History | User Management | Sales | HR |
| --- | --- | --- | --- | --- | --- | --- |
| S1 Empty table | yes | yes | yes (modal) | yes | yes | yes |
| S2 No results | yes | yes | n/a — no filters | yes | yes | yes |
| S3 Field errors | yes | yes | yes | yes | yes | yes |
| S4 Summary + fields | yes | yes | yes | yes | yes | yes |
| S5 Load error | yes | yes | yes | yes | yes | yes |
| S6 Save error | yes | yes | yes | yes | yes | yes |
| S7 Soft-delete confirm | yes | yes | yes | block/unblock differs | yes | yes |
| S8 Blocked delete | yes | yes | n/a — no children | n/a | yes (sale → details) | yes (job/department) |

`n/a` entries are grounded in the schema: `PRICEHIST` has no child tables, so a price row cannot be blocked by children. User Management uses block/unblock rather than soft delete.

---

## 7. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Full shell; dialogs 460–600 px centred; banners inline with content width |
| ≤ 860 px | Sidebar overlay; dialogs stay centred; banner action wraps under the copy if needed |
| ≤ 680 px | Form grids become one column; summary banner list wraps; dialog width `min(100% - 32px, 600px)` |
| Phone ~390 px | States stack; empty state min-height 300 px; dialogs 16 px side margins; the child table scrolls internally rather than pushing `Close` off-screen |

The S1-UIX-05 fix list requires dialog footers to stay visible while content scrolls (RD-01) and row actions to remain discoverable on phones (UM-01); both are applied here.

---

## 8. Open items (do not invent)

1. **Copy approval** — M1–M14 are proposals except M4's pattern. The issue does not define strings.
2. **Empty-state icon set** — the deck uses a box and a search-off glyph; the design system has no icon library defined.
3. **Soft delete vs hard delete** — the schema uses `status` for soft delete but `ON DELETE RESTRICT` only guards hard deletes. #113 asks for a "delete-blocked" warning; whether the app blocks soft delete when children exist, or only hard delete, is undefined. The mockups assume the #92/#95 rule: deactivation is blocked when children exist.
4. **Blocked-dialog rows** — the exact child query, count wording and whether rows link to the child record are unspecified.
5. **Price-row delete semantics** — hard delete vs `status = 'Inactive'`; the confirmation copy avoids claiming either.
6. **Retry behaviour** — whether `Retry` re-issues automatically or requires a page reload is an implementation choice.
7. **Error code display** — no source says whether to show a correlation/error ID.
8. **Summary threshold** — "more than one invalid field" is a proposal; the approved references do not define when a summary appears.
9. **Empty vs no-results when filters are default** — if a default filter is always applied (for example `status = Active`), "no records at all" may be unreachable without changing the filter. Needs a product decision.
10. **Dark theme** — the design system supports it; these states are drawn light-theme only.

---

## 9. Asset map

| State | Desktop asset | Phone asset |
| --- | --- | --- |
| S1 empty — Product | `empty-state_product-list.png` | `empty-state_product-list_mobile.png` |
| S1 empty — Customer | `empty-state_customer-list.png` | — |
| S1 empty — Price History | `empty-state_price-history.png` | — |
| S2 no results — Product | `no-results_product-list.png` | — |
| S2 no results — Customer | `no-results_customer-list.png` | `no-results_customer-list_mobile.png` |
| S3 field errors | `error-field-validation_product-form.png` | — |
| S4 summary + fields | `error-summary_product-form.png` | — |
| S5 load error — list | `error-api_product-list.png` | — |
| S5 load error — modal | `error-api_price-history.png` | — |
| S6 save error | `error-api_customer-form.png` | — |
| S7 confirm — Customer | `confirm-soft-delete_customer.png` | `confirm-soft-delete_customer_mobile.png` |
| S7 confirm — Product | `confirm-soft-delete_product.png` | — |
| S7 confirm — Price | `confirm-soft-delete_price-history.png` | — |
| S8 blocked — Customer | `blocked-delete_customer.png` | — |
| S8 blocked — Product | `blocked-delete_product.png` | `blocked-delete_product_mobile.png` |
