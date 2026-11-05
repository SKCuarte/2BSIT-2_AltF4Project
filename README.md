# Hope, Inc. ERP — Sprint 1

Welcome to the **Hope, Inc. ERP** project repository! This repository houses the codebase, database scripts, governance documentation, and project tracking for Sprint 1.

---

## 🚀 Repository Setup & Quick Start

### Prerequisites
- **Git** (latest release)
- **Node.js** (v18 or higher recommended)
- **Supabase** (PostgreSQL cloud database platform, configured in `.env`)

### Local Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/SKCuarte/2BSIT-2_AltF4Project.git
   cd 2BSIT-2_AltF4Project
   ```
   
---

## Web Registration Setup

The registration API stores account profiles in Supabase's `public.app_user` table. Use the database team's current migrations for the project schema; do not apply ad-hoc schema changes from this application repository. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `web/.env.local`. Never use the service-role key in client-side code or expose it through a `NEXT_PUBLIC_` variable.

For Google registration, enable the Google provider in Supabase Authentication settings and configure its OAuth credentials. Add the app callback URL (for example, `http://localhost:3000/auth/callback?intent=register`) to Supabase's allowed redirect URLs. In Google Cloud, set the Supabase OAuth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.

Manual registration collects first name, last name, and Gmail without sending email or OTP and does not use Supabase Anonymous Sign-Ins. The server creates a Pending Auth user with an undisclosed random password and an `app_user` profile, then sets a signed, HTTP-only browser claim so the same browser can check approval and set a password later. The registration page checks approval automatically while open; after the DB Admin changes `approval_status` to `Approved`, the user is redirected to Set Password. Since no email verification is sent, an administrator must independently verify the registrant's identity and ownership of the claimed Gmail before approval. After password setup, the user is sent to Login. Users must keep the same browser and site data until then. Configure CAPTCHA/rate limits before exposing public registration.

The registration page also supports Google OAuth as an optional verified alternative. Add `http://localhost:3000/auth/callback?intent=register` (and the deployed callback URL) to Supabase Authentication's allowed redirect URLs. In Google Cloud, set the Supabase OAuth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. The Google provider must be enabled in Supabase and configured with its OAuth credentials. New Google profiles remain `Pending`; after approval, users set a password and are redirected to Login. The dashboard remains inaccessible until approval and password setup are complete. Manual registration does not use Supabase email delivery or SMTP.

## Login and session setup

The login flow uses Supabase Auth and cookie-backed `@supabase/ssr` sessions. The Next.js proxy refreshes sessions, redirects logged-out users from protected pages to `/login`, sends approved signed-in users to `/dashboard`, and requires accounts marked for first-login password setup to visit `/set-password`. After a successful first password setup, the server clears the first-login marker, signs out that session, and sends the user to `/login` to authenticate with the new password. The server checks `public.app_user` by `auth_user_id`; blocked, pending, rejected, or unlinked accounts are denied. Approval status comparisons are case-insensitive. Supabase Auth handles password hashing and its configured failed-attempt rate limits.

For S1-DEV-03, the authentication routes use the schema from `db/migrations/003_user_management.sql` and `004_supabase_auth_profiles.sql`: `app_user` has a BIGINT `id`, a UUID `auth_user_id`, and a BIGINT `role_id` foreign key to `public.role(id)`, alongside `status`, `is_blocked`, and `approval_status`. Resolve role names through the `public.role` table; `app_user` does not have a text `role` column. Do not apply alternate schemas or migrations without an approved reconciliation and backfill plan.

The active database migrations remove `must_set_password` from `public.app_user`; they do not define `profiles.must_change_password`. The Dashboard includes an Admin-only user creation flow that creates a regular User with `approval_status = 'Pending'` and sets `app_metadata.must_change_password: true` using the server-side Supabase Auth Admin API. The temporary password is shown once to the authorized Admin. Manual public registration creates a Pending Auth user with a random password and uses a signed HTTP-only browser claim; no email verification is sent, so an Admin must verify the person and claimed Gmail independently before approval. After approval, the claim allows first-password setup, which clears the Auth metadata flag and redirects the user to Login. Never set the first-login flag from browser code or expose the service-role key.

## Password recovery setup (S1-DEV-04)

The Forgot Password page requests a Supabase Auth recovery email. Supabase Auth owns the expiring recovery link and password update; no password or reset token is stored in the application database. The callback verifies the recovery link, then the reset form requires that recovery session, an 8–128 character password, and a matching confirmation. The proxy continues to enforce account approval and blocked-user restrictions.

In Supabase Dashboard, set the **Site URL** to the deployed app origin and add the recovery callback to **Authentication → URL Configuration → Redirect URLs**:

- Local: `http://localhost:3000/auth/recovery-callback`
- Preview: `https://<exact-preview-host>/auth/recovery-callback`
- Deployed: `https://<your-app-domain>/auth/recovery-callback`

Replace `<exact-preview-host>` with the hostname of the Preview site, then add the full callback URL under **Authentication → URL Configuration → Redirect URLs**. The app builds the callback from the current site origin, so local and Preview requests return to the same environment that requested the email.

Keep the Supabase Auth email provider enabled. The password recovery email template must retain Supabase's confirmation link (the default `{{ .ConfirmationURL }}` works); Supabase sends the link to the callback above. Ensure recovery links have an expiration configured. Supabase's built-in SMTP is restricted to pre-authorized project-team email addresses and is limited to 2 emails per hour. Use a custom SMTP provider in **Authentication → SMTP Settings** for other recipients or regular testing/production delivery. Email branding and a shorter expiry are optional recommendations.

---

## 👥 Team Roles & Responsibilities

| Role | Lead / Assignees | Key Scope |
| :--- | :--- | :--- |
| **Scrum Master** | Shanelle Kyan Cuarte (`SKCuarte`) | Governance, Branch Protection, Issue Templates, Board Management |
| **DB Admin** | John Elijah Pangilinan (`elijahpangilinan200...`) | Schema Migrations, Base Tables, Seed Data (`audit_log`, `app_user`) |
| **Developer** | Shan Michael De Leon (`shandeleon09-dot`) | App Scaffolding, User Reg/Auth API, Session & Rights Dialog Screens |
| **Tester** | Joshua Morning Lazaro (`morninglazaro644-art`) | Test Plans, Permission Matrix Tests, User Mgmt Test Cases |
| **UI/UX Designer** | Marl Gem Barozo (`usr-Chr0nos`) | Module Layouts, Main Page Sidebar, User Interface Mocks |

---

## 📋 Git & Workflow Guidelines

### 1. Branch Naming Convention
All feature branches must strictly follow this naming format:
`feature/<TASK_ID>-<short_description>`
> *Example:* `feature/S1-SM-01-repo_setup` or `feature/S1-DBA-01-db_setup`

### 2. Pull Request Rules
- All PRs must link their primary issue using `Closes #<issue_number>` in the description.
- Minimum **1 peer review approval** is required before merging into `main`.
- Must pass Definition of Done (DoD) checks.

### 3. Commit Message Format
Use standard conventional commits:
- `docs(SM): ...`
- `feat(DEV): ...`
- `fix(DBA): ...`
- `test(TST): ...`

---

## 📚 Documentation Links

- [Project Board Documentation](.github/docs/BOARD_SETUP.md)
- [Issue & PR Templates](.github/ISSUE_TEMPLATE/)