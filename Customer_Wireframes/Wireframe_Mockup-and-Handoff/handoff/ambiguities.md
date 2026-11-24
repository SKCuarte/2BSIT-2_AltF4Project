# Consolidated ambiguities and open decisions

These are the points where the issue, linked tickets, database, and approved references do **not** agree or do not define a rule. The mockups show a grounded proposal and label the gap; nothing below was invented as a requirement.

**Owner:** product/design owner plus the backend developer for schema/API items. Resolve before implementation or mark the chosen rule in the issue.

---

## Customer

| ID | Ambiguity | What the sources say | Impact | Proposed handling |
| --- | --- | --- | --- | --- |
| A1 | Approved list columns | Handoff: Name, Email, Phone, Status. Database: `customer_id`, `customer_name`, `customer_address`, `terms`, `status`, `stamp`. No email/phone columns. | The list cannot show both sets without schema work. | Mockup follows the database; confirm the canonical set. |
| A2 | `payTerms` vs `terms` | Issue/#91 use `payTerms`; migration 001 names the column `terms`; #86 proposes NOT NULL/CHECK but no such migration is in `main`. | API/field naming and validation. | UI label “Payment terms”; confirm column/API name and required rule. |
| A3 | Customer ID entry | Schema makes `customer_id` the PK; no source says typed or generated, or editable. | Create/edit UX and duplicate handling. | Mockup shows manual entry on create, read-only on edit; confirm. |
| A4 | Customer Restore right | Catalogue has `CUSTOMER_ADD`, `CUSTOMER_EDIT`, `CUSTOMER_DELETE`; #92 says “delete/manage rights”. | Cannot enforce restore safely. | Hide Restore until a right/rule is approved. |
| A5 | Customer view right | #90 assumes a “Customer view permission”; catalogue has no view right. | List/detail access control. | Treat as module access pending a decision. |
| A6 | Detail contents | #110 names a detail view in the objective; no reference shows one. | Scope of C08. | Minimal read-only view; confirm fields and related-sales panel. |
| A7 | Blocked deactivation detail | #92 requires blocking when children exist; no source says whether to list or link the records. | Support workflow. | Generic message; confirm whether to list sales. |
| A8 | Payment-terms values | `terms` is `VARCHAR(20)`; comment lists Net 30/45, COD, Prepaid, Net 15. #86 proposes CHECK. | Filter and form options. | Use the comment values; confirm final list. |
| A9 | Success/error strings | #91 requires feedback; exact strings are not approved. | Copy consistency. | Mark toast/duplicate-ID strings as proposals. |
| A10 | Pagination/sorting | Not specified for Customer; User Management has pagination. | List performance and scope. | Not shown; confirm whether required. |
| A11 | Empty/loading/error states | Only AC-12's general error rule applies. | State coverage. | Flag as unspecified; do not invent copy. |
| A12 | Form container | Existing module uses an inline panel; design system also has a dialog. | Layout and navigation. | Mockup uses inline panel; confirm. |
| A13 | Mobile pattern | UM-01 recommends keeping actions visible; no approved Customer mobile spec. | Phone layout. | Mockup uses stacked cards. |
| A14 | Dark theme | Design system supports dark; issue does not request a dark Customer screen. | Scope. | Light theme only. |

---

## Product

