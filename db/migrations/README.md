# Migrations

Add forward-only PostgreSQL migrations here as `NNN_description.sql` (for example, `001_create_users.sql`). Files are applied in lexical filename order and each file plus its tracking row commits in one transaction. Migrations `001` and `002` create and seed the HOPE base tables, `003` creates the role/rights catalogue, `004` links profiles to Supabase Auth, `005` gates effective rights on application approval, `006` protects user-management tables from direct API-role writes, and `007` creates protected password reset/setup tokens.

Never change or remove an applied migration. Add a new numbered migration instead. Do not put `BEGIN` or `COMMIT` inside migration files; the runner owns the transaction. Audit logging objects are excluded here and reserved for Task 6.

`004_supabase_auth_profiles.sql` requires `public.app_user` and any existing `public.profiles` table to be empty before it adds the required Auth UUID FK and removes legacy password columns. It aborts before changing the schema when either table contains rows. Reconcile existing profiles with Supabase Auth through a separately reviewed backfill plan; never copy password hashes into `auth.users` or bypass the guard. Registration APIs should write to `app_user` by `auth_user_id`; delete an unlinked Auth account if its profile insert fails.

`006_lock_down_user_management_api_access.sql` enables RLS on `app_user` and `user_permission`, revokes their direct privileges from `PUBLIC`, `anon`, and `authenticated`, and grants the server-only `service_role` the needed table/sequence access. Do not expose the service-role secret to clients.

`007_password_reset_token.sql` derives the foreign-key column type from `app_user.id` and supports both `bigint` (the Task 3 migration chain) and `uuid` (the existing main project) without changing account IDs. It stores only 32-byte SHA-256 digests, enables RLS, and grants direct access only to `service_role`. `used_at` is a nullable timestamp rather than a boolean because it records when the token was consumed. The partial unique index allows at most one Active, unused token per user and purpose; it intentionally omits an expiry-time predicate because `now()` is not immutable and expiry changes without a row update. Issuance must deactivate the user's previous Active unused token in the same transaction before inserting its replacement.

Password token lifetimes are application configuration, not schema defaults: use 24 hours for `set_password` and 30 minutes for `reset_password`. Generate at least 32 cryptographically random bytes, encode them URL-safe, show/send the raw token only once, and store only its SHA-256 digest as 32 bytes. Email the link after the database transaction commits; in development, print it once to the console. Never log the raw token or its link. Use constant-time digest comparison in the application layer when comparing digest values; SQL equality is not a constant-time guarantee.

The current application uses Supabase Auth for password recovery; it does not consume this token table. For a future integration, validate a candidate digest with this query (bind `$1` as the 32-byte SHA-256 digest and `$2` as the requested purpose):

```sql
SELECT token.id, token.user_id, token.purpose
FROM public.password_reset_token AS token
JOIN public.app_user AS account ON account.id = token.user_id
WHERE token.token_hash = $1::BYTEA
	AND token.purpose = $2::TEXT
	AND token.used_at IS NULL
	AND token.expires_at > CURRENT_TIMESTAMP
	AND token.status = 'Active'
	AND account.status = 'Active'
	AND account.approval_status = 'Approved'
	AND account.is_blocked = FALSE
LIMIT 1;
```

Issue a new token in one server transaction. Bind `$1` to the app user ID, `$2` to the purpose, `$3` to the 32-byte digest, `$4` to the configured expiry timestamp, and `$5` to the optional client IP. The server must roll back if the account-lock query returns no row; commit before delivering the raw token.

```sql
BEGIN;
SELECT id
FROM public.app_user
WHERE id = $1
	AND status = 'Active'
	AND approval_status = 'Approved'
	AND is_blocked = FALSE
FOR UPDATE;

UPDATE public.password_reset_token
SET status = 'Inactive',
		stamp = 'INVALIDATED system ' || to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD FMHH12:MI AM')
WHERE user_id = $1
	AND purpose = $2
	AND status = 'Active'
	AND used_at IS NULL;

INSERT INTO public.password_reset_token (
		user_id, purpose, token_hash, expires_at, requested_ip
)
VALUES ($1, $2, $3, $4, $5);
COMMIT;
```

When a token is redeemed, update it conditionally in the same transaction as any database password operation: set `used_at = CURRENT_TIMESTAMP`, `status = 'Inactive'`, and a `USED system ...` stamp only when the token is still Active, unused, and unexpired and the account is still Active, Approved, and unblocked. A separate Supabase Auth API call cannot participate in that PostgreSQL transaction; design and test failure handling before enabling such an integration. Schedule this cleanup statement as a future team job; it removes expired and consumed rows:

```sql
DELETE FROM public.password_reset_token
WHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL;
```

Run `db/verification/password_reset_token_verification.sql` only against the disposable local/test database with the documented `auth.users` stub. It creates valid, expired, used, blocked, inactive, pending, and rejected-user fixtures inside a transaction, reports each expected validity result, checks API-role access, and rolls everything back. Never run it against hosted Supabase Auth or Production.

`008_protect_last_superadmin.sql` adds triggers on `app_user` and `role` that reject any change leaving no active, unblocked, approved Superadmin (including `service_role` writes).

