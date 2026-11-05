# S1-TST-02: Registration and authentication test plan

## Scope and safety

Test registration, login/logout, first-login password setup, and password reset.
Run product tests only in a configured development/test environment with test accounts.
Do not run state-changing tests against production.

The current web app does not have a password-reset flow, so reset cases are documented
but blocked until that feature is available. Record product tests as Pass, Fail, or Blocked;
do not count helper/model tests as end-to-end product tests.

## Test cases

| ID | Scenario | Steps | Expected result | Status |
| --- | --- | --- | --- | --- |
| REG-01 | New registration | Register with valid first name, last name, and a new Gmail address. | Account is created with `Pending` approval; user is not logged in. | Not run |
| REG-02 | Invalid registration | Try missing names, malformed/non-Gmail email, and over-limit values. | Invalid request is rejected; no account is created. | Not run |
| REG-03 | Duplicate registration | Submit the same email twice. | Second request is rejected; existing profile is unchanged. | Not run |
| AUTH-01 | Invalid login | Try an incorrect password and an unknown email. | Login is rejected without creating a session; response does not reveal whether the email exists. | Not run |
| AUTH-02 | Valid login | Log in with correct credentials for an approved, unblocked account. | Login succeeds and opens the dashboard. | Not run |
| AUTH-03 | Pending/blocked/rejected login | Try logging in with each ineligible account state. | Login is denied and no authenticated session remains. | Not run |
| AUTH-04 | Logout | Log in, log out, then revisit/refresh the dashboard. | Session is cleared; protected pages require login. | Not run |
| FL-01 | First-login password setup | Use an eligible account and valid setup link/token to set a password. | Password is saved; user is directed to login. | Not run |
| FL-02 | Invalid or expired setup token | Submit a wrong, altered, or expired token. | Request is rejected; password/account state is unchanged. | Not run |
| FL-03 | Reuse setup token | Complete setup, then submit the same token again. | Reuse is rejected; password is not changed again. | Not run |
| RST-01 | Reset request for existing email | Request a reset link for an existing account. | Reset link is issued through the configured delivery mechanism. | Blocked: reset flow unavailable |
| RST-02 | Reset request for unknown email | Request a reset for an email with no account. | No usable token is issued; response follows the documented safe behavior. | Blocked: reset flow unavailable |
| RST-03 | Valid reset token | Use a valid token to set a new password; try old and new passwords. | Reset succeeds; old password fails and new password works. | Blocked: reset flow unavailable |
| RST-04 | Expired reset token | Submit a token after its expiry. | Reset is rejected; existing password still works. | Blocked: reset flow unavailable |
| RST-05 | Reused reset token | Successfully reset once, then submit the same token again. | Replay is rejected; password remains unchanged. | Blocked: reset flow unavailable |

## Test execution

Record the environment, test account/role, actual result, and Pass/Fail/Blocked for each case.
For failures, include reproducible steps and expected versus actual results, then link a bug report.

Automated helper tests do not exercise the complete UI/API or Supabase integration.
Run the project test command from the `web` directory and report its output separately
from product-test results.
