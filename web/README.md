This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Dashboard authorization

The dashboard reads the active role and grants from the database on the server.
Admins and Superadmins have access to active modules with active rights; regular
users can open a module when they have at least one active right in it. Only Superadmins can
open System Settings. Dashboard counts are queried only for accessible modules.
If a count is unavailable, the server log identifies its module, HTTP status and
error code. Check the target development database's schema and permissions without
sharing credentials; a null count is not treated as zero.
For an accessible CUSTOMER, PRODUCT, HR or SALES module, a returned count-query
error or null count displays "Unavailable" in that tile's statistic. HR queries
`EMPLOYEE`; the other modules query their namesake tables. Other successful
counts can still be displayed. This is a degraded display, not a resolution or
acceptance of the underlying schema issue; thrown request errors or access
verification failures are not covered by this fallback.

The repository baseline creates the case-sensitive `public."PRODUCT"` with a
`status` column; the dashboard requests its tables from the default public
schema. `PGRST205` means PostgREST cannot find the requested table in its schema
cache, not that it is a general permission error. It does not by itself identify
why the table is missing from the cache. Without the affected project's database
and PostgREST error details, the root cause cannot be established. Do not
silently switch to another table or relax grants. If the correct relation exists
and the cache is stale, a DB Admin can review the
[PostgREST cache reload procedure](https://docs.postgrest.org/en/stable/references/schema_cache.html#schema-cache-reloading)
for that Development project.

On an authorized Development database, this read-only query shows exact and
case-variant relation names, `status` columns, and `service_role` privileges:

```sql
WITH wanted(name) AS (
  VALUES ('CUSTOMER'), ('PRODUCT'), ('EMPLOYEE'), ('SALES')
), relations AS (
  SELECT n.nspname AS schema_name, c.relname, c.relkind,
         EXISTS (SELECT 1 FROM pg_attribute a
                 WHERE a.attrelid = c.oid AND a.attname = 'status'
                   AND a.attnum > 0 AND NOT a.attisdropped) AS has_status,
         has_schema_privilege('service_role', n.oid, 'USAGE') AS schema_usage,
         has_table_privilege('service_role', c.oid, 'SELECT') AS table_select
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
)
SELECT wanted.name AS requested_name, relations.*
FROM wanted LEFT JOIN relations ON lower(relations.relname) = lower(wanted.name)
ORDER BY wanted.name, relations.schema_name, relations.relname;
```

Check `SELECT to_regclass('public.schema_migrations');` separately; if it is
present, inspect `filename`, `checksum` and `applied_at` in that table. Missing
ledger entries do not alone prove tables were not created by another process.
The repository runner uses root `.env` database settings, which must be checked
against the web app's Supabase project without disclosing credentials. Check
these separately:

- **Relation existence:** Compare the query's schema and exact case-sensitive
  names, including `PRODUCT` versus `product`, and check `has_status`.
- **PostgreSQL privileges:** Review `schema_usage` and `table_select` for
  `service_role`; these checks alone do not establish API access or RLS behavior.
- **PostgREST schema exposure:** In Supabase API settings, verify that the
  intended project's requested schema is exposed. SQL existence and privileges
  do not prove exposure.
- **Schema cache state:** A correct relation and exposure do not prove the cache
  is fresh. If evidence indicates a stale cache, a DB Admin can review a
  Development-only cache reload and retry the actual API request.

Do not use these checks as authorization to change Production or apply migrations.

The module and settings pages are placeholders until their features are built.
Apply database migration `009_protect_dashboard_module_data.sql` before exposing
the dashboard to prevent bypassing these checks through Supabase's direct API.

Next.js Proxy checks the registered dashboard and API module paths, redirecting
denied page requests to `/no-access` and returning HTTP 403 for denied API
requests. It fails closed for unmapped nested routes and mutations. When adding
an operation, explicitly map its route and action in `routeRequirement` and
also call `requireRight(module, action)` in the server page, route handler or
server action before reading or changing data. Actions are the exact active
`rights.action` values, e.g. `requireRight("CUSTOMER", "ADD")`; omitting the
action checks module access only. Handle unavailable and unauthenticated
results separately from forbidden results. Existing administrator APIs retain
their own stricter authorization checks.
Protected administrator APIs also reject accounts that must set a new password;
password setup remains available through the authentication endpoints.
Sign-in, password setup and protected access require `app_user.status = 'Active'`.
If that column is missing, access verification fails rather than treating an
unknown account state as active. Confirm the target schema before deployment;
this is not evidence that the reported live schema contains the column.
Dashboard access reads the account and role without separate schema probes,
and fails closed if active catalogue or assignment results are incomplete.
These changes have not been benchmarked against a real Supabase project.

Rights Management is read-only in this scope: draft selections are not saved and
the server rejects writes with `409 policy_pending`. Saving is follow-up work
blocked on Project Owner policy approval and DB Admin review; see the
[approval package](../docs/Task-7-Rights-Management-Approval.md). The implicit
Admin access described above also requires Project Owner approval before merge.
The reported Student Guide interpretation reserves Superadmin-only actions and
Superadmin account management for Superadmins; module access alone must never
authorize those operations. The catalogue currently lacks a classification for
Superadmin-only rights, so review future catalogue additions before enabling them.

### Registration email verification

Manual and administrator-created registrations remain Pending until Supabase
verifies the invitation email.
No registration claim is issued to the browser submitting the address. The email
owner must open the invitation before a Superadmin can approve the request.
Configure and test these prerequisites in an authorized Development environment:

- Apply the reviewed `011_require_verified_registration_email.sql` migration
  before deploying this application version. Its trigger requires a migration
  owner that can read `auth.users.email` and `email_confirmed_at`. It has not
  been executed or verified against a target database.
- Configure `APP_BASE_URL` as the exact application HTTPS origin (local HTTP is
  allowed only for localhost), add `<APP_BASE_URL>/auth/verify-email` to the
  Supabase Auth redirect allowlist, and configure working Auth email delivery.
- Set the Supabase **Invite user** email template link to
  `<a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}&amp;type=invite">Verify email</a>`.
  The default confirmation URL is not compatible with this callback. Configure
  a short Auth email OTP expiry (for example one hour) and test expiry and
  single use in DEV. Avoid email link scanners that consume tokens.
- Existing pending registrations are not automatically trusted or backfilled:
  older flows marked addresses confirmed without proof. A DB Admin must plan
  safe re-invitation and verify ownership before approval. Previously issued
  registration claims no longer work. Failed invitations or a verified link
  whose profile could not be saved require administrator-assisted recovery;
  do not manually mark email addresses verified. Legacy anonymous-registration
  password activation is disabled because it previously auto-confirmed email;
  those users need a separately reviewed verification and migration process.

The callback posts the one-time token to the server for Supabase Auth
verification. A matching Pending profile is marked verified before a new
HttpOnly registration claim is issued. Do not copy tokens or service-role keys
into logs, screenshots, templates, or client configuration. Google registrations
must have an Auth-confirmed email. This does not resolve the separate
password-setup/eligibility race without the separately prepared reservation
migration `012_reserve_password_setup_eligibility.sql`. That migration and its
concurrency guarantees are unverified. An uncertain Auth update retains its
reservation without expiry, preventing eligibility changes, including blocking,
until an Auth operator confirms no update remains in flight and a privileged DB
operator performs reviewed recovery. Never clear a reservation merely because
of its age or a request timeout; escalate if Auth cannot confirm completion.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
