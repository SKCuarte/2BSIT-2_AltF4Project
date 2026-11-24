# C12 · Customer responsive behaviour

**Mockup:** `assets/customer/c12-customer-mobile.png` (390 × 844)
**Desktop reference:** `assets/customer/c01-customer-list.png`
**Issue:** #112 (S2-UIX-03); derived from #110 and the S1-UIX-05 fix list
**Status:** For design review

---

## 1. Breakpoint contract

| Width | Layout |
| --- | --- |
| > 860 px | 240 px sidebar open by default; six-column table; toolbar in one row. |
| ≤ 860 px | Sidebar becomes an overlay and starts closed; content uses full width; table may scroll horizontally with a visible cue. |
| ≤ 680 px | Toolbar stacks; search spans the row; filters and Add customer follow; multi-column forms/details become one column. |
| Phone (~390 px) | Table becomes stacked customer cards; row actions stay visible; no horizontal page scroll. |

These breakpoints come from the approved Hi-Fi handoff. The card pattern follows the S1-UIX-05 UM-01 recommendation to keep row actions discoverable on phones.

---

## 2. Phone layout (C12)

- 60 px top bar with hamburger, “Customer” title, role badge.
- Page title 23 px; supporting line 12 px.
- Toolbar grid:
  - Search spans both columns.
  - Status and payment-terms selects share one row.
  - Add customer spans both columns as a full-width primary button.
- Customer cards, 1 px border, radius 14 px, 14 px padding:
  - Name (14 px/700) and status pill on one row.
  - ID + payment terms on a meta line.
  - Address on a second meta line.
  - Actions on a wrapped row: Edit + Deactivate for Active; Edit + Restore for Inactive.

---

## 3. Field / content behaviour

| Desktop element | Phone treatment | Notes |
| --- | --- | --- |
| Customer ID | Meta line | Prefix with the ID, e.g. “C-001 · Net 30”. |
| Customer name | Card title | Tap target for detail. |
| Address | Meta line | Wrap at word boundaries; do not truncate mid-word. |
| Payment terms | Meta line | Keep the label or a clear separator. |
| Status | Pill | Text label remains; not colour alone. |
| Actions | Wrapped button row | Do not hide behind horizontal scroll. |
| Result count | Below the card list (proposed) | Not shown in the phone mockup to preserve vertical space; the desktop note remains the source. |

---

## 4. Interaction details

- Minimum touch target 44 × 44 px is recommended; the mockup's small buttons are 32 px high and must be enlarged or padded on touch devices. This is a **recommendation**, not an approved requirement.
- Search and filters update the card list without a page reload.
- The Add customer button remains full width and visible.
- Dialogs (deactivate/restore) use 16 px side margins and keep their footer actions visible.
- At 200% zoom / 195 px effective width, avoid clipped toolbars and mid-word title wrapping (FONT-01/FONT-02).

---

## 5. Role / permission visibility

The phone cards use the same rules as desktop:

| Action | Right | Without the right |
| --- | --- | --- |
| Add customer | `CUSTOMER_ADD` | Button hidden |
| Edit | `CUSTOMER_EDIT` | Button hidden |
| Deactivate | `CUSTOMER_DELETE` | Button hidden |
| Restore | Undefined | Hidden until approved |
| View detail | No named Customer view right | Undecided |

Hiding an action on a card is not authorization; the API must enforce the right.

---

## 6. Open items

1. Whether phone uses cards or a horizontally scrolling table (UM-01 recommends cards).
2. Whether the result count is shown on phone.
3. Touch-target size standard.
4. Whether filters collapse behind a “Filters” control on very small screens; the mockup keeps them visible.
5. Tablet behaviour: retain the table with a scroll cue (proposed) or switch to cards earlier.

Sources: `hi-fi_mockup/Hi-Fi_mockup.md` (breakpoints, sidebar overlay); `built screens and fix list/S1-UIX-05-Fix-List.md` (UM-01, FONT-01, FONT-02); `S2-UIX-01-screen-spec.md` §8.
