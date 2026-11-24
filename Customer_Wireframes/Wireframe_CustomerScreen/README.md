# S2-UIX-01 — Customer wireframes (Issue #110)

Low/mid-fidelity wireframe package for the Customer module, prepared for
[Issue #110](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/110).

!Notice! <p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=14&duration=4000&pause=1500&color=3FB950&background=00000000&center=true&vCenter=true&width=420&height=30&lines=By+UI/UX:+Usr-Chr0nos.;Let%27s+build+something+great." alt="Thanks for stopping by" />
</p>

**RUN THE HTML:** Run `customer-wireframes.html` using Live Preview on VS Studio for full overview of the ui/uix design interface for user/customer wireframe

**Open this first:** `customer-wireframes.html` — double-click it, or run
`xdg-open customer-wireframes.html`. It is a single static page with no build step,
no server, and no external assets.

## Contents

| File | What it is |
| --- | --- |
| `customer-wireframes.html` | The wireframe set: overview and flow, list, search/filter states, create form (with payment terms), edit form, detail view, deactivate confirmation, blocked deactivation, restore confirmation, responsive variants, and state/permission/token notes. |
| `customer-wireframes.css` | Wireframe styling built from the Hope, Inc. design-system tokens and the approved 240 px sidebar shell. |
| `S2-UIX-01-screen-spec.md` | Developer-facing specification: screen inventory, toolbar/column/field definitions, validation, state matrix, permission matrix, responsive and accessibility notes, out-of-scope list. |
| `S2-UIX-01-deliverables.md` | Deliverable register: purpose, acceptance-criterion mapping, source files, format/location, gaps, inconsistencies, and open questions. Start here for the audit trail. |
| `issue-110.json` | Exact GitHub issue payload used for this work (title, body, labels, assignee, milestone, comments). |

## Coverage against the issue

- Customer list with search and status/payment-term filters
- Create and edit forms including the `payTerms` (payment terms) field
- Customer detail view
- Soft delete (deactivate) with a blocked-by-related-records state
- Restore from the Inactive filter
- Layout aligned to the approved main-page sidebar and design system

## What this package is not

- It is not production code, an API contract, or a database migration.
- It was not written into the repository, committed, or pushed. Issue #110's DoD
  still requires a single-responsibility PR with `Closes #110`, peer review, and merge.
- It does not resolve the reference conflicts listed in
  `S2-UIX-01-deliverables.md` §4. Those need a design-owner decision.

## Note on the source PDFs

`hi-fi_mockup/High Fidelty Wireframe.pdf`, the landing-page PDFs, and the login
wireframe PDF are image-heavy design boards. Text extraction was not reliable in this
environment, so the written handoff (`Hi-Fi_mockup.md`) and the built preview were used
for the Customer and shell details. None of those PDFs contains a Customer screen.
