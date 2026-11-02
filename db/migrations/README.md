# Migrations

Add forward-only PostgreSQL migrations here as `NNN_description.sql` (for example, `001_create_users.sql`). Files are applied in lexical filename order and each file plus its tracking row commits in one transaction. Migrations `001` and `002` create and seed the HOPE base tables, `003` creates the role/rights catalogue, `004` links profiles to Supabase Auth, and `005` gates effective rights on application approval.

Never change or remove an applied migration. Add a new numbered migration instead. Do not put `BEGIN` or `COMMIT` inside migration files; the runner owns the transaction. Audit logging objects are excluded here and reserved for Task 6.

`004_supabase_auth_profiles.sql` requires `public.app_user` to be empty before it adds the required Auth UUID FK and removes legacy password columns. It aborts before changing the schema when rows exist. Reconcile existing profiles with Supabase Auth through a separately reviewed backfill plan; never copy password hashes into `auth.users` or bypass the guard. Registration APIs should write to `app_user` by `auth_user_id`; delete an unlinked Auth account if its profile insert fails.