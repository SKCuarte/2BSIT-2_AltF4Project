# Developer Handoff — Customer, Product & Price History

**Issue:** [#112](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/112) — `[S2-UIX-03] Hi-fi mockups and handoff notes`
**Modules:** Customer · Product · Price History
**Mockup source:** `../High-Fidelity-Mockups.pdf` and `../assets/`
**Prepared:** 2026-11-24
**Status:** For design review and developer estimation

This folder contains one note per screen or state group. Each note records the field specification, responsive behaviour, and the role/permission visibility rules for that screen. Anything the issue, linked tickets, database, or approved design system does not define is listed as **open** rather than invented.

---

## 1. How to use this handoff

| Need | Read |
| --- | --- |
| Full mockup deck | `../High-Fidelity-Mockups.pdf` (27 pages: cover, index, 25 screens) |
| One module only | `../Customer-Mockups.pdf`, `../Product-Mockups.pdf`, `../Price-History-Mockups.pdf` |
| Image assets | `../assets/customer/`, `../assets/product/`, `../assets/price-history/` |
| Screen index | `../assets/00-legend.png` |
| Consolidated open items | `ambiguities.md` |
| HTML source of the boards | `../mockups/` (static, no build step) |

The mockups are 1440 × 900 desktop boards and 390 × 844 phone boards. They are static HTML rendered to PNG; no production code, API contract, or SQL change is implied.

---

## 2. Design system applied

The mockups use the tokens in `Design System and visual foundation for the Hope, Inc/style.css` as the source of truth. No new colour, type scale, or radius was introduced.

| Purpose | Token | Value used |
| --- | --- | --- |
| Page background | `--bg` | `#fbfcfd` |
| Surface / cards / tables | `--surface` | `#ffffff` |
| Subtle fill / table head | `--soft` | `#f1f6f8` |
| Body text | `--text` | `#10222e` |
| Secondary text | `--muted` | `#5d7080` |
| Dividers / field borders | `--border` | `#e1e8ed` |
| Primary action / links | `--accent` | `#0e5a6b` |
| Primary hover | `--accent-dark` | `#0a4653` |
| Subtle emphasis | `--accent-light` | `#d9ecf0` |
| Highlight | `--sun` | `#f2a541` |
| Danger / inactive | `--danger` | `#c0392b` |
| Success / active | `--color-success` | `#18794e` |
| Warning / pending | `--color-warning` | `#8a5200` |
| Sidebar | `--sidebar` | `#0f2430` |
| Sidebar active pill | `--sidebar-active` | `#16798d` |

**Typography:** `--font` = Avenir Next, Segoe UI, system-ui, sans-serif. Page title 30 px/700; card title 21–25 px/700; body 16 px/1.55; labels 12.5 px/700; table 13 px; captions 11–12 px.

**Spacing and shape:** controls 42 px high with 9 × 16 px padding; radius 10 px for controls, 14 px for cards/tables, 18 px for dialogs; 20–24 px card padding; 16 px form grid gap. The sidebar is 240 px and the content column is capped at 1200 px.

---

## 3. Cross-screen permission matrix

Right codes are the canonical catalogue entries in `db/migrations/003_user_management.sql` and `db/seeds/030_rights_catalogue.sql`.

### Customer

| UI action | Canonical right | Without the right | Source |
| --- | --- | --- | --- |
| View list / detail | **No named right** | Undecided; #90 assumes a view permission | #90; rights catalogue |
| Add customer | `CUSTOMER_ADD` | Hide the button | #90; catalogue |
| Edit | `CUSTOMER_EDIT` | Hide the row/detail action | #90; catalogue |
| Deactivate | `CUSTOMER_DELETE` | Hide the row/detail action | #90–#92; catalogue |
| Restore | **Undefined** | Do not ship until the rule is approved; prototype shows Super Admin | #92 |

### Product

| UI action | Canonical right | Without the right | Source |
| --- | --- | --- | --- |
| View list / detail | **No named right** | Undecided; module access is the proposed rule | #93; rights catalogue |
| Add product | `PRODUCT_ADD` | Hide “Add product” | #94; catalogue |
| Edit product | `PRODUCT_EDIT` | Hide “Edit” | #94; catalogue |
| Deactivate product | `PRODUCT_DELETE` | Hide “Deactivate” | #95; catalogue |
| Restore product | **Undefined** | Hide until a restore rule is approved | #95 |
| Open Price History | **No named View Price right** | Proposed: any `PRICE_*` right or a new view rule | #96–#97 |
| Add price | `PRICE_ADD` | Hide “Add price” | #96; catalogue |
| Edit price | `PRICE_EDIT` | Hide row “Edit” | #96; catalogue |
| Delete price | `PRICE_DELETE` | Hide row “Delete” | #96; catalogue |

**Role behaviour from the approved handoff:** Super Admin implicitly holds all rights in the prototype. Admin can grant only rights the Admin holds; disabled rights are greyed with a tooltip. Newly registered accounts start with no rights. Every rule above still requires a server-side check; hiding a control is not authorization.

---

## 4. Responsive contract

The breakpoints come from the approved Hi-Fi handoff and are applied consistently.

| Width | Behaviour |
| --- | --- |
| > 860 px | 240 px sidebar open by default; desktop table layout |
| ≤ 860 px | Sidebar becomes an overlay and starts closed; content uses the full width |
| ≤ 680 px | Toolbars stack; two-column forms and detail grids become one column; cards stack |
| Phone (~390 px) | Tables become stacked cards so row actions stay visible; modal tables scroll internally with a visible footer |

The S1-UIX-05 fix list adds three constraints used here: keep row actions visible on phones (UM-01), avoid clipped toolbars and mid-word title wrapping at narrow widths (FONT-01/FONT-02), and keep dialog footers visible while content scrolls (RD-01).

---

## 5. Screen-to-asset map

| ID | Screen | Asset | Note |
| --- | --- | --- | --- |
| C01 | Customer list — default Active | `assets/customer/c01-customer-list.png` | `customer/01-customer-list.md` |
| C02 | Search + payment-terms filter | `assets/customer/c02-customer-filtered.png` | `customer/01-customer-list.md` |
| C03 | No matching customers | `assets/customer/c03-customer-no-match.png` | `customer/01-customer-list.md` |
| C04 | Inactive list — restore entry | `assets/customer/c04-customer-inactive.png` | `customer/01-customer-list.md` |
| C05 | Add customer | `assets/customer/c05-customer-create.png` | `customer/02-create-edit-customer.md` |
| C06 | Add customer — validation | `assets/customer/c06-customer-create-errors.png` | `customer/02-create-edit-customer.md` |
| C07 | Edit customer | `assets/customer/c07-customer-edit.png` | `customer/02-create-edit-customer.md` |
| C08 | Customer detail | `assets/customer/c08-customer-detail.png` | `customer/03-customer-detail.md` |
| C09 | Deactivate confirmation | `assets/customer/c09-customer-deactivate.png` | `customer/04-deactivate-restore.md` |
| C10 | Deactivate blocked | `assets/customer/c10-customer-deactivate-blocked.png` | `customer/04-deactivate-restore.md` |
| C11 | Restore confirmation | `assets/customer/c11-customer-restore.png` | `customer/04-deactivate-restore.md` |
| C12 | Phone customer list | `assets/customer/c12-customer-mobile.png` | `customer/05-responsive.md` |
| P01 | Product list — current prices | `assets/product/p01-product-list.png` | `product/01-product-list.md` |
| P02 | No matching products | `assets/product/p02-product-no-match.png` | `product/01-product-list.md` |
| P03 | Add product | `assets/product/p03-product-create.png` | `product/02-create-edit-product.md` |
| P04 | Edit product — validation | `assets/product/p04-product-edit-errors.png` | `product/02-create-edit-product.md` |
| P05 | Product detail — current price | `assets/product/p05-product-detail.png` | `product/03-product-detail-current-price.md` |
| P06 | Current-price edge states | `assets/product/p06-product-price-states.png` | `product/03-product-detail-current-price.md` |
| P07 | Phone product list | `assets/product/p07-product-mobile.png` | `product/04-responsive.md` |
| PH01 | Price History modal | `assets/price-history/ph01-price-history.png` | `price-history/01-price-history.md` |
| PH02 | Add price | `assets/price-history/ph02-price-add.png` | `price-history/02-add-edit-price.md` |
| PH03 | Edit price — validation | `assets/price-history/ph03-price-edit-errors.png` | `price-history/02-add-edit-price.md` |
| PH04 | Delete price confirmation | `assets/price-history/ph04-price-delete.png` | `price-history/03-delete-price-restore-product.md` |
| PH05 | Restore product confirmation | `assets/price-history/ph05-product-restore.png` | `price-history/03-delete-price-restore-product.md` |
| PH06 | Phone Price History | `assets/price-history/ph06-price-history-mobile.png` | `price-history/04-responsive.md` |

---

## 6. Grounding and limits

Every screen traces to the Sprint 2 issue set and the Sprint 1 references:

- Customer: Issue #110 and linked #90 (list/search/filter/rights), #91 (create/edit/`payTerms`/validation), #92 (soft delete, blocked delete, restore).
- Product and Price: Issue #111 and linked #93 (list/search/filter), #94 (create/edit/`unit`), #95 (soft delete/restore), #96 (price CRUD/effective date/duplicate), #97 (current price and per-action rights).
- Database: `db/migrations/001_hope_base_structure.sql` (CUSTOMER, PRODUCT, PRICEHIST), `002_hope_sample_data.sql` (sample rows), `003_user_management.sql` and `db/seeds/030_rights_catalogue.sql` (rights).
- Visual: `Design System and visual foundation for the Hope, Inc/` (tokens and components), `hi-fi_mockup/Hi-Fi_mockup.md` (shell, type, radii, status tags, toast, dialogs, breakpoints), `built screens and fix list/S1-UIX-05-Fix-List.md` (responsive and accessibility findings).

The mockups deliberately do **not** add: pagination/sorting for Customer or Product, import/export, bulk actions, saved views, category filters (the schema has no category), a dark-theme Customer/Product screen, a date selector for current price, or a restore right that the catalogue does not contain. These remain decisions for the product/design owner.
