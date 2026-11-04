# Seeds

Add repeatable PostgreSQL seed scripts here as `NNN_description.sql`. The seed runner executes every file in lexical order in its own transaction on every run. Make each seed idempotent with stable keys and `INSERT ... ON CONFLICT ...` handling. Do not put credentials, plaintext passwords, or real personal data here.

## Task 5 seeds

`010_default_roles.sql`, `020_system_modules.sql`, and `030_rights_catalogue.sql` seed the 3 roles, 5 modules, and 36 rights; the last file fails if any count is wrong. They use `ON CONFLICT DO NOTHING`, so `npm run db:seed` is safe to repeat. They target the migration-chain schema (migrations 001-007).

### Team Superadmins

1. Copy `team.example.csv` to `team.csv` (gitignored) and enter the real names and emails. The header must be exactly `first_name,last_name,email`; commas inside fields are not supported.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in root `.env`, then run `npm run db:seed:team`. Each member gets a confirmed Supabase Auth identity with **no password** and an approved `Superadmin` `app_user` row. Migration 004 moved credentials to Supabase Auth, so `password_hash` and `must_set_password` no longer exist; "no password" means an Auth user whose password is empty. An existing account with another role is reported, never promoted.
	For an app configuration stored in `web/.env.local`, use `npm run db:seed:team:web`; it maps `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` and uses the Supabase HTTPS Auth and Data APIs, so it does not need `DATABASE_URL`. It supports the main project's UUID `app_user.id` and text `role` schema. Existing accounts with another role are never promoted.
3. Set `APP_BASE_URL` (the deployed app origin) and run `npm run db:setup-links:web` (or `npm run db:setup-links` for root `.env`) in a terminal. For each `team.csv` member that exists, is unblocked, and has never signed in, it asks Supabase Auth for a recovery link and prints `APP_BASE_URL/auth/recovery-callback#token_hash=...&type=recovery` once. Output to a pipe or file is refused, and nothing is stored by the script. Re-running prints a new link; Supabase controls link expiry (Authentication settings). Use `--email` to target one member.

### How the link is consumed

The link is consumed by pages already on `main` (S1-DEV-04, PR #76), so this task adds no new web code: `/auth/recovery-callback` reads `token_hash` from the URL fragment (kept out of server logs) and calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`; `/reset-password` then requires that recovery session and calls `supabase.auth.updateUser({ password })`; the app proxy still denies blocked and unapproved accounts. The `password_reset_token` table from Task 4 is not used by this flow; it stays available for a future custom token flow.

### Dev-only users

`npm run db:seed:dev` creates Admin Lisa Park and User Alex Rivera (`example.invalid` emails, a few rights each, granted by the first Superadmin) with no passwords. It refuses unless `DB_ENV=development` and the host is localhost or listed in `DB_ALLOWED_DEV_HOSTS`, and it lives outside the lexical seed runner so `db:seed` never runs it. Run `npm run db:setup-links -- --email <address>` afterwards for a dev user; add the address to `team.csv` first.

### Secret protection

`.gitignore` contains `.env`, `.env.*` (except `.env.example`), and `db/seeds/team.csv`. Enable the hook once per clone with `git config core.hooksPath .githooks`; it runs `npm run check:secrets`, which fails if a staged `.sql` file has a bcrypt or Argon2 hash or `password =`, or if `team.csv` or a real `.env` is staged. CI runs the same check on every tracked file.

### Verification checklist

- [ ] `npm run db:seed` twice in a row succeeds with no errors and no extra rows.
- [ ] `psql -f db/verification/seed_verification.sql` shows every row `passed = t`: roles 3, modules 5, rights 36, Customer 3, Product 6, Human Resources 13, Sales 7, Reports 7.
- [ ] `SELECT COUNT(*)` of Superadmin rows equals the number of rows in `team.csv`, all `Approved` and unblocked.
- [ ] `npm run db:setup-links:web` prints one link per team member who has not signed in; running it again prints a different link.
- [ ] Opening the link lands on `/reset-password`; setting a password succeeds, the member can sign in, and reopening the same link fails.
- [ ] `git status` does not list `db/seeds/team.csv`, and `npm run check:secrets -- --all` passes.