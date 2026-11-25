# [S2-UIX-05] UI Polish Fix List — Customer · Product · Price History

**Re-audit (v2).** Companion to `Usability-Review-v2.md`; the earlier fix list is left unchanged.

| Field | Value |
| --- | --- |
| Issue | [#114](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/114) |
| Audit date | 2026-11-25 |
| Audited ref | `refs/remotes/origin/feature/S2-UIX-05]repo_usability` |
| Commit | `1b561e06287209b039cb62d4489c8a6d605e4669` |
| Screens | 25 approved: C01–C12, P01–P07, PH01–PH06 |
| Result | 0 built · 5 partial (S1 prototype only) · 20 missing |
| Runtime | Not verified (app not run) |

**Severity key:** **High** = core workflow/state missing or misleading, or review blocker · **Medium** = noticeable friction or missing secondary state · **Low** = polish/typography/spacing.

> **Read first.** Rows C-01, P-01, PH-01 and S-01 are the acceptance blockers. Rows C-02 onward describe the only Customer/Product UI in the repository — the S1 static prototype (`Hope, Inc (ui-ux)/`), a browser-storage demo that predates the Sprint 2 mockups. Those rows are an implementation checklist, not failures of a Sprint 2 build (none exists).

---

## A. Sprint 2 blockers

| ID | Module | Screen(s) | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Customer | C01–C12 | No Customer page, component or API exists in the Next app. | List, create/edit, detail, deactivate/blocked/restore, phone cards per `handoff/customer/*` and STATE-SPEC S1–S8. | Build a `customers` route and API from the handoff; add toolbar, panel form, detail card, dialogs, phone cards. | **High** | `web/app` (no `customers` segment); `web/app/api` (no customer route) |
| P-01 | Product | P01–P07 | No Product page, component or API exists in the Next app. | List with unit/current price/status, create/edit, detail, three current-price states, phone cards per `handoff/product/*`. | Build a `products` route and API; derive current price from `PRICEHIST`. | **High** | `web/app` (no `products` segment); `web/app/api` |
| PH-01 | Price History | PH01–PH06 | No Price History modal, table, route or data access exists. | 900 px product-scoped modal, five-column table, current-price strip, sticky footer; phone sheet per `handoff/price-history/*`. | Build the modal and its Add/Edit/Delete flows; wire `PRICE_*` rights. | **High** | `web/app`; `web/components` |
| S-01 | Shared | All | The app shell has no Customer or Product navigation entry; only Dashboard and User Management render. | "Sidebar → Customer / Product" entry per C01/P01; current view highlighted. | Add rights-gated module links to the sidebar; enforce access server-side. | **High** | `web/app/dashboard/page.tsx:58-77` |

---

## B. Customer

| ID | Screen | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- |
| C-02 | C01 | S1 columns are Customer / Email / Phone / Status; email and phone are not in the database. | Customer ID / Name / Address / Payment terms / Status; name links to detail. | Replace the column set with `customer_id`, `customer_name`, `customer_address`, `terms`, `status`. | **High** | `Hope, Inc (ui-ux)/script.js:14` |
| C-03 | C01/C02/C03 | No search, status filter, payment-terms filter, Clear filters or result note. | Search, Active/All/Inactive, terms select, optional Clear filters, Add customer; "Showing 4 active customers." | Add the toolbar and a filtered-results note; show Clear filters only when a filter is active. | **Medium** | `script.js:463-501`; `index.html:176` |
| C-04 | C05/C07 | One-row `auto-fit` form; no back link, header, supporting line, two-column grid, full-width Address, footer divider. Create form is always open instead of triggered by "Add customer". | 860 px panel: back link, header, two-column grid, Address spanning, Save/Cancel footer. | Rebuild the panel; open it from Add customer/Edit instead of rendering it permanently. | **Medium** | `script.js:465-486`; `style.css:485` |
| C-05 | C05/C07 | Status is an editable select. | Status is system-managed: Active on create, changed only by Deactivate/Restore. | Render Status read-only/disabled. | **Medium** | `script.js:14, 468-470` |
| C-06 | C08 | No Customer detail view; name is plain text. | Back link, detail card, name + status pill, definition grid, Edit/Deactivate. | Add a detail view and link the name cell. | **Medium** | `script.js:489-491` |
| C-07 | C05/C07 | No `maxlength` on ID / name / address. | 10 / 100 / 200 characters; server rule still required. | Add matching `maxlength` attributes. | **Low** | `script.js:466-470` |
| C-08 | C01/C05 | View title 24 px vs 30 px; table body 16 px vs 13 px; no soft table-head fill; input padding 10×12 vs 9×16; pills are outline-only. | 30 px/700 title; 13 px table; soft header; 42 px controls at 9×16; tinted status pills. | Align type/spacing/pill styling with the design tokens. | **Low** | `style.css:353-358, 484, 487-489` |

---

## C. Product

| ID | Screen | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- |
| P-02 | P01 | S1 columns are SKU / Product / Price / Stock; no Unit, no effective-dated current price, no "No current price" state. `$0.00` is shown for any zero/missing value. | Product ID / Product / Unit / Current price (amount + effective date) / Status; missing price shows "No current price". | Replace the columns; derive current price from the latest active `PRICEHIST` row ≤ display date. | **High** | `script.js:22-27, 489-491` |
| P-03 | P01 | `hasAction` matches price rights as product rights (`price_add` ends with `_add`), so a user with only Add Price sees Add Product, etc. | Add Product requires `PRODUCT_ADD`; Edit `PRODUCT_EDIT`; Deactivate `PRODUCT_DELETE`; price rights gate only price actions. | Match the exact action key, not a suffix. | **High** | `script.js:466` |
| P-04 | P01/P05 | No "Price History" entry point and no product-scoped price surface; declared price rights are unused. | Row action opens the Price History modal under the approved price-access rule. | Add the entry point and build PH01. | **High** | `script.js:493-495`; `index.html:171-176` |
| P-05 | P01/P02/P06 | No search, unit filter, status filter, Clear filters, result note, or Current/Future/No-current-price state. | Toolbar + filtered results; three explicit price states. | Add the toolbar and current-price state rendering. | **Medium** | `script.js:463-501` |
| P-06 | P03/P04 | Form captures SKU / Product / Price / Stock. No Unit; Price is editable instead of a read-only derived value; no "managed in Price History" note. | Product ID, name, Unit select, Status; current price read-only on edit. | Add the Unit field and read-only current-price display. | **Medium** | `script.js:26, 465-486` |

---

## D. Price History

| ID | Screen | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- |
| PH-02 | PH02/PH03 | No add/edit price form: no effective date, unit price, duplicate-date check or negative/zero validation. | 560 px modal; date + price fields; "Unit price must be zero or greater."; duplicate-date error. | Build the forms with S3/S4 validation and ARIA wiring. | **High** | `script.js` (no price form) |
| PH-03 | PH04/PH05 | No delete-price confirmation and no restore-product confirmation. | PH04 danger dialog with price/date context; PH05 warning dialog noting no current price; Cancel + verb/object confirm. | Add both dialogs with grounded, reversible copy. | **High** | `script.js:418-421` (generic confirm only) |
| PH-04 | PH01/PH06 | No in-modal empty state, no current-price "Not set" treatment, no load-error state. | Empty: "No prices recorded yet" + Add price; missing price: "No current price"; S5 error with Retry. | Add the in-modal S1/S5 variants and the no-current-price strip. | **Medium** | No price view; STATE-SPEC S1/S5 |

---

## E. Cross-module S1 prototype states

| ID | Screen | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- |
| X-01 | C09–C11 · P05/PH05 | Hard delete with "Delete this record? / This cannot be undone." No deactivate, blocked-delete or restore. | Soft deactivate with reversible copy; blocked dialog naming child records; restore confirmation. | Replace the delete flow with status change + S7/S8 dialogs. | **High** | `script.js:418-421, 494` |
| X-02 | C06 · P04 · PH03 | Only native `required`; no field messages, summary, `aria-invalid`/`aria-describedby`, load-error banner, Retry or save-error banner. | S3/S4 field + summary errors, S5 load error with Retry, S6 save error preserving values. | Add error regions, ARIA wiring and retry handling. | **High** | `script.js:467-486` |
| X-03 | C03 · P02 · PH01 | Empty state is the single string "No records yet."; no empty vs no-results distinction. | "No customers/products yet" + create action; "No … match your filters" + Clear filters. | Implement both states with the approved anatomy. | **Medium** | `script.js:488` |
| X-04 | C12 · P07 · PH06 | No phone card layout; table-only with horizontal overflow, so row actions can be off-screen. | ≤680 px stacked cards with visible actions; price sheet for PH06. | Add card layouts and a full-screen price sheet. | **Medium** | `style.css:351-354, 539-549` |

---

## F. Shared design system

| ID | Screen | Issue | Expected (per mockup) | Suggested fix | Severity | File or component |
| --- | --- | --- | --- | --- | --- | --- |
| S-02 | All | Next app body uses Arial/Helvetica; design system uses Avenir Next / Segoe UI / system-ui. Geist is imported but not applied. | `--font` stack from the design system. | Apply the approved stack (or load Avenir/Segoe) on `body`. | **Low** | `web/app/globals.css:43`; `web/app/layout.tsx:2-8` |
| S-03 | All | Feedback/layout tokens used by STATE-SPEC are absent from `globals.css`. | `--color-success(-bg)`, `--color-warning(-bg)`, `--color-danger-bg`, `--shadow-md`, `--control-height`, `--focus-ring`. | Add the missing semantic tokens from the design system. | **Low** | `web/app/globals.css:4-21` |

---

## G. Counts

| Scope | High | Medium | Low | Total |
| --- | --- | --- | --- | --- |
| A. Sprint 2 blockers | 4 | 0 | 0 | 4 |
| B. Customer | 1 | 4 | 2 | 7 |
| C. Product | 3 | 2 | 0 | 5 |
| D. Price History | 2 | 1 | 0 | 3 |
| E. Cross-module states | 2 | 2 | 0 | 4 |
| F. Shared design system | 0 | 0 | 2 | 2 |
| **Total** | **12** | **9** | **4** | **25** |

## H. Suggested order of work

1. Resolve the blockers: build Customer, Product and Price History; add the sidebar entries (C-01, P-01, PH-01, S-01).
2. Resolve the handoff decisions in `Usability-Review-v2.md` §8 before coding the affected fields.
3. Build list + form + detail for Customer and Product (C-02…C-06, P-02…P-06).
4. Build Price History and the derived current-price model (P-02, P-04, PH-02…PH-04).
5. Implement S1–S8 as first-class states (X-01…X-03) and phone layouts (X-04).
6. Capture 1440×900 and 390×844 evidence, then re-run the audit; runtime stays **not verified** until then.
