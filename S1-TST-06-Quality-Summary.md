# S1-TST-06: Sprint 1 Quality Summary & Bug Report

**Tester:** Joshua Morning Lazaro
**Date:** November 21, 2026
**Sprint:** Sprint 1 (Week 2)

## 1. Executive Summary
During Sprint 1, testing was conducted on User Management (S1-TST-03), Permission Matrix (S1-TST-04), and Automated Smoke Tests (S1-TST-05). While basic functionality and automated login flows work, a critical security vulnerability was discovered regarding Role-Based Access Control (RBAC).

## 2. Defect Log (Bugs Found)

### Bug #1: Missing UI & Server Guardrails for Standard Users
- **Severity:** Critical
- **Found in Issue:** #35 (S1-TST-04)
- **Reproducible Steps:**
  1. Log in as a standard User (`morninglazaro644@gmail.com`).
  2. Manually navigate to `http://localhost:3001/dashboard/users`.
  3. Observe that the User Management page loads instead of redirecting.
  4. Send a direct GET request to `http://localhost:3001/api/admin/users` via an API client or browser.
  5. Observe that the server returns a `200 OK` with sensitive user data instead of `403 Forbidden`.
- **Expected Outcome:** The UI should hide/redirect unauthorized pages, and the API should block unauthorized requests.
- **Actual Outcome:** Unauthorized users can view and access admin data.
- **Status:** OPEN

*(If you found any other small bugs while testing, list them here. If not, this is enough).*

## 3. Fix Verification
- Automated smoke tests (Issue #36) were run successfully to verify the core login flow still works.
- The security bug (Bug #1) is currently **OPEN** and requires a fix from the development team before Sprint sign-off.

## 4. Sprint 1 Quality Metrics
- **Total Test Cases Executed:** 9 (Manual + Automated)
- **Passed:** 7
- **Failed:** 2 (UI Guardrail, Server Guardrail)
- **Resolution Rate:** Pending Dev Fix.