`011_require_verified_registration_email.sql` adds an email verification
timestamp and blocks transitions to Approved unless the linked Supabase Auth
email is confirmed and matches. Existing Pending accounts are not backfilled.
The trigger owner needs read access to `auth.users`; its functions, privileges,
Auth column availability and behavior must be verified in a disposable DEV
database before deployment. The minimal local Auth stub must also provide
`email` and `email_confirmed_at`; existing verification fixtures require
adaptation for the new approval rule. See `web/README.md` for the required
invitation template and Auth configuration.

`012_reserve_password_setup_eligibility.sql` prepares a fail-closed reservation
for password setup. Eligibility changes, profile deletion and truncation are
rejected while the relevant reservation exists. An uncertain Auth request
leaves the reservation in place without automatic expiry; an administrator must
confirm with the Auth operator that no update remains in flight before a
privileged DB operator removes it. This may indefinitely delay account
blocking. Functions, ownership, isolation, privileges and concurrent behavior
must be verified in a disposable DEV database before deployment.

`009_protect_dashboard_module_data.sql` enables RLS and revokes direct API-role
access to business tables and the effective-rights view. All module reads and
writes must go through server code that verifies the authenticated user's
module and action rights before using `service_role`. Apply this migration
before exposing the dashboard; it intentionally disables any direct Supabase
client access to those tables.

`010_admin_implicit_effective_rights.sql` aligns the effective-rights view with
the dashboard: approved, active Admins and Superadmins have all active rights
implicitly; Users require active permission grants. Approval remains required
and blocked accounts must still be denied separately by the server. This Admin
policy requires Project Owner approval; do not treat its implementation as
approval. It conflicts with per-right restrictions for Admins and must be
resolved before deployment. The reported Student Guide interpretation gives
Admins operational module rights and User Management, but reserves
Superadmin-only actions and accounts for Superadmins. The current view grants
Admins every active catalogue right without classifying future additions; it
must not be used to authorize Superadmin-only actions. The grant/revoke policy
still requires separate approval. `005` and `010` select the same view columns in
the same order from the same source expressions, but this does not establish
compatibility with an existing deployment's view: inspect its column names,
types and order before applying `010`.

Run
`db/verification/user_management_verification.sql` only in a disposable local
or test database with its documented Auth fixtures after applying migrations.
The verification checks module-table RLS and API-role privileges as well as
effective rights. It targets the `003` BIGINT baseline, not the reported live
UUID schema, and cannot verify that schema without a reviewed adaptation. Review
role memberships, other exposed views and functions,
and any existing policies separately in the target environment.
The script writes synthetic fixtures in a transaction; rollback does not undo
identity-sequence advances. Use a disposable database, never a shared one. Its
last-Superadmin assertions require no pre-existing eligible Superadmin, which
the script checks before creating fixtures.

The script checks database view behavior and database privileges; it does not
establish that `hasRight` agrees with the view or verify live Supabase API
access. Compare both for User, Admin and Superadmin with active/inactive grants,
rights and modules in a representative Development project, and exercise
direct authenticated and anonymous access separately. Migration `009` grants
all table privileges to `service_role`; the team must review and narrow these
privileges in a forward-only migration after confirming server requirements.
Revoking write or administrative privileges can break existing server jobs or
other service-role consumers even if this dashboard currently only reads counts;
inventory and test those consumers before changing grants.

Before deciding whether `010` can replace a target view, inspect the target's
actual signature and definition using read-only queries:

```sql
SELECT attnum, attname, format_type(atttypid, atttypmod) AS data_type
FROM pg_attribute
WHERE attrelid = to_regclass('public.v_user_effective_rights')
  AND attnum > 0 AND NOT attisdropped
ORDER BY attnum;
SELECT pg_get_viewdef(to_regclass('public.v_user_effective_rights'), true);
```

Compare all existing columns, types, view options, grants, dependants, and
consumer expectations with `010`. PostgreSQL rejects incompatible changes to
existing column names, order or types. If incompatible, review a versioned view
and consumer migration rather than dropping the view and its dependants.

For a disposable local PostgreSQL database only, provision the Auth stub in
`db/README.md`, apply migrations in order, then run:

```powershell
psql -h localhost -U hope_app -d hope_dev -v ON_ERROR_STOP=1 -f db/verification/user_management_verification.sql
```

Expected: every catalogue row reports `passed = true`, the assertion blocks
complete without errors, and the fixture transaction ends with `ROLLBACK`.
The checks cover approved, pending, rejected, inactive and blocked accounts,
active and inactive grants, rights and modules, and API-role table privileges.
The view deliberately retains `granted = true` for a blocked account with an
active grant; server authorization must reject the blocked account separately.
Also check inherited role memberships, alternate views and functions, RLS
policies, sequences and existing foreign-key/audit triggers in the target test
environment. These checks do not prove direct Supabase access is restricted
until run against a representative database.

Migrations are forward-only. If an applied migration needs correction, use a
reviewed follow-up migration; recreating a disposable test database is the
development recovery option, not a production rollback procedure.
