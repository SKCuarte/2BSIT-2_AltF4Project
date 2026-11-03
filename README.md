# Hope, Inc. ERP — Sprint 1

Welcome to the **Hope, Inc. ERP** project repository! This repository houses the codebase, database scripts, governance documentation, and project tracking for Sprint 1.

---

## 🚀 Repository Setup & Quick Start

### Prerequisites
- **Git** (latest release)
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** / database environment (as defined in `.env`)

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

Email registration responses are intentionally neutral for successful invitations and invitation failures to avoid disclosing whether an email is already registered. If profile creation fails, the server attempts to clean up only the Auth user returned by that invitation request. When cleanup fails after a recovery marker was saved, the registrant can retry using the short-lived, browser-held recovery capability after verifying the invitation email. If saving the recovery marker and deleting that newly invited Auth user both fail, no self-service recovery capability exists; the API returns an administrator-assistance message and logs sanitized diagnostics including the Auth user ID and failure codes. An administrator must inspect `auth.users` and `public.app_user` and reconcile or remove only the confirmed incomplete registration. Do not recover accounts by matching email alone.

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