| ID | Ambiguity | What the sources say | Impact | Proposed handling |
| --- | --- | --- | --- | --- |
| A15 | Product view right | Catalogue has add/edit/delete product but no view right. | List/detail access. | Module access proposed; confirm. |
| A16 | Product Restore right | #95 requires restore; catalogue has no restore right. | Cannot enforce restore safely. | Hide until approved. |
| A17 | Product ID entry | `VARCHAR(6)` PK; no source says typed/generated or editable. | Create/edit UX. | Manual entry on create, read-only on edit; confirm. |
| A18 | Product name required? | `product_name VARCHAR(30)` is nullable in migration 001. | Validation. | UI marks it required; confirm server rule. |
| A19 | Unit required? | `unit VARCHAR(10)` has a CHECK but is nullable. | Validation. | UI marks it required; confirm server rule. |
| A20 | Category filter | #93 mentions category/unit filtering; schema has `unit` and no category column. | Filter scope. | Show unit only; confirm category is out of scope. |
| A21 | Search fields | #93 says search; exact fields not specified. | Query design. | Placeholder “product ID or name”; confirm. |
| A22 | Current-price as-of date | #97 allows current/selected date; no date control is approved. | Price resolution UI. | Show “as of 2026-11-24”; confirm today-only or date picker. |
| A23 | Price-history access rule | No View Price right; unclear whether any `PRICE_*` right opens the modal. | Visibility of price data. | Proposed any `PRICE_*` or a new view rule; confirm. |
| A24 | Add Product creates a price? | Not specified. | Onboarding workflow. | Do not create a price automatically; confirm. |
| A25 | Product list “View” action | No named view right; “View” may be module access or a route. | Action visibility. | Mark V as open. |
| A26 | Pagination/sorting | Not specified for Product. | List scope. | Not shown; confirm. |

---

## Price History

| ID | Ambiguity | What the sources say | Impact | Proposed handling |
| --- | --- | --- | --- | --- |
| A27 | Delete price semantics | Migration gives `PRICEHIST` a `status` and `stamp`; #96 says delete entries. | Data retention and current-price recomputation. | Confirm hard delete vs `status = 'Inactive'`. |
| A28 | Effective-date editability | `effective_date` is part of the composite PK. | Edit flow and duplicate handling. | Mockup keeps it read-only on edit; confirm. |
| A29 | Duplicate effective date | Composite PK makes duplicates impossible; #96 says reject invalid/duplicate dates. | Add/Edit validation. | Reject with a field error; confirm copy and whether an upsert is allowed. |
| A30 | Zero price | DB CHECK allows `unit_price >= 0`; #96 does not say whether zero is free or invalid. | Validation and display. | Treat as valid per DB; confirm product rule. |
| A31 | More than two decimals | `NUMERIC(10,2)`; rounding/rejection rule not specified. | Validation. | Confirm round vs reject. |
| A32 | Status labels | DB stores `Active`/`Inactive`; the UI shows Current/Historical/Future. | Mapping and filtering. | Confirm the label mapping and whether older active rows are “Historical”. |
| A33 | Deleting the current price | Not specified what happens to sales or the next applicable price. | Data integrity. | Confirm recomputation and sales behavior. |
| A34 | Empty Price History | Not specified. | State coverage. | Propose an in-modal empty state; do not ship a blank table. |
| A35 | Success/failure copy | Exact strings not approved. | Copy consistency. | Mark as proposals. |

---

## Cross-cutting

| ID | Ambiguity | Impact | Proposed handling |
| --- | --- | --- | --- |
| A36 | Toast duration/placement | Handoff says bottom centre, ~2.2 s; exact strings vary. | Feedback consistency. | Use the handoff timing; confirm strings. |
| A37 | Touch-target size | No approved mobile spec; mockup buttons are 32 px high. | Accessibility. | Recommend ≥ 44 × 44 px on touch. |
| A38 | Tablet pattern | Table with horizontal scroll cue vs cards. | Responsive behaviour. | Retain table with cue; confirm. |
| A39 | Audit stamp format | `stamp VARCHAR(80)` free text; no format contract. | Display and writes. | Display as stored; confirm who writes it. |
| A40 | Dark theme | Design system supports it; issues do not request dark screens. | Scope. | Light theme only; confirm. |
| A41 | Loading/error states | Largely unspecified beyond AC-12. | Completeness. | List as gaps; do not invent copy. |
| A42 | Server-side enforcement | Every source says hiding is not enough. | Security. | API must enforce the same right as the UI. |

---

## Repository / branch items (not design requirements)

- The remote branches carry a `]` in their names: `feature/S2-UIX-01]-repo_wireframe` and `feature/S2-UIX-02]-repo_product/price_wireframe`. The task's `feature/S1-UIX-04-repo_setup` maps to the existing `feature/S1-UIX-04]-repo_setup`.
- The S2-UIX-01 vs S2-UIX-02 test merge conflicts on six rename/delete paths (see the root `README.md`). No merge was performed.
