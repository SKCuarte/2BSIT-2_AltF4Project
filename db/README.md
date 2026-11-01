# Hope, Inc. ERP Database Setup

This guide targets PostgreSQL 15+ and works on Windows, macOS, and Linux. It uses a local PostgreSQL installation for daily work and recommends one shared hosted development database only for integration. The committed migration files are the schema source of truth, so both environments must run the same migrations; do not make manual schema changes that are not captured in a new migration.

## Repository Layout

```text
.env.example
.gitignore
package.json
package-lock.json       # created by npm install; commit it for repeatable installs
db/
   README.md
   migrations/           # numbered forward-only SQL; no HOPE schema migrations yet
   seeds/                # numbered idempotent SQL seed files
   scripts/
      db.js               # migrate, status, and guarded dev reset
      seed.js             # repeatable seed runner
```

## Team Database Choice

| Approach | Advantages | Trade-offs |
| --- | --- | --- |
| Each student installs PostgreSQL locally | Private, works offline, no shared credentials | Each person maintains a local service and data |
| One shared hosted free-tier database | One integration target, no local server setup | Internet required; free-tier limits, shared data, and careful credential handling |
| Local daily work plus shared integration | Fast isolated work and a common integration check | Requires keeping local and shared environments aligned |

**Recommendation: local PostgreSQL for daily development, plus one hosted dev database for integration.** Keep both at PostgreSQL 15+ and apply the same numbered migrations. Use separate credentials per environment; never put hosted credentials in the repository or share them in chat. Do not point `db:reset` at the hosted database.

## Install PostgreSQL

