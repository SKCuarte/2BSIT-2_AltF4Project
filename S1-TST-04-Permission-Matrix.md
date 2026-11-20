# S1-TST-04: Permission Matrix & Server Enforcement Test

**Tester:** Joshua Morning Lazaro
**Date:** November 21, 2026

## 1. Test Accounts
- **Superadmin:** shanellekyan12@gmail.com
- **Admin:** jeremias.esperanza@gmail.com
- **User:** morninglazaro644@gmail.com

## 2. Permission Matrix (UI Verification)

| Module / Feature | Superadmin Access | Admin Access | User Access | Status |
| :--- | :--- | :--- | :--- | :--- |
| **User Management UI** | Visible | Visible | **Visible (BUG!)** | **FAIL** |

## 3. Server Enforcement (API Testing)

| API Endpoint | Role Tested | Expected HTTP Status | Actual HTTP Status | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/admin/users` | Standard User | 403 Forbidden | **200 OK (BUG!)** | **FAIL** |

## Bugs Found
- **Bug #1 (Critical):** Standard User accounts are able to view the User Management page. The UI is not hiding or redirecting the page based on role permissions.
- **Bug #2 (Critical):** The server API (`/api/admin/users`) does not block standard users. The server is returning sensitive user data to unauthorized roles.
