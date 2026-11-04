# Hope, Inc. UI/UX Preview

This static prototype provides the S1-UIX-03 application wireframe and interaction preview:

- ERP dashboard with collapsible sidebar and rights-filtered module tiles
- Customer, Product, Human Resources, Sales, and Reports module views
- User Management list with search, status filters, add/edit, approval, and block/unblock actions
- Rights Assignment dialog with 36 per-action rights and Select All / Clear All controls
- Admin and Superadmin visibility states; Superadmin rights are granted implicitly

The permission groups follow the database catalog: Customer (3), Product (6), Human Resources (13), Sales (7), and Reports (7).

This is a front-end demonstration using sample data and browser storage. It is not connected to the production API or authentication service. See the repository's `db/migrations/003_user_management.sql` for the canonical rights labels and `docs/User-Management-Design.md` for authorization behavior.