1. Install PostgreSQL 15 or newer using the official installer for your operating system: [postgresql.org/download](https://www.postgresql.org/download/). Keep the default port `5432` unless it is already in use. On Windows, the installer can also install pgAdmin; on macOS and Linux, follow the package instructions for your distribution.
   Expected: the PostgreSQL server is running and `psql` is available in a new terminal.
2. Verify the client version:
   ```text
   psql --version
   ```
   Expected: `psql (PostgreSQL) 15.x` or a newer version.
3. Install Node.js 18 or newer from [nodejs.org](https://nodejs.org/) if it is not already installed. This repository's database commands use npm, which is included with Node.js.
   Expected: `node --version` reports `v18` or newer and `npm --version` prints a version.

## Create a Development Database

Use the PostgreSQL administrator account only for initial setup and the optional local reset command. Create a separate `hope_app` login for the runner. Connect from a terminal:

```text
psql -U postgres -d postgres
```

At the `postgres=#` prompt, create the role and database, then set the role password through psql's hidden prompt:

```sql
CREATE ROLE hope_app LOGIN;
\password hope_app
CREATE DATABASE hope_dev;
GRANT CONNECT, TEMPORARY ON DATABASE hope_dev TO hope_app;
\connect hope_dev
GRANT USAGE, CREATE ON SCHEMA public TO hope_app;
\quit
```

Expected: psql reports `CREATE ROLE`, `CREATE DATABASE`, and `GRANT`; `\password` asks for a password twice without displaying it. Store that password only in your local `.env`. The app role can connect and create project objects in this one database, but cannot create or manage other databases. If your local administrator is not named `postgres`, use that login for the connection and the reset settings below.

## Clone and Configure

1. Clone the team repository and enter its folder:
   ```text
   git clone https://github.com/SKCuarte/2BSIT-2_AltF4Project.git
   cd 2BSIT-2_AltF4Project
   ```
   Expected: the project files, including `package.json` and `db/`, are present.
2. Copy `.env.example` to `.env`. This Node command works the same in PowerShell, Command Prompt, macOS, and Linux:
   ```text
   node -e "require('node:fs').copyFileSync('.env.example', '.env')"
   ```
   Expected: a local `.env` file is created. It is ignored by Git.
3. Edit `.env` with your own local database password. Keep `DB_ENV=development`, `DB_HOST=localhost`, `DB_NAME=hope_dev`, `DB_USER=hope_app`, and `DB_SSL=false`. For local reset only, set `DB_ADMIN_USER` and `DB_ADMIN_PASSWORD` to a local PostgreSQL administrator. Leave `DB_ALLOWED_DEV_HOSTS` empty for local work.
   Expected: `.env` contains local settings and no committed or shared credentials.

## Install and Run

1. Install the project dependencies:
   ```text
   npm install
   ```
   Expected: npm completes successfully and creates `node_modules/` and `package-lock.json`. Commit `package-lock.json` when it is first generated so teammates install the same dependency tree.
2. Check schema status:
   ```text
   npm run db:status
   ```
   Expected on this initial setup: `No migration files found.` (No HOPE table migrations are included in this task.)
3. Apply migrations:
   ```text
   npm run db:migrate
   ```
   Expected initially: `No pending migrations.` The runner creates `public.schema_migrations` if needed.
4. Run repeatable seed scripts:
   ```text
   npm run db:seed
   ```
   Expected initially: `No seed files found.`

All runner commands are npm scripts and use the same syntax on Windows, macOS, and Linux. Migration files are ordered lexically, SHA-256 checked against the exact applied file, and run in individual transactions. The seed runner replays every ordered SQL seed in its own transaction, so each seed must use stable keys and idempotent inserts such as `ON CONFLICT DO NOTHING` or a deliberate upsert.

## Disposable Runner Smoke Test

This test uses a separate database and an empty migration; do not use a database containing project data. First create the disposable database as a PostgreSQL administrator, then grant the app role access:

```sql
CREATE DATABASE hope_smoke_dev;
GRANT CONNECT, TEMPORARY ON DATABASE hope_smoke_dev TO hope_app;
\connect hope_smoke_dev
GRANT USAGE, CREATE ON SCHEMA public TO hope_app;
```

Temporarily set `DB_NAME=hope_smoke_dev` in `.env`, then run these same commands on all operating systems:

```text
node -e "require('node:fs').writeFileSync('db/migrations/999_smoke_test.sql', '')"
npm run db:migrate
npm run db:status
```

Expected output for the migrate and status commands:

```text
Applied 999_smoke_test.sql (sha256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)
APPLIED 999_smoke_test.sql
```

After the test, run `npm run db:reset`, type `RESET hope_smoke_dev`, restore `DB_NAME=hope_dev`, and remove the temporary file with:

```text
node -e "require('node:fs').unlinkSync('db/migrations/999_smoke_test.sql')"
```

The output above is the expected result; it must not be presented as an executed test unless the commands were run against PostgreSQL.

## Verify

Connect using the app role:

```text
psql -h localhost -p 5432 -U hope_app -d hope_dev
```

At the psql prompt, check the PostgreSQL version and migration table:

```sql
SELECT current_setting('server_version') AS server_version;
SELECT to_regclass('public.schema_migrations') AS migration_table;
SELECT filename, checksum, applied_at FROM public.schema_migrations ORDER BY filename;
\quit
```

Expected: PostgreSQL version is 15 or newer; `migration_table` is `schema_migrations`; the final query returns zero rows until the first migration is added. `npm run db:status` should show each migration as `APPLIED` or `PENDING`.

## Development Reset

`npm run db:reset` is destructive and drops the configured database. It requires `DB_ENV=development`, a database name ending in `_dev` or `_development`, and an exact typed confirmation. It refuses non-local hosts unless they are explicitly listed in `DB_ALLOWED_DEV_HOSTS`; do not allowlist a production host. It also requires `DB_ADMIN_USER` and `DB_ADMIN_PASSWORD` with permission to terminate connections, drop/create the target database, and grant the app role access. After reset, rerun `npm run db:migrate` and `npm run db:seed`.

For rollback during development, recreate the local development database with `npm run db:reset`, then rerun migrations and seeds. Migrations are forward-only; never roll back by editing an applied file.

## Troubleshooting

| Problem | Check and fix |
| --- | --- |
| Port in use | Another PostgreSQL service may be using `5432`. Stop the duplicate service or set `DB_PORT` to the server's actual port. |
| Authentication failed | Confirm `DB_HOST`, `DB_PORT`, `DB_NAME`, and `DB_USER`; reset the `hope_app` password with psql `\password hope_app`, then update local `.env`. |
| Permission denied | Confirm `hope_app` has `CONNECT` on `hope_dev` and `USAGE, CREATE` on its `public` schema. The reset command needs the separate administrator credentials. |
| Migration checksum mismatch | Restore the exact applied migration from version control. Never edit an applied migration; create a new numbered file for changes. |
| Wrong engine version | Install PostgreSQL 15 or newer and confirm the server (not just the `psql` client) version. The runner reports an error for older servers. |
| `psql` command not found | Add PostgreSQL's `bin` directory to `PATH`, open a new terminal, and retry `psql --version`. |
| `node` or `npm` command not found | Reinstall Node.js with its PATH option enabled, then open a new terminal and retry `node --version` and `npm --version`. |
| PowerShell blocks `npm.ps1` | Open Command Prompt as the VS Code terminal and rerun the documented `npm` commands. This avoids changing PowerShell's execution policy. |

## Team Rules

- Never edit or remove an applied migration; add a new forward-only migration.
- Keep one migration per pull request so schema changes are easy to review.
- Pull the latest main branch before choosing a migration number.
- If two branches choose the same number, the author whose PR merges first keeps it. The other author renames their still-unapplied file to the next available number after pulling main, updates references, and retests. Never rename an already-applied migration.
- Keep SQL portable within PostgreSQL 15+ and use the same migration history for local and shared integration databases.
- Never commit `.env`, passwords, plaintext credentials, or real personal data. Password hashes and reset-token hashes belong in application-managed user records, never plaintext.