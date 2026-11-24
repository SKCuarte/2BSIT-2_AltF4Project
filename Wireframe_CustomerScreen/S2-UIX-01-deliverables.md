# S2-UIX-01 — Deliverable Register and Traceability

**Issue:** [#110](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/110) — `[S2-UIX-01] Wireframes: customer screens`
**Prepared:** 2026-11-24
**Repository:** `/home/blck/SKCuarte Repo/2BSIT-2_AltF4Project`
**Branch at preparation time:** `feature/S1-UIX-04]-repo_setup`, level with `origin/main` (0 ahead, 0 behind), working tree clean
**Write policy:** reference folders were read only; nothing was written to or committed in the repository.

---

## 1. Issue summary in plain language

Issue #110 asks the UI/UX designer to produce **low/mid-fidelity wireframes for the Customer module** in Sprint 2. The wireframes must show:

1. The **customer list**, including **search and filter controls**.
2. The **create and edit forms**, including the **`payTerms`** (payment terms) field.
3. A **detail view** for a customer record.
4. **Soft-delete and restore** actions — deactivating a customer without removing the row, and bringing it back.

The layout must match the **approved Hope, Inc. main-page sidebar and design system**. The issue is complete when a single-responsibility PR that closes #110 has been peer-reviewed and merged into `main`.

**Issue metadata:** state Open; labels `UI/UX DESIGNER`, `Sprint 2`; assignee `marlgembarozo` (usr-Chr0nos); milestone Sprint 2, due 2026-11-24; no comments; no linked PR at the time of writing.

### Acceptance criteria (verbatim)

- [ ] Wireframes committed for Customer list, search/filter controls, create/edit forms (including `payTerms` field), and soft-delete/restore actions
- [ ] Layout aligns with the approved Hope, Inc. main page sidebar and design system

### Definition of Done (verbatim)

- [ ] Single-responsibility PR linked with `Closes #<issue-number>`
- [ ] Peer-reviewed and merged into `main`

---

## 2. Deliverables

### D1 — Customer wireframe set

| | |
| --- | --- |
| **Name** | `customer-wireframes.html` |
| **Purpose** | Reviewable low/mid-fidelity wireframes for every Customer screen in Issue #110: list, search/filter states, create form, edit form, detail view, soft-delete confirmation, blocked-delete state, restore confirmation, and responsive variants. |
| **Acceptance criteria** | AC 1 (all named screens and actions); AC 2 (app shell, sidebar, tokens) |
| **Derived from** | Issue #110; #90 (list, search, filters, active default, action-rights rendering); #91 (create/edit, `payTerms`, validation feedback); #92 (soft delete, blocked delete, restore); `db/migrations/001_hope_base_structure.sql` (CUSTOMER fields); `db/migrations/002_hope_sample_data.sql` (sample records); `db/migrations/009_active_customer_product_views.sql` on `origin/feature/S2-DBA-01-active-views` (active view); `Design System and visual foundation for the Hope, Inc/` (tokens, controls, table, dialog); `hi-fi_mockup/Hi-Fi_mockup.md` (sidebar, breakpoints, status tags, toast, confirm dialogs); `Hope, Inc (ui-ux)/` (built shell and Customer module pattern); `built screens and fix list/` (built screenshots, UM-01/FONT-01/FONT-02/A11Y findings). |
| **Format and location** | Static HTML, no external dependencies: `/home/blck/Documents/Hope, Inc/S2-UIX-01-customer-wireframes/customer-wireframes.html` |
| **Missing / unclear** | Customer ID entry/generation and editability; restore and view rights; approved column set (handoff vs database); whether `payTerms` is required and which CHECK values apply; detail-view contents; blocking-record detail; pagination; loading/error states. See §4 and §5. |

### D2 — Wireframe stylesheet

| | |
| --- | --- |
| **Name** | `customer-wireframes.css` |
| **Purpose** | Implements the app shell and wireframe components using the design-system tokens so the layout visibly matches the approved sidebar and visual foundation. |
| **Acceptance criteria** | AC 2 |
| **Derived from** | `Design System and visual foundation for the Hope, Inc/style.css` (token values, control height, radii, badges, table, dialog); `Hope, Inc (ui-ux)/style.css` (240 px sidebar, `#16798d` active pill, 1200 px / 4 vw content, top bar, toolbar, module table, toast); `hi-fi_mockup/Hi-Fi_mockup.md` (typography, 10/14/18 px radii, 2.2 s toast). |
| **Format and location** | CSS: `/home/blck/Documents/Hope, Inc/S2-UIX-01-customer-wireframes/customer-wireframes.css` |
| **Missing / unclear** | Dark-theme values exist in the design system but are not exercised by these wireframes; the issue does not request a dark Customer screen. |

### D3 — Screen and state specification

| | |
| --- | --- |
| **Name** | `S2-UIX-01-screen-spec.md` |
| **Purpose** | Written specification for developers and reviewers: screen inventory, toolbar and column definitions, field table with database mapping, validation/feedback, state matrix, permission matrix, responsive rules, accessibility notes, and explicit out-of-scope items. |
| **Acceptance criteria** | AC 1 and AC 2 (supports both; the issue asks for wireframes, so this is a companion, not an extra requirement) |
| **Derived from** | Same sources as D1, plus `Acceptance-Criteria.md` (AC-11, AC-12, AC-13) for validation and error-feedback wording, and `docs/User-Management-Design.md` (rights catalogue). |
| **Format and location** | Markdown: `/home/blck/Documents/Hope, Inc/S2-UIX-01-customer-wireframes/S2-UIX-01-screen-spec.md` |
| **Missing / unclear** | Any field or state that the references leave undefined is marked “not specified” rather than invented. |

### D4 — Package index and issue snapshot

| | |
| --- | --- |
| **Name** | `README.md`, `issue-110.json` |
| **Purpose** | Explains what the package contains, how to open the wireframes, and preserves the exact issue payload (title, body, labels, assignee, milestone, comments) used for this work. |
| **Acceptance criteria** | Supports AC 1 and the DoD traceability |
| **Derived from** | `gh issue view 110` output; this register. |
| **Format and location** | Markdown + JSON in `/home/blck/Documents/Hope, Inc/S2-UIX-01-customer-wireframes/` |
| **Missing / unclear** | None. |

---

## 3. Acceptance-criteria traceability

| Requirement | Where it is satisfied | Evidence |
| --- | --- | --- |
| Customer list | Screen 01 | Table with ID, name, address, payment terms, status, actions |
| Search controls | Screen 01, 02a, 02b | Search input; filtered result state; no-match state |
| Filter controls | Screen 01, 02a, 02c | Status filter (Active/All/Inactive) and payment-terms filter |
| Create form incl. `payTerms` | Screen 03, 03b | “Add customer” panel with Payment terms select and validation |
| Edit form incl. `payTerms` | Screen 04 | Prefilled panel with Payment terms select |
| Detail view | Screen 05 | Read-only record card |
| Soft delete | Screen 01, 06, 06b | Deactivate action, confirmation, blocked-by-children state |
| Restore | Screen 02c, 07 | Inactive filter with Restore action and confirmation |
| Sidebar alignment | Screen 01 (full shell), 08 | 240 px dark sidebar, active pill, profile block |
| Design-system alignment | All screens; D2; Screen 09 token table | Tokens, radii, control height, typography, status pills |

---

## 4. Gaps and inconsistencies between the issue and the references

1. **Column set conflict.** The Sprint 1 handoff lists Customer columns as Name, Email, Phone, Status. The database has `customer_id`, `customer_name`, `customer_address`, `terms`, `status`, `stamp`; there is no email or phone. The issue’s required `payTerms` only exists in the database form. The wireframes follow the database and flag the difference.
2. **`payTerms` vs `terms`.** The issue and #91 use `payTerms`; migration 001 names the column `terms`. #86 proposes NOT NULL/CHECK constraints for `payTerms`, but no such migration is merged into `main`.
3. **Soft delete vs hard delete.** The built Sprint 1 Customer module deletes rows with “This cannot be undone.” #92 requires marking the customer Inactive and keeping it. The wireframes use soft-delete copy and do not reuse the hard-delete string.
4. **Restore has no right.** The 36-right catalogue defines only Add, Edit and Delete Customer. #92 refers to “delete/manage rights” without naming one.
5. **“View permission” has no right.** #90 requires server-side enforcement of a Customer view permission, but no view right exists in the catalogue.
6. **Detail view is only in the objective.** The acceptance criteria do not list it, and no reference shows a Customer detail screen. The wireframe is a minimal read-only view.
7. **Inactive tag colour.** The handoff says both “Blocked / Inactive / On leave (red)” and “inactive and on-leave statuses use the warning color.” The built CSS uses danger red; the wireframes use red.
8. **Reference set has no Customer designs.** The hi-fi handoff explicitly says its S1-UIX-04 scope is authentication, dashboard navigation, User Management, and the rights dialog. The PDFs are image-heavy design boards; the Customer screens do not exist in them, which is why #110 is needed.
9. **Dashboard tile model is contested** (S1-UIX-05 REF-01: PDF vs handoff on tiles/counts). It does not change the Customer screens, but it does mean “approved main page” should be confirmed by the design owner before the PR closes.

---

## 5. Open questions

1. **Customer view right.** Does list/detail access require a new Customer “View” right, or is it implied by holding any Customer right? (#90 assumes a view permission; the catalogue has none.)
2. **Restore right.** Should Restore use Delete Customer, a new “Restore Customer” right, or a general manage right? (#92 says “delete/manage”.)
3. **Customer ID rules.** Is the ID typed by staff or generated? Is it editable after creation? The wireframe shows manual entry on create and a read-only ID on edit as a proposal.
4. **Payment terms validation.** Is `payTerms` required, and what exact values are allowed? #86 asks for CHECK/NOT NULL, but the current column is nullable `VARCHAR(20)` with example values Net 15/30/45, COD, Prepaid. Also confirm whether the column will be renamed to `payTerms`.
5. **Detail view contents.** What belongs on the detail screen, and should it list related sales? No reference defines it.
6. **Blocked deactivation.** Should the dialog list the blocking sales records or link to them, or is a generic message acceptable?
7. **Approved column set.** Should the list show the handoff’s Name/Email/Phone/Status, the database’s ID/Name/Address/Terms/Status, or a combination (which would require schema work)?
8. **Pagination and sorting.** Are they required for Customer? User Management has pagination; the Customer tickets do not mention it.
9. **Empty and error states.** The issue does not define a no-customers empty state, a loading state, or a load-error state. Only AC-12’s general error-message rule applies.
10. **Mobile layout.** Is the phone card layout acceptable, or must the table stay horizontal with a scroll cue? S1-UIX-05 UM-01 recommends keeping actions visible; that is a recommendation, not an approved Customer spec.
11. **Dark theme.** The design system supports dark mode, but no dark Customer wireframe is requested or shown.
12. **Container pattern.** Should create/edit be an inline panel (existing module pattern) or a dialog (design-system pattern)? The wireframes use the inline panel for consistency with the built Customer module.

---

## 6. Reference files read

| Path | Used for |
| --- | --- |
| `low-to-mid fidelity wireframe layout/index.html` | Wireframe document structure (nav, numbered screens, state cards, placement notes) |
| `low-to-mid fidelity wireframe layout/styles.css` | Low/mid-fidelity visual treatment and annotation patterns |
| `low-to-mid fidelity wireframe layout/Hope, Inc. Wireframe(Login).pdf` | Auth wireframe reference (not Customer-specific; image-based PDF) |
| `Hope, Inc. (Landing Page)/*.pdf` | Public landing-page reference (not the app shell; image-based PDFs) |
| `hi-fi_mockup/Hi-Fi_mockup.md` | Sidebar, typography, radii, status tags, breakpoints, toast, confirm dialogs, Customer module column preview |
| `hi-fi_mockup/High Fidelty Wireframe.pdf` | Design board; image-heavy, text not machine-readable in this environment; content cross-checked through the handoff and fix list |
| `built screens and fix list/S1-UIX-05-Fix-List.md` | Responsive and accessibility findings applied to the wireframes |
| `built screens and fix list/screenshots/*` | Built sidebar, toolbar, table, status-pill and dialog styling |
| `Design System and visual foundation for the Hope, Inc/style.css` | Token values, control height, radii, table, badges, dialog |
| `Design System and visual foundation for the Hope, Inc/README.md` | Token-usage rules |
| `Design System and visual foundation for the Hope, Inc/index.html` | Component examples |
| `Hope, Inc (ui-ux)/index.html`, `style.css`, `script.js`, `README.md` | Built app shell and Customer module pattern (read-only; not in the requested list but referenced by the fix list) |
| `db/migrations/001_hope_base_structure.sql` | CUSTOMER columns and constraints |
| `db/migrations/002_hope_sample_data.sql` | Sample customer records used in the wireframes |
| `db/migrations/003_user_management.sql` | Customer rights catalogue (3 rights) |
| `db/migrations/009_active_customer_product_views.sql` (branch `origin/feature/S2-DBA-01-active-views`) | `active_customers` view definition |
| `Acceptance-Criteria.md` | AC-11, AC-12, AC-13 for validation and error feedback |
| `docs/User-Management-Design.md` | Rights catalogue and access model |

---

## 7. Review instructions

1. Open `customer-wireframes.html` in a browser (no server or build step needed).
2. Use the sticky section nav to walk screens 01–09.
3. Read the annotation cards under each screen — they record the source and the open question for that screen.
4. Cross-check §4 and §5 before the design owner signs off; several items need a decision, not a redesign.

## 8. Definition-of-Done note

Issue #110 requires the wireframes to be committed through a single-responsibility PR that says `Closes #110`, peer-reviewed, and merged into `main`. This package was intentionally **not** committed or pushed, per the task instruction. To close the issue, copy the package into the repository (or attach it to the PR), open the PR from a `feature/S2-UIX-01-...` branch, link the issue, and request peer review.
