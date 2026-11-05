# Migrations

Add forward-only PostgreSQL migrations here as `NNN_description.sql` (for example, `001_create_users.sql`). Files are applied in lexical filename order and each file plus its tracking row commits in one transaction. Migrations `001` and `002` create and seed the HOPE base tables, `003` creates the role/rights catalogue, `004` links profiles to Supabase Auth, `005` gates effective rights on application approval, `006` protects user-management tables from direct API-role writes, `007` creates protected password reset/setup tokens, and `008` records the logged-in application user in `audit_log` and every `stamp`.

Never change or remove an applied migration. Add a new numbered migration instead. Do not put `BEGIN` or `COMMIT` inside migration files; the runner owns the transaction.

`004_supabase_auth_profiles.sql` requires `public.app_user` and any existing `public.profiles` table to be empty before it adds the required Auth UUID FK and removes legacy password columns. It aborts before changing the schema when either table contains rows. Reconcile existing profiles with Supabase Auth through a separately reviewed backfill plan; never copy password hashes into `auth.users` or bypass the guard. Registration APIs should write to `app_user` by `auth_user_id`; delete an unlinked Auth account if its profile insert fails.

`006_lock_down_user_management_api_access.sql` enables RLS on `app_user` and `user_permission`, revokes their direct privileges from `PUBLIC`, `anon`, and `authenticated`, and grants the server-only `service_role` the needed table/sequence access. Do not expose the service-role secret to clients.

`007_password_reset_token.sql` derives the foreign-key column type from `app_user.id` and supports both `bigint` (the Task 3 migration chain) and `uuid` (the existing main project) without changing account IDs. It stores only 32-byte SHA-256 digests, enables RLS, and grants direct access only to `service_role`. `used_at` is a nullable timestamp rather than a boolean because it records when the token was consumed. The partial unique index allows at most one Active, unused token per user and purpose; it intentionally omits an expiry-time predicate because `now()` is not immutable and expiry changes without a row update. Issuance must deactivate the user's previous Active unused token in the same transaction before inserting its replacement.

Password token lifetimes are application configuration, not schema defaults: use 24 hours for `set_password` and 30 minutes for `reset_password`. Generate at least 32 cryptographically random bytes, encode them URL-safe, show/send the raw token only once, and store only its SHA-256 digest as 32 bytes. Email the link after the database transaction commits; in development, print it once to the console. Never log the raw token or its link. Use constant-time digest comparison in the application layer when comparing digest values; SQL equality is not a constant-time guarantee.

The server validates a candidate digest with this query (bind `$1` as the 32-byte SHA-256 digest and `$2` as the requested purpose):

```sql
SELECT token.id, token.user_id, token.purpose
FROM public.password_reset_token AS token
JOIN public.app_user AS account ON account.id = token.user_id
WHERE token.token_hash = $1::BYTEA
	AND token.purpose = $2::TEXT
	AND token.used_at IS NULL
	AND token.expires_at > CURRENT_TIMESTAMP
	AND token.status = 'Active'
	AND account.is_blocked = FALSE
LIMIT 1;
```

Issue a new token in one server transaction. Bind `$1` to the app user ID, `$2` to the purpose, `$3` to the 32-byte digest, `$4` to the configured expiry timestamp, and `$5` to the optional client IP. The server must roll back if the account-lock query returns no row; commit before delivering the raw token.

```sql
BEGIN;
SELECT id
FROM public.app_user
WHERE id = $1
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

When a token is redeemed, update it conditionally in the same transaction as the password/auth operation: set `used_at = CURRENT_TIMESTAMP`, `status = 'Inactive'`, and a `USED system ...` stamp only when it is still Active, unused, and unexpired. Schedule this cleanup statement as a future team job; it removes expired and consumed rows:

```sql
DELETE FROM public.password_reset_token
WHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL;
```

Run `db/verification/password_reset_token_verification.sql` only against the disposable local/test database with the documented `auth.users` stub. It creates valid, expired, used, and blocked-user fixtures inside a transaction, reports each expected validity result, checks API-role access, and rolls everything back. Never run it against hosted Supabase Auth or Production.
## Audit trail (`008_audit_user_and_log.sql`)

The database only sees the connection user (`session_user`), never the signed-in person, so audit entries used to name the connection instead of the user. Migration 008 reads a transaction-local setting that the application sets, so `audit_log.app_user` and every `stamp` (format `EDITED user1 2026-10-13 1:01 PM`, Asia/Manila time) name the logged-in application user. `db_user` keeps the connection user for forensics.

- `audit_user()` returns `current_setting('app.current_user', true)`, or `system` when it is missing or blank. It never raises, so migrations, seeds, and maintenance writes are never blocked.
- Actions: insert is `CREATED`; Active to Inactive is `DELETED`; Inactive to Active is `RESTORED`; any other update is `EDITED`. A hard delete is also logged as `DELETED`.
- Every base table with `status` and `stamp` (including `app_user`, `user_permission`, and `password_reset_token`) gets the `trg_zz_audit_stamp` and `trg_zz_audit_log` triggers. Attach them to a future table with `SELECT public.enable_audit('public.new_table');`.
- `password_hash`, `token_hash`, and `encrypted_password` are removed from `old_values` and `new_values`.
- `audit_log` is append-only: UPDATE, DELETE, and TRUNCATE are blocked by triggers, and no API role has write privileges. A superuser can still disable triggers; treat that as an operational control, not a guarantee.
- A write with no user is not rejected in the database. A rejecting trigger would break migrations, seeds, and jobs, and any caller can set an arbitrary name anyway. Reject it in the backend helper instead, and watch for leaks with `SELECT * FROM public.audit_log WHERE app_user = 'system' AND db_user = '<app connection user>'`, which should return no rows.

Run `psql -v ON_ERROR_STOP=1 -f db/verification/audit_user_verification.sql` against a disposable database: it prints PASS or FAIL per case, rolls everything back, and exits non-zero on any failure. Case 6 uses two separate connections one after the other; transaction-local settings cannot cross connections.

### Backend handoff

Run this as the first statement of every request transaction, with the signed-in user's email (or id):

```sql
SELECT set_config('app.current_user', $1, true);
```

`true` makes it transaction-local, so a pooled connection cannot leak the user into the next request. Never use a plain `SET` or `set_config(..., false)`. Permission changes also need `app.user_id` (the numeric id of the acting Admin or Superadmin) from migration 003.

```ts
import { Pool, PoolClient } from "pg";

export async function withAppUser<T>(pool: Pool, email: string, work: (tx: PoolClient) => Promise<T>) {
  if (!email) throw new Error("A signed-in user is required for audited writes");
  const tx = await pool.connect();
  try {
    await tx.query("BEGIN");
    await tx.query("SELECT set_config('app.current_user', $1, true)", [email]);
    const result = await work(tx);
    await tx.query("COMMIT");
    return result;
  } catch (error) {
    await tx.query("ROLLBACK");
    throw error;
  } finally {
    tx.release();
  }
}
```

`supabase-js` and PostgREST run each call in its own transaction, so a setting cannot span calls. For audited writes from `supabase-js`, call a database function that sets the user and writes in the same call, or use a direct `pg` connection as above.

For background jobs, set a job name in the job's transaction, for example `SELECT set_config('app.current_user', 'job:token-cleanup', true);`. A job that forgets is recorded as `system`.
