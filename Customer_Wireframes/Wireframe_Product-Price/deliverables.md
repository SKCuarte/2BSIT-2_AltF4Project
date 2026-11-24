# S2-UIX-02 — Deliverable Register

Issue: [#111](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/111), `[S2-UIX-02] Wireframes: product and price history screens`

Prepared: 2026-11-24

Reference policy: all repository reference folders were read only. No repository file was changed, committed, or pushed.

## Issue summary

Issue #111 asks for low/mid-fidelity wireframes for:

- Product list with search and filters
- Product create/edit forms with `unit`
- A current-price indicator
- Price History management table/modal with add/edit/delete controls
- Clear indication that View, Add, Edit, Delete/Restore, and Price History actions are permission-gated

The issue is open. Labels are `UI/UX DESIGNER` and `Sprint 2`; assignee is `marlgembarozo`; milestone due date is 2026-11-24; comments are empty.

## Acceptance criteria

- Wireframes committed for Product list, create/edit forms, current-price indicator, and Price History management table/modal
- Clearly indicates permission-gated action buttons: View, Add, Edit, Delete/Restore, Price History

## Deliverables

### D1 — Product & Price wireframe set

- **Name:** `product-price-wireframes.html`
- **Purpose:** Visual review of Product and Price History screens, states, and permission-gated controls.
- **Acceptance:** Both Issue #111 acceptance criteria.
- **Format/location:** Static HTML at `/home/blck/Documents/Hope, Inc/Wireframe_Product-Price/product-price-wireframes.html`.
- **Sources:** Issue #111 and linked Issues #93–#97/#104; migration 001/002/003; active/current-price verification SQL; Hi-Fi handoff; design-system files; built UI and fix list; existing Product module pattern.
- **Gaps/open items:** View and Restore rights, price-row delete semantics, effective-date editability, current-date versus selected-date behavior, and category/filter naming.

### D2 — Screen specification

- **Name:** `S2-UIX-02-screen-spec.md`
- **Purpose:** Developer/reviewer specification for screen inventory, fields, states, validation, rights, and responsive behavior.
- **Acceptance:** Supports both acceptance criteria.
- **Format/location:** Markdown at `/home/blck/Documents/Hope, Inc/Wireframe_Product-Price/S2-UIX-02-screen-spec.md`.
- **Sources:** Same as D1.
- **Gaps/open items:** Clearly marked where the issue/catalogue does not define a separate right or behavior.

### D3 — Issue snapshot

- **Name:** `issue-111.json`
- **Purpose:** Preserve the exact GitHub issue payload used to derive the wireframes.
- **Acceptance:** Traceability/audit support.
- **Format/location:** JSON at `/home/blck/Documents/Hope, Inc/Wireframe_Product-Price/issue-111.json`.
- **Sources:** `gh issue view 111`.

### D4 — Package README

- **Name:** `README.md`
- **Purpose:** Explain package contents and opening instructions.
- **Acceptance:** Traceability/support.
- **Format/location:** Markdown at `/home/blck/Documents/Hope, Inc/Wireframe_Product-Price/README.md`.

## Source traceability

| Need | Source |
|---|---|
| Product fields and unit CHECK values | `db/migrations/001_hope_base_structure.sql` |
| Sample Product and Price History values | `db/migrations/002_hope_sample_data.sql` |
| Product and Price rights names | `db/migrations/003_user_management.sql`, `db/seeds/030_rights_catalogue.sql` |
| Current-price effective-date resolution | `db/verification/hope_verification.sql` and verification comments |
| Product list columns and action/price controls | `hi-fi_mockup/Hi-Fi_mockup.md`; `Hope, Inc (ui-ux)/script.js` |
| Sidebar, typography, controls, cards, dialogs | Design-system and Hi-Fi files |
| Responsive and footer cautions | `built screens and fix list/S1-UIX-05-Fix-List.md` |
| Filter/search behavior | Issue #93 |
| Unit validation and create/edit feedback | Issue #94 |
| Soft delete/restore | Issue #95 |
| Price CRUD/effective date/duplicate validation | Issue #96 |
| Current-price and per-action rights | Issue #97 |
| Test coverage | Issue #104 |

## Inconsistencies and missing details

1. The Hi-Fi handoff/product prototype uses a generic `Price` column, while the database stores effective-dated `unit_price` rows in `PRICEHIST`.
2. The rights catalogue has Add/Edit/Delete Product and Add/Edit/Delete Price, but no separate View Product or View Price right.
3. Restore is required for Products in Issue #95, but no separate Restore right is catalogued.
4. Issue #93 mentions category/unit filtering, but migration 001 has `unit` and no category column.
5. `product_name` is shown as a likely required field, but migration 001 only sets a length and does not mark it NOT NULL.
6. The database allows `unit_price >= 0`; Issue #96 does not say whether zero means a valid free item or an invalid price.
7. `effective_date` is part of the PRICEHIST composite primary key. It is unclear whether Edit may change it or must add a new row.
8. “Delete price” is not explicitly resolved as physical deletion or Status=Inactive soft deletion.
9. #97 allows current/selected-date display, but no selected-date control is specified as required.
10. P-004 has no active price in the seed and is an important missing-price edge state.

## Open questions

- Is there a separate View Product/View Price right, or does module access imply view?
- Which right or manage policy authorizes Product Restore?
- Does opening Price History require any price right or a separate view rule?
- Can effective dates be edited, or must old rows be replaced?
- Is price deletion physical or soft?
- How does deleting the current price affect sales or the next applicable price?
- Does Add Product create an initial price row or only Price History?
- Is current price always as of today or optionally selected by date?
- Is unit constrained to the catalogued CHECK values, or should a unit lookup exist?
- What search fields and filters are final?

## Definition of Done

Issue #111 requires a single-responsibility PR that uses `Closes #111`, receives peer review, and is merged into `main`. This package was not committed or pushed.
