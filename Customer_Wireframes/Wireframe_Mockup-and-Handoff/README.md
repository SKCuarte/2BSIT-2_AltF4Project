# Hope, Inc. ERP — S2-UIX-03 Mockups and Developer Handoff

**Issue:** [#112](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/112) — `[S2-UIX-03] Hi-fi mockups and handoff notes`
**Scope:** All Customer, Product, and Price History screens
**Prepared:** 2026-11-24
**Status:** For design review and developer estimation

This package contains 25 high-fidelity screens (27 PDF pages including cover and index), the PNG assets, the static HTML source used to render them, and a developer handoff note for every screen group.

---

## 1. Repository status (branch comparison and merge result)

**Repository:** `/home/blck/SKCuarte Repo/2BSIT-2_AltF4Project`
**Fetch:** `git fetch --all --prune` completed. No repository file was modified, committed, or pushed.

### Branches found

| Requested | Resolved remote branch | Head |
| --- | --- | --- |
| S2-UIX-01 | `origin/feature/S2-UIX-01]-repo_wireframe` | `1fdb6d3` |
| S2-UIX-02 | `origin/feature/S2-UIX-02]-repo_product/price_wireframe` | `d661a23` |
| Target `feature/S1-UIX-04-repo_setup` | `feature/S1-UIX-04]-repo_setup` (local and remote) | `1b561e0` |

Both S2 branches were unambiguous. The target name in the request omits the `]` that exists in the repository; the matching branch is `feature/S1-UIX-04]-repo_setup`.

### Commit comparison

Merge base: `116e728` (“Customer_Screen”).

**Only in S2-UIX-02 (`1fdb6d3..d661a23`):**

- `d661a23` Add files via upload
- `9f9928f` Delete Wireframe_CustomerScreen directory

**Only in S2-UIX-01 (`d661a23..1fdb6d3`):**

- `1fdb6d3` Add files via upload
- `2a2cc0e` Delete Wireframe_CustomerScreen directory

### Differing files

Both branches deleted the original root `Wireframe_CustomerScreen/` folder and both added the same `Customer_Wireframes/Wireframe_Product-Price/` set (4 files: `README.md`, `deliverables.md`, `product-price-wireframes.html`, `screen-spec.md`).

The only content difference is that **S2-UIX-02 also contains** `Customer_Wireframes/Wireframe_CustomerScreen/` (6 files: `README.md`, `S2-UIX-01-deliverables.md`, `S2-UIX-01-screen-spec.md`, `customer-wireframes.css`, `customer-wireframes.html`, `issue-110.json`). S2-UIX-01 has no file that S2-UIX-02 lacks, so S2-UIX-02 is a content superset.

### Merge test

`git merge --no-commit --no-ff origin/feature/S2-UIX-02]-repo_product/price_wireframe` was run against S2-UIX-01. It **conflicted** on all six paths:

```
CONFLICT (rename/delete): Wireframe_CustomerScreen/README.md
  renamed to Customer_Wireframes/Wireframe_CustomerScreen/README.md in S2-UIX-02,
  but deleted in HEAD.
... (same for the other five files)
```

The merge was aborted with `git merge --abort`; the working tree was clean afterwards and the repository was restored to its original branch.

### Merge result

**No merge was performed.** The task said to merge only if the test was clean, and to stop and ask on conflict. The conflict was reported; the chosen action was **skip the merge and build the deliverables only**. Therefore:

- S2-UIX-01, S2-UIX-02, and `feature/S1-UIX-04]-repo_setup` are unchanged.
- No commit, push, force-push, or hard reset was done.
- The package below is the only output.

For reference: `feature/S1-UIX-04]-repo_setup` is an ancestor of S2-UIX-02, so merging S2-UIX-02 into it would have been a clean fast-forward. It was not performed because the S2-UIX-01-vs-S2-UIX-02 gate failed and the chosen action was to skip.

---

## 2. Package contents

```
Wireframe_Mockup-and-Handoff/
├── High-Fidelity-Mockups.pdf          # 27 pages: cover, index, 25 screens
├── Customer-Mockups.pdf               # C01–C12
├── Product-Mockups.pdf                # P01–P07
├── Price-History-Mockups.pdf          # PH01–PH06
├── README.md                          # this file
├── assets/
│   ├── 00-cover.png
│   ├── 00-legend.png
│   ├── 00-contact-sheet.png
│   ├── customer/                      # C01–C12 PNGs (1440×900, C12 390×844)
│   ├── product/                       # P01–P07 PNGs (1440×900, P07 390×844)
│   └── price-history/                 # PH01–PH06 PNGs (1440×900, PH06 390×844)
├── handoff/
│   ├── README.md                      # cross-screen rules, tokens, permission matrix
│   ├── ambiguities.md                 # consolidated open decisions
│   ├── customer/
│   │   ├── 01-customer-list.md
│   │   ├── 02-create-edit-customer.md
│   │   ├── 03-customer-detail.md
│   │   ├── 04-deactivate-restore.md
│   │   └── 05-responsive.md
│   ├── product/
│   │   ├── 01-product-list.md
│   │   ├── 02-create-edit-product.md
│   │   ├── 03-product-detail-current-price.md
│   │   └── 04-responsive.md
│   └── price-history/
│       ├── 01-price-history.md
│       ├── 02-add-edit-price.md
│       ├── 03-delete-price-restore-product.md
│       └── 04-responsive.md
└── mockups/                           # static HTML/CSS source of the boards
    ├── mockup.css
    ├── generate.mjs                   # writes the 27 HTML boards
    ├── render.sh                      # renders PNGs with headless Firefox
    ├── build-pdf.sh                   # builds the PDFs
    └── *.html                         # 27 generated boards
```

### Screen list

| ID | Screen | Viewport |
| --- | --- | --- |
| C01 | Customer list — default Active | 1440×900 |
| C02 | Search + payment-terms filter | 1440×900 |
| C03 | No matching customers | 1440×900 |
| C04 | Inactive list — restore entry | 1440×900 |
| C05 | Add customer | 1440×900 |
| C06 | Add customer — validation | 1440×900 |
| C07 | Edit customer | 1440×900 |
| C08 | Customer detail | 1440×900 |
| C09 | Deactivate confirmation | 1440×900 |
| C10 | Deactivate blocked | 1440×900 |
| C11 | Restore confirmation | 1440×900 |
| C12 | Phone customer list | 390×844 |
| P01 | Product list — current prices | 1440×900 |
| P02 | No matching products | 1440×900 |
| P03 | Add product | 1440×900 |
| P04 | Edit product — validation | 1440×900 |
| P05 | Product detail — current price | 1440×900 |
| P06 | Current-price edge states | 1440×900 |
| P07 | Phone product list | 390×844 |
| PH01 | Price History modal | 1440×900 |
| PH02 | Add price | 1440×900 |
| PH03 | Edit price — validation | 1440×900 |
| PH04 | Delete price confirmation | 1440×900 |
| PH05 | Restore product confirmation | 1440×900 |
| PH06 | Phone Price History | 390×844 |

---

## 3. Design system applied

The mockups use the approved tokens from `Design System and visual foundation for the Hope, Inc/style.css` without introducing new colours, type sizes, or radii:

- **Palette:** `#0e5a6b` primary, `#0a4653` hover, `#d9ecf0` subtle, `#f2a541` highlight, `#fbfcfd` page, `#ffffff` surface, `#f1f6f8` soft, `#10222e` text, `#5d7080` muted, `#e1e8ed` border, `#18794e` success, `#8a5200` warning, `#c0392b` danger, `#0f2430` sidebar, `#16798d` active pill.
- **Typography:** Avenir Next / Segoe UI / system-ui; page title 30 px/700, card title 21–25 px/700, body 16 px/1.55, labels 12.5 px/700, table 13 px.
- **Spacing and shape:** 42 px control height, 9 × 16 px control padding, 10 px control radius, 14 px card/table radius, 18 px dialog radius, 20–24 px card padding, 16 px form gap, 240 px sidebar, 1200 px content cap.

The design-system dark theme exists but is not exercised; the issues do not request dark Customer/Product screens. This is recorded as an open scope item.

---

## 4. Ambiguities (summary)

The full list with impact and proposed handling is in `handoff/ambiguities.md`. The highest-impact items are:

1. **Customer column set** — handoff says Name/Email/Phone/Status; the database has ID/Name/Address/Terms/Status and no email/phone. The mockup follows the database.
2. **`payTerms` vs `terms`** — issue/ticket naming vs the `CUSTOMER.terms` column; required/CHECK rule is proposed in #86 but not merged.
3. **Restore rights** — Customer and Product restore are required by #92/#95, but the 36-right catalogue has no restore right.
4. **View rights** — no Customer, Product, or Price “View” right exists; #90/#93/#97 assume some view rule.
5. **Customer/Product ID rules** — typed or generated, editable or not, are undefined.
6. **Product name/unit required?** — `product_name` and `unit` are nullable in migration 001; the UI proposal marks them required.
7. **Current-price as-of date** — today vs a user-selected date is allowed by #97 but no date control is approved.
8. **Delete price semantics** — hard delete vs `status = 'Inactive'`, and the effect on sales, are undefined.
9. **Effective-date editability** — the date is part of the composite PK; the mockup keeps it read-only on edit.
10. **Zero price** — the DB allows `unit_price >= 0`; whether zero is free or invalid is undefined.
11. **Price History access** — no View Price right; whether any `PRICE_*` right opens the modal is undefined.
12. **Empty/loading/error states and toast strings** — largely unspecified; the mockups use grounded proposals and mark them as open.
13. **Category filter** — #93 mentions it, but the schema has no category column.
14. **Pagination/sorting** — not specified for Customer or Product.
15. **Mobile pattern** — cards vs horizontal table; the fix list recommends keeping actions visible, which the mockups follow.

---

## 5. How to review

1. Open `High-Fidelity-Mockups.pdf` for the full deck, or the module PDF for a focused review.
2. Use `assets/00-legend.png` as the screen index and permission key.
3. Read `handoff/README.md` for the cross-screen permission matrix and responsive contract.
4. Read the per-screen note alongside its PNG; each note has field specs, responsive behaviour, and role/permission visibility.
5. Resolve or record the items in `handoff/ambiguities.md` before implementation.

---

## 6. Reproduction

The boards are static HTML; no build step or external dependency is needed to view them. To regenerate the assets:

```bash
cd mockups
node generate.mjs          # writes the 27 HTML boards
./render.sh                # renders PNGs with headless Firefox
./build-pdf.sh             # builds the PDFs and contact sheet
```

The renderer used Firefox headless at 1440×900 and 390×844. Fonts fall back to the installed Noto Sans because Avenir Next and Segoe UI are not available in this environment; the CSS stack remains the approved one.

---

## 7. Non-goals

This package does not include production HTML/React components, API contracts, SQL changes, pagination/sorting, import/export, bulk actions, saved views, a category filter, a dark theme, or a date selector for current price. Those are either out of scope for #112 or unresolved in the sources.
