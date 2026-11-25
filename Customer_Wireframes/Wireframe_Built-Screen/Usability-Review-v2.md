# [S2-UIX-05] Usability Review — Customer · Product · Price History

**Re-audit (v2).** Supersedes the earlier report in this folder; the earlier report's files are left untouched.

| Field | Value |
| --- | --- |
| Issue | [#114 — [S2-UIX-05] Usability review of built screens](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/114) |
| Audit date | 2026-11-25 |
| Repository | `/home/blck/SKCuarte Repo/2BSIT-2_AltF4Project` |
| Audited ref | `refs/remotes/origin/feature/S2-UIX-05]repo_usability` |
| Commit | `1b561e06287209b039cb62d4489c8a6d605e4669` (`1b561e0`) |
| Commit date | 2026-11-19 22:50:16 +0800 |
| Commit subject | `Merge pull request #72 from SKCuarte/feature/S1-UIX-04]-repo_setup` |
| Local branch | **None.** Only the remote-tracking ref exists in this clone (single match, unambiguous). No local branch was created. |
| Working tree | Untouched. Current checkout remains `feature/S2-UIX-02]-repo_setup`, clean. |
| Runtime review | **Not performed** (by instruction). All 1440×900 and 390×844 checks are **not verified**. |

---

## 1. Executive summary

**Result: the audit cannot pass. 0 of the 25 approved screens exist in the Next application.**

The audited snapshot contains authentication, dashboard and User Management only. There is no Customer, Product or Price History page, component, API route, or built screenshot anywhere in it. The three module deficits are review blockers, not visual defects.

Five screens have a **partial** predecessor in the repository: the S1 static prototype (`Hope, Inc (ui-ux)/`) contains generic Customer and Product list/form views. That prototype is explicitly a browser-storage demo, predates the Sprint 2 mockups, and has no Price History surface. Its concrete gaps are recorded separately and do not count as Sprint 2 built screens.

The audited branch also **predates the design handoff**: it contains no `Customer_Wireframes/` folder. The approved hi-fi assets and handoff/state specs were read from `/home/blck/Documents/Hope, Inc/` as instructed.

| Measure | Count |
| --- | --- |
| Approved screens in scope | 25 (C01–C12, P01–P07, PH01–PH06) |
| Built in the Next app | **0** |
| Partial (S1 static prototype only) | **5** — C01, C05, C07, P01, P03 |
| Missing entirely | **20** |
| Runtime/responsive verified | **0** (not verified) |
| Findings | **25** — 12 High, 9 Medium, 4 Low |
| Review blockers | **4** (C-01, P-01, PH-01, S-01) |

---

## 2. Method and limits

### 2.1 Read-only sequence

1. Confirmed the ref locally: `git branch -a --list '*S2-UIX-05*'` returned exactly one match, `remotes/origin/feature/S2-UIX-05]repo_usability`.
2. Resolved and dated it with `git rev-parse` / `git log -1`.
3. Exported it without checkout: `git archive <ref> | tar -x -C /tmp/opencode/audit114`.
4. Audited `/tmp/opencode/audit114` only.
5. Read mockups, handoff and state specs from `/home/blck/Documents/Hope, Inc/` (read-only).
6. Read issue #114 (the only network access).

No `git fetch`, `git pull`, checkout, merge, reset, commit, push or PR action was run. No app dependency was installed and the app was not started. No repo file was written.

### 2.2 Reference provenance

| Reference | Location used | Note |
| --- | --- | --- |
| Hi-Fi shell / S1 design baseline | `audit114/hi-fi_mockup/Hi-Fi_mockup.md` | On the audited branch; describes S1 auth/dashboard/User Management, not the three modules |
| Design tokens | `audit114/Design System and visual foundation for the Hope, Inc/{README.md,style.css}` | On the audited branch; source of truth |
| S1 fix list | `audit114/built screens and fix list/S1-UIX-05-Fix-List.md` | On the audited branch; responsive/a11y constraints (UM-01, FONT-01/02, RD-01) |
| Sprint 2 hi-fi screens C01–C12 / P01–P07 / PH01–PH06 | `/home/blck/Documents/Hope, Inc/Wireframe_Mockup-and-Handoff/` | **Not on the audited branch**; read-only copy |
| Handoff field/state/permission notes | same, `handoff/**/*.md` | **Not on the audited branch** |
| Empty / error / confirm-delete spec (S1–S8) | `/home/blck/Documents/Hope, Inc/Wireframe_Empty-Error-Confirm/STATE-SPEC.md` | **Not on the audited branch** |

The branch head is dated 2026-11-19; the handoff is dated 2026-11-24. The absence of the design folder is therefore expected, but it still means the implementation could not have consumed the Sprint 2 handoff at this commit.

### 2.3 Classification

| Status | Meaning in this report |
| --- | --- |
| **Built** | The approved screen/state exists in the Next app and can be compared with the mockup. |
| **Partial** | Only the S1 static prototype touches the screen's area. It is not the Sprint 2 screen and not the Next app. |
| **Missing** | No implementation of the screen/state in the repository. |
| **Not verified** | Exists or may exist, but runtime/layout could not be checked. |

Severity: **High** = core workflow/state missing or misleading, or review blocker · **Medium** = noticeable friction or missing secondary state · **Low** = polish/typography/spacing.

---

## 3. What exists at `1b561e0`

### 3.1 Next application (`web/`)

| Check | Result |
| --- | --- |
| Pages | 11 `page.tsx` files: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/set-password`, `/approval-pending`, `/auth/callback`, `/auth/recovery-callback`, `/dashboard`, `/dashboard/users` |
| Customer route / component | **None** |
| Product route / component | **None** |
| Price History route / component / modal | **None** |
| API routes | Only `api/auth/*`, `api/admin/*`, `api/health`; no customer/product/price endpoint |
| Source references | A repository-wide grep of `web/**/*.ts(x)` / `*.mjs` for `customer|product|price` returns no page/component use; the only module reference is the rights catalogue in `web/lib/rights-management.mjs` (expects CUSTOMER/PRODUCT/HR/SALES/REPORTS, 36 rights) |
| Navigation | `web/app/dashboard/page.tsx:58-77` renders only **Dashboard** and a role-gated **User Management** link |

`web/app/api` directory inventory: `admin/approvals`, `admin/users`, `admin/users/[id]/rights`, `auth/approval-status`, `auth/login`, `auth/set-password`, `health`, `register`, `register/google`, `register/manual`.

### 3.2 Built screenshots

`built screens and fix list/screenshots/` contains S1 login, dashboard, User Management and Rights frames only. There is no Customer, Product or Price History capture at either viewport.

### 3.3 S1 static prototype (`Hope, Inc (ui-ux)/`)

`index.html:171-176` declares views for `products`, `hr`, `sales`, `reports`, `customers`, `users`. There is **no price view**. `script.js` drives both the Customer and Product views through one generic `modView()` (lines 463–501) over the `MODS` definitions at lines 10–27.

`README.md` describes the prototype as "a front-end demonstration using sample data and browser storage … not connected to the production API or authentication service." It predates the C/P/PH mockups.

---

## 4. Summary table — module × screen/state

### 4.1 Screen status

| ID | Screen | Status | Evidence at `1b561e0` |
| --- | --- | --- | --- |
| C01 | Customer list — default Active | **Partial** | S1 generic list only (`script.js:463-501`); not the Next app |
| C02 | Search + payment-terms filter | **Missing** | No toolbar/filter code for modules |
| C03 | No matching customers | **Missing** | No no-results state |
| C04 | Inactive list — restore entry | **Missing** | No status view or restore action |
| C05 | Add customer | **Partial** | S1 generic always-open form (`script.js:465-486`) |
| C06 | Add customer — validation | **Missing** | Native `required` only; no field/summary errors |
| C07 | Edit customer | **Partial** | Same generic form in edit mode |
| C08 | Customer detail | **Missing** | Name is plain text (`script.js:489-491`) |
| C09 | Deactivate confirmation | **Missing** | Hard-delete confirm only (`script.js:494`) |
| C10 | Deactivate blocked | **Missing** | No blocked-delete state |
| C11 | Restore confirmation | **Missing** | No restore flow |
| C12 | Phone customer list | **Missing** | Table-only; horizontal overflow (`style.css:351,539-549`) |
| P01 | Product list — current prices | **Partial** | S1 generic list only (`script.js:22-27,463-501`) |
| P02 | No matching products | **Missing** | No no-results state |
| P03 | Add product | **Partial** | S1 generic form; no Unit field |
| P04 | Edit product — validation | **Missing** | No validation UI |
| P05 | Product detail — current price | **Missing** | No detail view |
| P06 | Current-price edge states | **Missing** | No price model in UI |
| P07 | Phone product list | **Missing** | No card layout |
| PH01 | Price History modal | **Missing** | No price view/component |
| PH02 | Add price | **Missing** | No price form |
| PH03 | Edit price — validation | **Missing** | No price form |
| PH04 | Delete price confirmation | **Missing** | Only generic record confirm |
| PH05 | Restore product confirmation | **Missing** | No restore flow |
| PH06 | Phone Price History | **Missing** | No sheet/cards |

**Screen totals: 0 built · 5 partial · 20 missing · 0 not verified.**

### 4.2 Required states

| Required state | Customer | Product | Price History |
| --- | --- | --- | --- |
| List / search | Partial (list only) | Partial (list only) | Missing |
| Search + filters / result note | Missing | Missing | n/a — no filters |
| Empty (no records) | Partial (one string only) | Partial (one string only) | Missing |
| No-results (filters exclude all) | Missing | Missing | n/a |
| Create form | Partial | Partial | Missing |
| Edit form | Partial | Partial | Missing |
| Field validation (S3/S4) | Missing | Missing | Missing |
| Load error / retry (S5) | Missing | Missing | Missing |
| Save error (S6) | Missing | Missing | Missing |
| Deactivate / soft-delete confirm (S7) | Missing | Missing | Missing (delete price) |
| Blocked-delete warning (S8) | Missing | Missing | n/a — no child tables |
| Restore flow | Missing | Missing | Missing (restore product) |
| Detail view | Missing | Missing | n/a |
| Price History add / edit / delete | n/a | Missing (entry point) | Missing |
| 1440×900 visual check | Not verified | Not verified | Not verified |
| 390×844 visual check | Not verified | Not verified | Not verified |

---

## 5. Findings

### 5.1 Customer

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| **C-01** | **High — blocker** | No Customer page, component or API exists in the Next app. C01–C12 are absent. | `web/app` route inventory; no `customers` segment; `web/app/api` has no customer route |
| **C-02** | **High** | In the S1 prototype, Customer columns are Name / Email / Phone / Status. The mockup and database require Customer ID / Name / Address / Payment terms / Status; email and phone do not exist in `CUSTOMER`. | `Hope, Inc (ui-ux)/script.js:14`; `db/migrations/001_hope_base_structure.sql:63-67`; `assets/customer/c01-customer-list.png` |
| C-03 | Medium | S1 Customer list has no search, status filter, payment-terms filter, Clear filters or result note. | `script.js:463-501` — only title, optional form and table are rendered |
| C-04 | Medium | S1 create/edit uses a single-row `auto-fit` grid, has no back link, panel header/supporting line, two-column layout, full-width Address or footer divider. The create form is permanently expanded for anyone with add rights rather than opened by an "Add customer" action. | `script.js:465-486`; `style.css:485` |
| C-05 | Medium | S1 Status is a user-editable select on create and edit. The mockup makes it system-managed (Active on create; changed only by Deactivate/Restore). | `script.js:14, 468-470` |
| C-06 | Medium | S1 has no Customer detail view; the name cell is plain text, not a link. | `script.js:489-491` |
| C-07 | Low | S1 has no `maxlength` on ID / name / address (10 / 100 / 200). | `script.js:466-470`; zero `maxlength` matches in `script.js`/`index.html` |
| C-08 | Low | S1 view title is 24 px (1.5 rem) vs 30 px; table body inherits 16 px vs 13 px; table head has no soft fill; input padding is 10×12 vs 9×16. Status pills are outline-only, not the mockup's tinted fill. | `style.css:353-355, 357-358, 484, 487-489`; `style.css:24` in design system |

### 5.2 Product

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| **P-01** | **High — blocker** | No Product page, component or API exists in the Next app. P01–P07 are absent. | `web/app` route inventory; no `products` segment; no product API |
| **P-02** | **High** | S1 Product columns are SKU / Product / Price / Stock. The mockup requires Product ID / Product / Unit / Current price + effective date / Status. There is no derived current price and `$0.00` is not distinguished from "No current price". | `script.js:22-27, 489-491`; `assets/product/p01-product-list.png` |
| **P-03** | **High** | S1 permission gating treats `price_add` / `price_edit` / `price_delete` as Product add/edit/delete because the suffix match is `endsWith("_" + suffix)`. A user holding only a price right sees product-record controls. | `script.js:466`; rights list `script.js:25`; handoff `product/01-product-list.md` §7 |
| **P-04** | **High** | No Price History entry point on the S1 Product list/detail. The declared price rights are unused and there is no price view. | `script.js:25, 493-495`; `index.html:171-176` |
| P-05 | Medium | S1 has no search, unit filter, status filter, Clear filters or result count; no Current/Future/No-current-price state anywhere. | `script.js:463-501`; handoff `product/01-product-list.md` §3–§5 |
| P-06 | Medium | S1 Product form captures SKU / Product / Price / Stock. It has no Unit field, Price is a editable number instead of a read-only derived current price, and there is no "price is managed in Price History" note. | `script.js:26, 465-486`; handoff `product/02-create-edit-product.md` §3 |

### 5.3 Price History

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| **PH-01** | **High — blocker** | No Price History modal, table, route, form or data use exists. `index.html` declares no price view and `script.js` has no price handling. | `index.html:171-176`; `script.js` (no price symbols) |
| **PH-02** | **High** | No add/edit price form: no effective-date control, unit-price control, duplicate-date check or negative-price/zero validation. PH02 and PH03 are absent. | No price form in `script.js`/`index.html`; handoff `price-history/02-add-edit-price.md` |
| **PH-03** | **High** | No delete-price confirmation and no restore-product confirmation. PH04/PH05 are absent; only a generic hard-delete confirm exists for other records. | `script.js:418-421`; handoff `price-history/03-delete-price-restore-product.md` |
| PH-04 | Medium | No Price History empty state (no rows, no current price) or load-error state. | No price view; STATE-SPEC S1/S5 in-modal variants |

### 5.4 Cross-module S1 prototype issues (counted once)

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| **X-01** | **High** | Customer and Product deletion is a hard delete with the irreversible copy "Delete this record? / This cannot be undone." There is no soft deactivate, blocked-delete warning or restore flow, contrary to C09–C11, P05/PH05 and STATE-SPEC S7/S8. | `script.js:418-421, 494`; `db/migrations/001_hope_base_structure.sql:73, 84` (soft-delete intent) |
| **X-02** | **High** | No field-level errors, error summary, `aria-invalid`/`aria-describedby`, load-error banner, retry or save-error banner. Only native `required` is used, so no S3–S6 state exists for any module. | `script.js:467-486`; 0 matches for `aria-invalid`, `role="alert"`, `Retry` |
| X-03 | Medium | Empty handling is the single string "No records yet."; there is no distinction between "No customers/products yet" (create action) and "No … match your filters" (Clear filters), and no icon/title/body anatomy. | `script.js:488`; STATE-SPEC §2 Rule 1 |
| X-04 | Medium | No phone card layout. The modules remain a table inside `.tw { overflow-x: auto }`; at ≤680 px only toolbar padding and cell padding change. Row actions can sit off-screen. | `style.css:351-354, 539-549`; C12/P07 handoff |

### 5.5 Shared application shell / design system

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| **S-01** | **High — blocker** | The application shell exposes no Customer or Product navigation entry, so the modules cannot be reached even after being built. The sidebar renders only Dashboard and User Management. | `web/app/dashboard/page.tsx:58-77` |
| S-02 | Low | The Next app body uses `Arial, Helvetica, sans-serif`; the design system's `--font` is "Avenir Next", "Segoe UI", system-ui, sans-serif. The Geist font is imported in the layout but not applied to `body`. Any new module would inherit the wrong stack. | `web/app/globals.css:43`; `web/app/layout.tsx:2-8`; design-system `style.css:24` |
| S-03 | Low | `globals.css` defines the base palette but omits state-spec tokens (`--color-success`, `--color-success-bg`, `--color-warning`, `--color-warning-bg`, `--color-danger-bg`, `--shadow-md`, `--control-height`, `--focus-ring`). | `web/app/globals.css:4-21`; design-system `style.css:3-37`; STATE-SPEC §1 |

---

## 6. Blockers

| ID | Blocker | Blocks |
| --- | --- | --- |
| B-01 | Customer module absent from the Next app | C01–C12 |
| B-02 | Product module absent from the Next app | P01–P07 |
| B-03 | Price History absent from the Next app | PH01–PH06 |
| B-04 | No Customer/Product entry in the app navigation | All three modules, even after pages exist |
| B-05 | No runtime evidence: app not run, so 1440×900 and 390×844 rendering, focus, responsive collapse and real state transitions are **not verified** | All 25 screens (verification gap, not a defect) |

No screen can be marked a pass. Absence is confirmed by file inventory, not inferred.

---

## 7. Responsive and visual review status

| Check | Result |
| --- | --- |
| 1440×900 desktop | **Not verified** — no built screen to render; app not run |
| 390×844 phone | **Not verified** — no built screen to render; app not run |
| 860 px sidebar overlay | Not verified in the app; S1 prototype has a rule at `style.css:362` |
| 680 px form/toolbar stacking | Not verified in the app; S1 prototype only changes padding (`style.css:539-549`); no Customer/Product card layout exists |
| Colors / radius / spacing vs design system | Only code-level: the token values in `globals.css` match the base palette, but no module consumes them. Typography and feedback tokens deviate (S-02, S-03). |
| Form feedback / state behavior | Missing (X-02) |
| Focus trap / focus return | Not verifiable for the three modules; the S1 generic dialog declares `role="dialog" aria-modal="true"` but the shared `modal()` helper (`script.js:410-416`) does not implement a focus trap or focus return. |

---

## 8. Open handoff decisions and blocked screens

These are unresolved in `handoff/ambiguities.md`; they must be answered before implementation can be accepted.

| ID | Decision | Blocks |
| --- | --- | --- |
| A1 | Canonical Customer columns (DB set vs S1 Name/Email/Phone/Status) | C01–C04, C08, C12 |
| A2 | `payTerms` vs `terms`; required/nullable; CHECK values | C05–C08 |
| A3 | Customer ID typed or generated; editable after create | C05, C07, C08 |
| A4 | Customer Restore right (`CUSTOMER_DELETE`, new right, or manage rule) | C04, C11, C12 |
| A5 | Customer view right / module access | C01–C12 |
| A6 | Customer detail contents (fields, related sales) | C08 |
| A7 | Whether the blocked-delete dialog lists or links blocking sales | C10 |
| A8 | Approved payment-terms value list | C01, C05–C07 |
| A9 | Duplicate-ID / success / error strings (proposals only) | C05–C07, P03/P04, PH02/PH03 |
| A12 | Inline panel vs dialog for create/edit | C05–C07, P03/P04 |
| A13 | Customer phone pattern (cards vs scrolling table) | C12 |
| A15 | Product view right / module access | P01–P07 |
| A16 | Product Restore right | P01, P05, P07, PH05 |
| A17 | Product ID typed or generated; editable after create | P03, P04, P05 |
| A18 | Is `product_name` required (DB allows NULL)? | P03, P04 |
| A19 | Is `unit` required, or only a UI proposal? | P03, P04 |
| A20 | Category filter out of scope (no schema column) | P01, P02 |
| A21 | Product search target (ID/name) | P01, P02 |
| A22 | Current-price as-of date: today only or user-selectable | P01, P05, P06, PH01 |
| A23 | What opens Price History (any `PRICE_*` or a new view right) | P01, P05, PH01, PH06 |
| A24 | Does Add Product create the first price row? | P03, PH01 |
| A27 | Delete price semantics: hard delete vs `status = 'Inactive'` | PH01, PH04 |
| A28 | Is `effective_date` editable on edit? | PH02, PH03 |
| A29 | Duplicate-date message/upsert rule | PH02, PH03 |
| A30 | Is zero a valid price? | PH02, PH03, P06 |
| A31 | More than two decimals: round or reject | PH02, PH03 |
| A32 | Current / Historical / Future label mapping | PH01, PH06 |
| A33 | Deleting the current price: recompute and sales behaviour | PH04, P05, P06 |
| A34 | Empty Price History state and copy | PH01, PH06 |
| A37 | Touch-target minimum (mockup buttons are 32 px) | C12, P07, PH06 |
| A41 | Loading/error coverage beyond the proposed S5/S6 | All three modules |
| A42 | Server-side enforcement of every right (hiding is not authorization) | All three modules |

---

## 9. Recommended order

1. Merge or rebase the design baseline so the audited branch actually contains `Customer_Wireframes/`; today the branch predates the handoff.
2. Resolve §8 decisions, starting with A1/A2, A4/A16 and A27/A33.
3. Build Customer and Product list + form + detail, and add the missing sidebar entries (S-01).
4. Build Price History with the derived current price and its three states.
5. Implement the state system S1–S8 as first-class states, not as generic messages.
6. Add phone card layouts and keep modal footers fixed.
7. Capture 1440×900 and 390×844 evidence, then re-run this audit. Until then all runtime checks stay **not verified**.

---

## Appendix A — Issue #114

- Title: `[S2-UIX-05] Usability review of built screens`
- State: OPEN · Assignee: `marlgembarozo` · Labels: Sprint 2, UI/UX DESIGNER · Comments: 0
- Objective: visual and usability audit of implemented Customer, Product and Price History pages against the approved hi-fi mockups.
- Acceptance criteria: layout alignment, spacing, form feedback, empty/error/confirm-delete states; report and fix list committed to `docs/`.
- Development panel: "No branches or pull requests".

## Appendix B — Evidence commands

```bash
git branch -a --list '*S2-UIX-05*'                 # one remote-tracking match
git rev-parse 'refs/remotes/origin/feature/S2-UIX-05]repo_usability'   # 1b561e0...
git log -1 --format='%H %ci %s' <ref>
git archive <ref> | tar -x -C /tmp/opencode/audit114
find /tmp/opencode/audit114/web/app -name 'page.tsx'
find /tmp/opencode/audit114/web/app/api -type d
```

## Appendix C — Files written by this review

| File | Purpose |
| --- | --- |
| `Usability-Review-v2.md` | This report |
| `Polish-Fix-List-v2.md` | Screen-by-screen fix list |

Both earlier files (`Usability-Review.md`, `Polish-Fix-List.md`) were left unchanged.
