# Hope, Inc. ERP — V2 Visual Review Package

**Location:** `/home/blck/Documents/Hope, Inc/Wireframe_Built-Screen/V_2/`

**Prepared:** 2026-11-25

**Scope:** Customer, Product, and Price History approved screens and standardized UI states.

## Package contents

| Folder / file | Contents |
| --- | --- |
| `screenshots/` | PNG captures of the cover, screen index, approved boards, and state boards |
| `screenshots/customer/` | C01–C12; desktop captures are 1440×900 and C12 is 390×844 |
| `screenshots/product/` | P01–P07; desktop captures are 1440×900 and P07 is 390×844 |
| `screenshots/price-history/` | PH01–PH06; desktop captures are 1440×900 and PH06 is 390×844 |
| `screenshots/states/` | Empty, no-results, validation, load/save error, soft-delete, and blocked-delete boards |
| `pdf/` | Combined and module/state PDF decks |
| `src/` | HTML/CSS and scripts used to render the package; approved mockup HTML was copied as local source |
| `Usability-Review-v2.md` | Read-only usability audit and implementation blockers |
| `Polish-Fix-List-v2.md` | Screen-by-screen issue and fix list |

## PDF decks

- `V2-Customer-Product-Price-History.pdf` — combined 46-page package
- `V2-Customer.pdf` — Customer package
- `V2-Product.pdf` — Product package
- `V2-Price-History.pdf` — Price History package
- `V2-States.pdf` — cross-module standardized states

## Visual coverage

### Customer

C01–C12: list, filtered list, no-match, inactive, create, create validation, edit, detail, deactivate, blocked deactivate, restore, and phone list.

### Product

P01–P07: list, no-match, create, edit validation, detail, current-price states, and phone list.

### Price History

PH01–PH06: modal, add, edit validation, delete confirmation, restore product confirmation, and phone view.

### Standard states

- S1 Empty
- S2 No results
- S3 Field validation
- S4 Error summary
- S5 Load/API error
- S6 Save/API error
- S7 Confirm soft delete
- S8 Blocked delete

## Viewports

- Desktop: `1440 × 900`
- Phone: `390 × 844`

Phone captures are presented as 390×844 boards inside the PDF decks. The page itself remains a 1440×900 PDF canvas.

## Source and status

The PNG and PDF outputs were rendered with headless Firefox from the approved mockup HTML/CSS sources in:

- `Wireframe_Mockup-and-Handoff/mockups/`
- `Wireframe_Empty-Error-Confirm/mockups/`

These are design renders, not runtime captures of the Next application. The audited app snapshot does not yet contain implemented Customer, Product, or Price History pages. The original read-only reference folders and the existing files outside `V_2/` were not modified.

## Re-render

Run:

```bash
/home/blck/Documents/Hope, Inc/Wireframe_Built-Screen/V_2/src/render-v2.sh
/home/blck/Documents/Hope, Inc/Wireframe_Built-Screen/V_2/src/build-pdf-v2.sh
```
