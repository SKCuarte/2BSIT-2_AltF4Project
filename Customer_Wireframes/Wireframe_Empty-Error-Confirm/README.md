# Hope, Inc. ERP — S2-UIX-04 standardized UI states

**Issue:** [#113](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/113) — `[S2-UIX-04] Empty, error and confirm-delete states`
**Scope:** Empty states, validation and server errors, soft-delete confirmation, child-record delete blocking
**Screens used:** Customer, Product, Price History (existing Hope, Inc. modules)
**Prepared:** 2026-11-24
**Status:** For design review

---

## 1. Repository check (read-only)

**Repository:** `/home/blck/SKCuarte Repo/2BSIT-2_AltF4Project`
`git fetch --all --prune` was run. No file was changed, staged, committed, pushed or reset.

### Branches found

| Requested | Resolved remote branch | Head |
| --- | --- | --- |
| S2-UIX-03 | `origin/feature/S2-UIX-03]repo_mockup/handoff` | `ee7b79a` |
| S2-UIX-04 | `origin/feature/S2-UIX-04]repo_states` | `ee7b79a` |

Each name matched exactly one remote branch, so neither was ambiguous. Both names keep the `]` that exists in the repository; S2-UIX-03 has no space after it.

### Is S2-UIX-03 included in S2-UIX-04?

**Yes — completely. The two branches are the same commit.**

| Check | Result |
| --- | --- |
| Merge base | `ee7b79a` — *Enhance README with navigation instructions* |
| Commits only in S2-UIX-04 | none |
| Commits only in S2-UIX-03 | none |
| Ahead/behind counts | 0 / 0 |
| Differing files (`git diff --name-status`) | none |
| S2-UIX-03 ancestor of S2-UIX-04 | yes |
| S2-UIX-04 ancestor of S2-UIX-03 | yes |

### Merge test

Run in a throwaway worktree checked out at S2-UIX-03, so the main checkout was untouched:

```
git merge --no-commit --no-ff origin/feature/S2-UIX-04]repo_states
→ Already up to date.        (exit 0, no merge commit, no conflicts)
```

`git merge --abort` then reported `fatal: There is no merge to abort (MERGE_HEAD missing)` — expected, because no merge was started. The worktree was removed and the repository confirmed clean at `1b561e0` on `feature/S2-UIX-02]-repo_setup`.

**Result:** no merge was performed, and none was needed. Nothing was merged, committed, pushed or reset.

---

## 2. What is in this package

```
Wireframe_Empty-Error-Confirm/
├── Empty-Error-Confirm-States.pdf     # 21 pages: cover, index, 15 states, 4 phone states
├── README.md                          # this file
├── STATE-SPEC.md                      # trigger / message / action / reuse for every state
├── assets/
│   ├── 00-cover.png
│   ├── 01-state-index.png
│   ├── 00-contact-sheet.png
│   ├── empty-state_product-list.png
│   ├── no-results_product-list.png
│   ├── empty-state_customer-list.png
│   ├── no-results_customer-list.png
│   ├── empty-state_price-history.png
│   ├── error-field-validation_product-form.png
│   ├── error-summary_product-form.png
│   ├── error-api_product-list.png
│   ├── error-api_customer-form.png
│   ├── error-api_price-history.png
│   ├── confirm-soft-delete_customer.png
│   ├── confirm-soft-delete_product.png
│   ├── confirm-soft-delete_price-history.png
│   ├── blocked-delete_customer.png
│   ├── blocked-delete_product.png
│   ├── empty-state_product-list_mobile.png
│   ├── no-results_customer-list_mobile.png
│   ├── confirm-soft-delete_customer_mobile.png
│   └── blocked-delete_product_mobile.png
└── mockups/                           # static source, no build step needed to view
    ├── states.css
    ├── generate.mjs
    ├── render.sh
    ├── build-pdf.sh
    └── *.html                         # 21 boards
```

### The 19 state boards

| # | Board | State |
| --- | --- | --- |
| 01 | `empty-state_product-list` | Empty table — no records |
| 02 | `no-results_product-list` | No results — filters exclude everything |
| 03 | `empty-state_customer-list` | Empty table |
| 04 | `no-results_customer-list` | No results |
| 05 | `empty-state_price-history` | Empty modal |
| 06 | `error-field-validation_product-form` | Field-level validation |
| 07 | `error-summary_product-form` | Summary banner + field errors |
| 08 | `error-api_product-list` | Load error, list |
| 09 | `error-api_customer-form` | Save error, form |
| 10 | `error-api_price-history` | Load error, modal |
| 11 | `confirm-soft-delete_customer` | Soft-delete confirmation |
| 12 | `confirm-soft-delete_product` | Soft-delete confirmation |
| 13 | `confirm-soft-delete_price-history` | Soft-delete confirmation |
| 14 | `blocked-delete_customer` | Blocked by 1 sale |
| 15 | `blocked-delete_product` | Blocked by 3 child records |
| 16 | `empty-state_product-list_mobile` | Phone empty |
| 17 | `no-results_customer-list_mobile` | Phone no results |
| 18 | `confirm-soft-delete_customer_mobile` | Phone confirmation |
| 19 | `blocked-delete_product_mobile` | Phone blocked |

---

## 3. Grounding

- **Issue #113** acceptance criteria: empty list states, form/API error banners, soft-delete confirmation modals, child-record delete-blocked warnings; consistent with existing components. The issue has no comments.
- **Design system:** `Design System and visual foundation for the Hope, Inc/style.css` — tokens, `.btn`, `.input`, `.select`, `.table-card`, `.dialog`, `.pill`, `.ds-error`.
- **Hi-Fi handoff:** `hi-fi_mockup/Hi-Fi_mockup.md` — toast at bottom centre for 2.2 s, confirm dialog for delete, "No accounts match your filters." pattern, breakpoints.
- **Fix list:** `built screens and fix list/S1-UIX-05-Fix-List.md` — RD-01 (visible dialog footer), UM-01 (row actions on phones), FONT-01/FONT-02 (narrow-width clipping).
- **Database:** `db/migrations/001_hope_base_structure.sql` — `CUSTOMER`, `PRODUCT`, `PRICEHIST`, `SALES`, `SALESDETAIL`, `ON DELETE RESTRICT`. Sample rows from `db/migrations/002_hope_sample_data.sql` (Acme C-001, Industrial Widget A P-001, sales T-001/T-003, price 2026-10-01).
- **Child-delete proof:** `db/verification/child_delete_checks_verification.sql` on `origin/feature/S2-DBA-04-child-delete-checks` confirms C-001 and P-001 are blocked and a childless record deletes.
- **Rights:** `db/seeds/030_rights_catalogue.sql` — `CUSTOMER_ADD/EDIT/DELETE`, `PRODUCT_ADD/EDIT/DELETE`, `PRICE_ADD/EDIT/DELETE`.

---

## 4. Reproduction

```bash
cd mockups
node generate.mjs      # writes the 21 HTML boards
./render.sh            # renders PNGs with headless Firefox (skips existing files)
./build-pdf.sh         # builds the PDF and contact sheet
```

Rendered at 1440 × 900 (desktop) and 390 × 844 (phone). Avenir Next and Segoe UI are not installed here, so the renderer falls back to the next font in the approved stack; the CSS stack itself is unchanged.

---

## 5. Limits

- Copy is proposed where #113 and the linked tickets do not define it. See `STATE-SPEC.md` §4 and §8.
- No application code, API contract, SQL migration or repository file was created or modified.
- The deck covers light theme only; the design system's dark theme is not exercised.
- Price History has no child tables, so a price row cannot have a blocked-delete state. That is a schema fact, not an omission.
