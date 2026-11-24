# S2-UIX-02 — Screen Specification

## RUN `product-price-wireframes.html`  WITH LIVE SERVER ON VS STUDIO FOR PREVIEW

## Scope

Issue #111 requires wireframes for Product list/search, create/edit forms with `unit`, current-price display, and Price History management add/edit/delete controls. This document maps the wireframes to the issue and database; it does not add implementation requirements beyond grounded sources.

## Rights

The canonical 36-right catalogue defines:

- `ADD_PRODUCT` — Add Product
- `EDIT_PRODUCT` — Edit Product
- `DELETE_PRODUCT` — Delete Product
- `ADD_PRICE` — Add Price
- `EDIT_PRICE` — Edit Price
- `DELETE_PRICE` — Delete Price

It does not separately define View Product or View Price. A separate View right and Restore authorization remain open questions.

## Screen inventory

| Screen | Entry | Actions / right markers |
|---|---|---|
| Product list | Sidebar → Product | View, Edit, Deactivate/Restore, Price History, Add |
| Search/unit filter | Product list toolbar | Search and unit/status filters do not require separate controls beyond list/View access |
| Add product | Add Product button | Add Product |
| Edit product | Edit button or detail | Edit Product |
| Product detail | Product name or View | View, Edit, Deactivate/Restore, Price History |
| Current-price indicator | List and detail | Read-only derived display |
| Price History modal | Price History button | Open based on the module/view rule; Add/Edit/Delete Price separately |
| Add price | Add price button | Add Price |
| Edit price | Row Edit button | Edit Price |
| Delete price | Row Delete button | Delete Price |
| Restore product | Inactive Product row/detail | Restore rule/right is undecided |

## Product fields

| Field | Database column | Rules from sources |
|---|---|---|
| Product ID | `product_id` | `VARCHAR(6)`, primary key; entry/generation/editability open |
| Product name | `product_name` | `VARCHAR(30)`; migration 001 does not mark it NOT NULL |
| Unit | `unit` | `VARCHAR(10)`; CHECK allows `pc`, `ea`, `mtr`, `pkg`, `ltr`, `pcs`, `pair`, `can`, `meter` |
| Status | `status` | `VARCHAR(8)`, default Active, CHECK Active/Inactive |
| Last updated | `stamp` | `VARCHAR(80)` audit text; read-only |

Current price is **not** a Product field. It comes from active `PRICEHIST` rows whose effective date is on or before the display date, selecting the latest effective date.

## Price History fields

| Field | Database column | Rules |
|---|---|---|
| Effective date | `effective_date` | `DATE NOT NULL`; composite key `(product_id, effective_date)` |
| Unit price | `unit_price` | `NUMERIC(10,2)`, CHECK `unit_price >= 0` |
| Status | `status` | Default Active; CHECK Active/Inactive |
| Audit text | `stamp` | Read-only audit text |

The UI shows effective date, unit price, status, last updated, and Edit/Delete actions.

## Current-price states

| State | Wireframe behavior |
|---|---|
| Current | Teal/current-price card or row label; show effective date |
| Future-dated | Show scheduled/upcoming price but do not mark it current |
| No current price | Show “No current price” / “Not set,” never infer $0.00 |
| Multiple active rows | Latest effective date ≤ selected date wins |
| Deactivated product | Product Status is Inactive; Price History can remain available to authorized users |

## Validation / feedback

- Unit must match one of the database CHECK values.
- Unit price must be numeric and at least zero according to migration 001.
- Effective date is required and must be unique for the selected product according to Issue #96.
- Field-level errors appear below inputs.
- Create/edit success shows a bottom-centre toast for approximately 2.2 seconds.
- Add/edit/delete price errors should preserve entered values and explain duplicate dates or invalid prices.
- Delete actions use confirmation dialogs.

## Permission labels

| Badge | Meaning |
|---|---|
| V | View Product / module access rule |
| A | Add Product or Add Price (context makes it clear) |
| E | Edit Product or Edit Price |
| D | Delete Product or Delete Price |
| R | Restore Product (mapping undecided) |
| H | Open Price History / price-history management |

The UI should hide or disable controls without the matching right. Server-side checks remain mandatory for every action.

## Responsive behavior

- Above 860 px: 240 px sidebar open.
- At 860 px and below: sidebar overlay; starts closed.
- At 680 px and below: toolbar fields and buttons stack.
- Phone: compact product cards keep action buttons visible instead of hiding them in a horizontal table.
- Tablet: table may remain horizontal with a visible scroll cue.
- Price History modal: table can scroll internally while the title and footer remain usable.

## State/permission note

The wireframes mark permissions on every screen but do not claim that unlisted “View” or “Restore” rights already exist. Those issues must be resolved before implementation.
