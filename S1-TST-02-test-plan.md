# S1-TST-02: Registration and authentication test plan

## Scope and safety

Test registration, login/logout, first-login password setup, and password recovery.
Run state-changing tests only in a configured development/test environment with test
accounts. Do not use production accounts or send test emails to real users.

The app implements password recovery through Supabase Auth. End-to-end recovery tests
require a non-production Supabase project and test email delivery. The current checkout
has no local `.env.local`, so account-changing workflows could not be exercised here.
Automated helper tests and route smoke checks are not equivalent to end-to-end tests.

## Test cases

| ID | Scenario | Steps | Expected result | Status |
| --- | --- | --- | --- | --- |
| REG-01 | New registration | Register using valid first name, last name, and a new Gmail address; inspect profile and browser auth state. | Request succeeds; profile has `Pending` approval; registration does not sign the visitor in. | Not run end-to-end; helper coverage passed |
| REG-02 | Invalid registration | Submit malformed JSON and missing, invalid, or out-of-range fields. | Request is rejected; no account or profile is created. | Malformed JSON smoke check passed; remaining cases not run |
| REG-03 | Duplicate registration | Submit the same email twice. | Second request is rejected; existing profile is unchanged. | Not run end-to-end; helper coverage passed |
| AUTH-01 | Invalid login | Try an incorrect password and an unknown email. | Login is rejected without a session and without revealing whether the email exists. | Not run end-to-end |
| AUTH-02 | Valid login | Log in with correct credentials for an approved, unblocked account. | Login succeeds, session is present, and user reaches the dashboard. | Not run end-to-end |
| AUTH-03 | Ineligible login | Try pending, rejected, blocked, and profile-missing accounts using valid credentials. | Login is denied and any newly created session is cleared. | Policy helper tests passed; not run end-to-end |
| AUTH-04 | Logout | Log in, log out, then revisit or refresh the dashboard. | Session is cleared; protected pages require authentication. | Not run end-to-end |
| FL-01 | First-login password setup | Use an eligible account with a valid setup capability and set a valid password. | Password is saved, setup marker is cleared, and user is directed to login. | Not run end-to-end |
| FL-02 | Invalid or expired setup capability | Submit a missing, modified, wrongly signed, or expired capability. | Request is rejected; password and account state are unchanged. | Registration-claim helper tests passed; route not run end-to-end |
| FL-03 | Reuse setup capability | Complete setup, then replay the same capability. | Replay is rejected; password is not changed again. | Not run end-to-end |
| RST-01 | Reset request for existing email | Request a recovery email for an existing test account. | A recovery link is sent through configured Supabase Auth email delivery. | Not run; test project/email configuration unavailable |
| RST-02 | Reset request for unknown email | Request recovery for a nonexistent address. | Response follows the app's safe behavior; no usable recovery session is issued. | Not run; test project/email configuration unavailable |
| RST-03 | Valid recovery link | Open a test recovery link, set a new password, and try old/new credentials. | Password changes; old password fails and new password works. | Not run; test project/email configuration unavailable |
| RST-04 | Expired/invalid recovery link | Open an expired, malformed, or already-used recovery link. | Recovery is rejected; existing password remains unchanged. | Not run; test project/email configuration unavailable |
| RST-05 | Reuse recovery link | Complete a password reset, then reopen the same link. | Reuse is rejected and cannot change the password again. | Not run; test project/email configuration unavailable |

## Execution record

Tested against commit `73f1131` (current `main`) locally, without Supabase credentials:

- `npm test`: 54 passed, 0 failed. These are isolated helper/policy tests; they do not
  exercise the complete browser-to-Supabase authentication flows.
- `npm run lint`: passed.
- `npm run build`: passed. Build logged that approval-status configuration was incomplete,
  as expected without environment configuration.
- Local production-build smoke check: `/login`, `/register`, `/set-password`,
  `/forgot-password`, and `/reset-password` each returned HTTP 200.
- Invalid-request smoke checks: malformed JSON for login and registration, and a missing
  password for setup, each returned HTTP 400 as expected.
- Successful registration, login/logout, first-login completion, and email-based password
  recovery were not executed because this checkout has no `.env.local`, test accounts, or
  configured test email delivery.

Run `npm test` and `npm run lint` from the `web` directory. When a non-production
Supabase environment and test accounts are available, execute the end-to-end cases above
and replace their statuses with observed results. Report failures with reproducible steps
and expected versus actual behavior.
