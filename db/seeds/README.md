# Seeds

Add repeatable PostgreSQL seed scripts here as `NNN_description.sql`. The seed runner executes every file in lexical order in its own transaction on every run. Make each seed idempotent with stable keys and `INSERT ... ON CONFLICT ...` handling. Do not put credentials, plaintext passwords, or real personal data here.

## Task 5 seeds

`010_default_roles.sql`, `020_system_modules.sql`, and `030_rights_catalogue.sql` seed the 3 roles, 5 modules, and 36 rights; the last file fails if any count is wrong. They use `ON CONFLICT DO NOTHING`, so `npm run db:seed` is safe to repeat. They target the migration-chain schema (migrations 001-007).

### Team Superadmins

1. Copy `team.example.csv` to `team.csv` (gitignored) and enter the real names and emails. The header must be exactly `first_name,last_name,email`; commas inside fields are not supported.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in root `.env`, then run `npm run db:seed:team`. Each member gets a confirmed Supabase Auth identity with **no password** and an approved `Superadmin` `app_user` row. Migration 004 moved credentials to Supabase Auth, so `password_hash` and `must_set_password` no longer exist; "no password" means an Auth user whose password is empty. An existing account with another role is reported, never promoted.
	For an app configuration stored in `web/.env.local`, use `npm run db:seed:team:web`; it maps `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` and uses `DATABASE_URL`. The command refuses to connect if the DB URL and Supabase URL identify different projects. Remote DB connections always require verified TLS; if your system does not trust Supabase's certificate chain, download the project's CA certificate from Supabase Database settings and set `DATABASE_SSL_ROOT_CERT` to its repository-relative path. Do not disable certificate verification.
3. Set `APP_BASE_URL` and run `npm run db:setup-links` in a terminal. For every unblocked email-provider account whose Auth password is empty it invalidates the older `set_password` token, stores only the SHA-256 hash of a new 32-byte token (24 hours, or `SET_PASSWORD_TTL_HOURS`), and prints `APP_BASE_URL/set-password#token=...` once. Output to a pipe or file is refused. Re-running prints new links and revokes the old ones. Use `--email` to target one account; on a local `auth.users` stub add `--assume-no-password`. Use `npm run db:setup-links:web` to load the web env file explicitly.

### How the set-password page consumes a link

The token sits in the URL fragment so browsers never send it to servers or logs. The page reads it, then POSTs the token and the new password to a server route that: (1) hashes the token with SHA-256; (2) in one transaction runs `UPDATE public.password_reset_token SET used_at = CURRENT_TIMESTAMP, status = 'Inactive' WHERE token_hash = $1 AND purpose = 'set_password' AND used_at IS NULL AND status = 'Active' AND expires_at > CURRENT_TIMESTAMP RETURNING user_id` joined to an unblocked `app_user`; (3) rejects with one generic error when no row returns; (4) calls Supabase `auth.admin.updateUserById(auth_user_id, { password })`; (5) commits only if that call succeeds. Raw tokens and passwords are never logged.

### Dev-only users

`npm run db:seed:dev` creates Admin Lisa Park and User Alex Rivera (`example.invalid` emails, a few rights each, granted by the first Superadmin) with no passwords. It refuses unless `DB_ENV=development` and the host is localhost or listed in `DB_ALLOWED_DEV_HOSTS`, and it lives outside the lexical seed runner so `db:seed` never runs it. Run `db:setup-links` afterwards.

### Secret protection

`.gitignore` contains `.env`, `.env.*` (except `.env.example`), and `db/seeds/team.csv`. Enable the hook once per clone with `git config core.hooksPath .githooks`; it runs `npm run check:secrets`, which fails if a staged `.sql` file has a bcrypt or Argon2 hash or `password =`, or if `team.csv` or a real `.env` is staged. CI runs the same check on every tracked file.

### Verification checklist

- [ ] `npm run db:seed` twice in a row succeeds with no errors and no extra rows.
- [ ] `psql -f db/verification/seed_verification.sql` shows every row `passed = t`: roles 3, modules 5, rights 36, Customer 3, Product 6, Human Resources 13, Sales 7, Reports 7.
- [ ] `SELECT COUNT(*)` of Superadmin rows equals the number of rows in `team.csv`, all `Approved` and unblocked.
- [ ] `npm run db:setup-links` prints one link per passwordless account; running it again yields different links and `SELECT COUNT(*) FROM public.password_reset_token WHERE purpose = 'set_password' AND status = 'Active' AND used_at IS NULL` still equals one per account.
- [ ] Opening an older link fails; a new link sets a password once and a second use fails.
- [ ] `git status` does not list `db/seeds/team.csv`, and `npm run check:secrets -- --all` passes.