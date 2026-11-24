# C09–C11 · Deactivate, blocked deactivate, restore

**Mockups:** `assets/customer/c09-customer-deactivate.png`, `c10-customer-deactivate-blocked.png`, `c11-customer-restore.png`
**Viewport:** 1440 × 900 desktop, dimmed app shell behind each dialog
**Issue:** #112 (S2-UIX-03); derived from #110 / #92
**Status:** For design review

---

## 1. Purpose and states

Customer deletion is **soft**: the row is kept and `status` changes between `Active` and `Inactive`. Deactivation is blocked when related sales records exist.

| ID | Dialog | Trigger | Result |
| --- | --- | --- | --- |
| C09 | Deactivate confirmation | Deactivate on an Active customer | Confirm → Inactive; Cancel → no change |
| C10 | Deactivate blocked | Confirm when related sales exist | Close; customer stays Active |
| C11 | Restore confirmation | Restore on an Inactive customer | Confirm → Active; Cancel → no change |

---

## 2. Layout

- App shell behind a `rgba(8,20,28,.58)` backdrop.
- Dialog: 520 px wide, white, radius 18 px, 1 px border, 26 px padding, `--shadow-md`.
- Header: 42 px circular icon (danger/warn/success tint), title (21 px/700), supporting copy.
- Optional inset body block for impact or “no data changed” copy.
- Footer: right-aligned Cancel plus the confirming action.
- C09 uses a red danger button; C10 uses a single primary Close; C11 uses a teal primary Restore because restoring is not destructive.

---

## 3. Content specification

| Element | C09 Deactivate | C10 Blocked | C11 Restore |
| --- | --- | --- | --- |
| Icon | Danger `!` | Warning `!` | Success `✓` |
| Title | “Deactivate Acme Corporation?” | “This customer can’t be deactivated” | “Restore Umbrella Corp?” |
| Supporting copy | Marked Inactive, hidden from active list, record kept and can be restored | Has related sales records; resolve/reassign first | Marked Active and appears in the active list again |
| Body | “Existing sales records are not changed.” | “The customer stays Active. No data is changed.” | — |
| Actions | Cancel / Deactivate customer | Close | Cancel / Restore customer |

These strings are grounded in #92 and the `CUSTOMER.status` comment. The Sprint 1 prototype's “This cannot be undone” copy describes a hard delete and must not be reused.

---

## 4. Data / field effects

| Action | Field | Change | Notes |
| --- | --- | --- | --- |
| Deactivate | `CUSTOMER.status` | `Active` → `Inactive` | No physical delete. |
| Deactivate | `CUSTOMER.stamp` | Audit text updated | Exact stamp format is existing free text; not defined here. |
| Restore | `CUSTOMER.status` | `Inactive` → `Active` | No other field changes. |
| Restore | `CUSTOMER.stamp` | Audit text updated | Same caveat. |
| Blocked deactivate | — | No change | Triggered by `SALES.customer_id` → `CUSTOMER` `ON DELETE RESTRICT`. |

There are no editable fields in these dialogs. The customer name is contextual text, not an input.

---

## 5. Validation and error handling

| Case | Behaviour |
| --- | --- |
| Confirm deactivate with children | Show C10 instead of committing. |
| Child records disappear between check and write | Server must re-check the RESTRICT relationship and return a safe error. |
| Permission denied | Do not open the dialog; server returns a clear error if called directly. |
| Network/server error | Keep the dialog open or return to the list with a clear message; **exact pattern not specified**. |
| Success | Close dialog; row leaves the current status view; bottom-centre toast for ~2.2 s (“Customer deactivated” / “Customer restored” — proposed). |

---

## 6. Responsive behaviour

| Width | Behaviour |
| --- | --- |
| > 860 px | Centered 520 px dialog. |
| ≤ 860 px | Dialog remains centered over the overlay. |
| ≤ 680 px | Dialog width becomes `min(100% - 32px, 520px)`; body copy wraps; actions stay visible. |
| Phone (~390 px) | Dialog uses 16 px side margins; footer buttons wrap if needed but must not be pushed below the viewport. |

The fix list's RD-01 finding requires the action footer to stay visible while dialog content scrolls.

---

## 7. Role / permission visibility

| Dialog / action | Right | Without the right |
| --- | --- | --- |
| Deactivate | `CUSTOMER_DELETE` | Action hidden; direct API call denied |
| Restore | **Undefined** (#92 says “delete/manage”) | Do not ship until the rule is approved; prototype shows Super Admin |
| Blocked dialog | Same as Deactivate | Not reachable without `CUSTOMER_DELETE` |
| Cancel / Close | None | Always available |

Super Admin implicitly holds all rights in the prototype; Admin grants only held rights. Server-side enforcement is mandatory.

---

## 8. Open items (do not invent)

1. Restore authorization — `CUSTOMER_DELETE`, a new right, or a manage rule?
2. Should the blocked dialog list or link the blocking sales records?
3. Exact success-toast strings and duration (2.2 s is from the handoff).
4. Audit stamp format and whether the UI writes it or the database does.
5. Whether deactivation is allowed from the detail view when the record is already Inactive (it should not be shown).

Sources: Issue #110, #92; `S2-UIX-01-screen-spec.md` §5–§7; `db/migrations/001_hope_base_structure.sql` (CUSTOMER, SALES); `hi-fi_mockup/Hi-Fi_mockup.md`; `built screens and fix list/S1-UIX-05-Fix-List.md` (RD-01).
