# [S1-UIX-05] Usability Review and UI/UX Fix List

**Issue:** [#42](https://github.com/SKCuarte/2BSIT-2_AltF4Project/issues/42)  
**Review date:** 2026-11-13  
**Review status:** Audit of the supplied UIX-05 branch preview complete; the design-baseline conflict is documented as a follow-up finding.  
**Severity key:** Blocker = the review/design decision cannot be completed reliably; High = core workflow or accessibility failure; Medium = noticeable friction or hidden action; Low = readability/polish improvement.

## Scope and evidence

The review uses the supplied branch `S1-UIX-05]-Usability-review-of-built-screens-and-fix-list` at commit `23b40a1` (`Updated hi-fi wireframe`). The previously named `feature/S1-UIX-05]-repo_setup` branch is not present.

The audited screens were rendered from `Hope, Inc (ui-ux)/index.html` with its branch-matched CSS and JavaScript. The preview README identifies it as a static demo using sample data and browser storage, not the production API/authentication service. The Next app under `web/app` presents registration at its root. This report treats the supplied UIX-05 branch preview as the audit build; it does not claim a review of a separately deployed production environment.

**Viewports captured:** 1440×900 desktop, 768×1024 tablet, and 390×844 phone. A 195×422 CSS viewport was also captured as a 200%-equivalent layout stress check for a 390×844 display; this is not a native browser-zoom test. Firefox 158.0.1 headless was used to capture the branch preview. Roles/states covered: Login and invalid-login feedback; Super Admin dashboard and User Management; Admin User Management and restricted Rights dialog; Super Admin Rights dialog with 36/36 rights selected.

## Design-reference blocker

The branch contains conflicting Hi-Fi guidance. The revised PDF and `Hi-Fi_mockup.md` do not consistently show the same dashboard and rights model:

- PDF page 6 shows a dashboard without module tiles or an “Edit content” action. The handoff describes an “Edit content” action and five tiles, including User Management and Reports & Settings, with rights counts. The preview shows five tiles, but they are Customer, Product, Human Resources, Sales, and Reports, without rights counts.
- PDF page 14 shows an older rights catalogue; page 17 shows the revised 36-right catalogue used by the preview.
- PDF page 1 shows “Welcome back” / “Sign in”; the handoff text specifies “Log in.”

**Action:** Design owner should identify the canonical Figma frames or approved PDF pages and update the handoff/PDF to remove superseded states. Until that decision is recorded, treat dashboard tile labels/counts and login copy as reference questions rather than confirmed implementation defects.

## Fix list

| ID | Screen | Severity | Finding and user impact | Recommended developer action | Evidence |
|---|---|---|---|---|---|
| REF-01 | Dashboard, Login, Rights | **Blocker** | The approved design source is ambiguous across the PDF and handoff. Developers cannot tell which dashboard tiles, top-bar actions, login wording, or rights catalogue are final. | Confirm one canonical Figma/PDF version; update the other artifact and identify the exact page/frame in follow-up UI tickets. | [Dashboard tile/reference callout](screenshots/callouts/dashboard-tiles.png); PDF pages 1, 6, 14, 17 in `hi-fi_mockup/High Fidelty Wireframe.pdf`. |
| A11Y-01 | Login | **High** | Invalid-login feedback uses `#c0392b` on the dark dialog `#18272d`, calculated at **2.82:1**. It is small, normal-size text and is difficult to read. | Use a dark-theme error token that reaches at least 4.5:1 against the dialog background; verify error and blocked-account states. | [Error contrast callout](screenshots/callouts/login-error-contrast.png) |
| FONT-01 | Login | **High** | At the 195×422 CSS viewport simulation, the login heading breaks mid-word (“Welc / ome / back”), while supporting copy wraps one or two words per line. The dialog becomes difficult to scan at this narrow effective width. | Reduce modal side padding at narrow widths, use a responsive title size, preserve word-boundary wrapping, and check for horizontal page overflow at 200% browser zoom. | [Narrow-width login callout](screenshots/callouts/login-200-equivalent.png) |
| A11Y-02 | Login | **Medium** | The unfocused password field border `#30434a` against its fill `#142329` is **1.56:1**; the field fill against the dialog `#18272d` is **1.05:1**. The control boundary is faint before focus. | Increase the unfocused field border/fill distinction to at least 3:1, then check both light and dark themes. | [Input-boundary contrast callout](screenshots/callouts/login-input-contrast.png) |
| RD-01 | Rights Dialog | **Medium** | At both 1440×900 and 390×844, the five rights cards extend below the visible dialog area; “Save rights” and “Cancel” are below the fold. The internal dialog is scrollable, but there is no clear scroll cue or visible action footer. | Keep the save/cancel footer visible or sticky while cards scroll; add a subtle scroll cue and confirm keyboard access to the footer. | [Desktop callout](screenshots/callouts/rights-desktop.png); [phone callout](screenshots/callouts/rights-mobile.png) |
| UM-01 | User Management | **Medium** | At 390px, the table shows only the first few columns; row actions are off-screen and there is no visible indication that the table can be swiped horizontally. This makes Edit/Rights/Block/Delete hard to discover. | Add a visible horizontal-scroll cue or keep row actions available through a compact card/action-menu layout on phones. Preserve the horizontal table behavior at tablet widths if retained. | [Phone table callout](screenshots/callouts/user-management-mobile.png) |
| FONT-02 | User Management | **Medium** | At the 195×422 CSS viewport simulation, the search field is clipped at the right edge and the title/toolbar consume most of the initial view. | Verify native 200% zoom; ensure controls fit the viewport, allow search text to remain visible, and avoid horizontal page scrolling. | [Narrow-width User Management callout](screenshots/callouts/users-200-equivalent.png) |
| D-01 | Main Dashboard | **Medium** | The sidebar profile truncates “Super Admin” to “Super Ad…” at desktop width, though the role is also shown below. The handoff calls for the full name in the profile block. | Let the name wrap or allocate more profile width; move Log out below/adjacent at narrow sidebar widths rather than ellipsizing the identity. | [Profile-name callout](screenshots/callouts/dashboard-profile.png) |
| D-02 | Main Dashboard | **Medium** | The welcome message tells a Super Admin, “Contact an admin if you need elevated permissions.” The instruction does not match the displayed role. | Make the welcome copy role-aware, or use neutral permissions guidance that also makes sense for Admin/Super Admin. | [Role-copy callout](screenshots/callouts/dashboard-copy.png) |
| D-03 | Main Dashboard | **Medium** | Module tile descriptions are ellipsized even at 1440px (for example, “Customer records and…”). This hides the context the tile is meant to provide. | Allow a short second line or show the full description on focus/hover; avoid relying only on a tooltip. | [Tile-description callout](screenshots/callouts/dashboard-tile-copy.png) |
| A11Y-03 | Rights Dialog | **Low** | Admin-disabled right labels render at approximately **2.84:1** after opacity is applied, making the labels very faint. Disabled controls are exempt from the WCAG text minimum, so this is logged as a readability improvement, not a conformance failure. | Keep disabled rights distinguishable while retaining readable labels; use text/icon/tooltip cues alongside reduced emphasis. | [Disabled-rights callout](screenshots/callouts/rights-disabled-text.png) |

## Coverage notes

| Screen | States reviewed | Responsive observations |
|---|---|---|
| Login | Normal and invalid-credential state | Card fits at 390px; narrow-width stress shows mid-word title wrapping and cramped copy. Contrast reviewed for normal fields and error feedback. |
| Main Dashboard | Super Admin | Sidebar is 240px and collapses below 860px. Stat cards stack at phone width. Profile name truncates; role copy is inappropriate for Super Admin. Tile descriptions are clipped. Tile labels/counts need the design baseline decision in REF-01. |
| User Management | Super Admin and Admin | Admin role filter and Delete action are hidden; Admin sees User rows only. Toolbar stacks at 390px. Table actions require horizontal scrolling at phone/tablet widths. |
| Rights Dialog | Admin-restricted and Super Admin 36/36 | Five-card layout is legible at desktop; Admin-disabled controls are very faint. The footer is below the visible viewport on desktop and phone. |

Spacing and alignment are generally consistent at desktop: page content and headings align, the sidebar is 240px, and the cards use consistent gaps. The preview uses a 16px body font and responsive headings. The narrow-width stress screenshots reveal text wrapping/clipping that should be checked in a real browser at 200% zoom on the deployed build.

## Accessibility references

For WCAG 2.2 AA, normal text requires at least 4.5:1 contrast and large text at least 3:1 ([W3C SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)). Visual information needed to identify active controls and states generally requires at least 3:1 ([W3C SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)). Contrast ratios above were calculated from the CSS color tokens in the reviewed branch.

## Before closing issue #42

1. Confirm the authoritative Figma/PDF baseline and use REF-01 to resolve the dashboard/right-catalogue reference conflict.
2. If the issue owner requires a separately deployed build, record its URL/version and add a final screenshot pass; this package is evidence for the supplied branch preview.
3. Include this fix list and the annotated screenshots in the PR, create/link developer tickets for accepted findings, and use `Closes #42` in the PR description.
