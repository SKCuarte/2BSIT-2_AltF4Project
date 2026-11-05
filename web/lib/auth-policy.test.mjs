import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthenticatedRedirect,
  getProfileAccessIssue,
  MUST_CHANGE_PASSWORD_KEY,
} from "./auth-policy.mjs";

const approvedProfile = {
  is_blocked: false,
  approval_status: "Approved",
};

test("classifies blocked and approval-gated profiles", () => {
  assert.equal(
    getProfileAccessIssue({ ...approvedProfile, is_blocked: true }),
    "blocked"
  );
  assert.equal(
    getProfileAccessIssue({ ...approvedProfile, approval_status: "Pending" }),
    "pending"
  );
  assert.equal(
    getProfileAccessIssue({ ...approvedProfile, approval_status: "Rejected" }),
    "rejected"
  );
  assert.equal(
    getProfileAccessIssue({ ...approvedProfile, approval_status: "rejected" }),
    "rejected"
  );
  assert.equal(
    getProfileAccessIssue({ ...approvedProfile, approval_status: " approved " }),
    null
  );
  assert.equal(getProfileAccessIssue(null), "profile_missing");
  assert.equal(getProfileAccessIssue(approvedProfile), null);
});

test("requires a temporary-password user to set a new password before dashboard access", () => {
  const metadata = { [MUST_CHANGE_PASSWORD_KEY]: true };
  assert.deepEqual(
    getAuthenticatedRedirect("/dashboard", approvedProfile, metadata),
    { redirect: "/set-password" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/set-password", approvedProfile, metadata),
    { allow: true }
  );
});

test("redirects an approved signed-in user away from login and password setup", () => {
  assert.deepEqual(
    getAuthenticatedRedirect("/", approvedProfile, {}),
    { redirect: "/dashboard" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/login", approvedProfile, {}),
    { redirect: "/dashboard" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/register", approvedProfile, {}),
    { redirect: "/dashboard" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/set-password", approvedProfile, {}),
    { redirect: "/dashboard" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/reset-password", approvedProfile, {}),
    { allow: true }
  );
});

test("denies blocked users and keeps pending users on registration", () => {
  assert.deepEqual(
    getAuthenticatedRedirect(
      "/dashboard",
      { ...approvedProfile, is_blocked: true },
      {}
    ),
    { redirect: "/login?error=blocked" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect(
      "/dashboard",
      { ...approvedProfile, approval_status: "Pending" },
      {}
    ),
    { redirect: "/register" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect(
      "/reset-password",
      { ...approvedProfile, is_blocked: true },
      {}
    ),
    { redirect: "/login?error=blocked" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect(
      "/reset-password",
      { ...approvedProfile, approval_status: "Pending" },
      {}
    ),
    { redirect: "/register" }
  );
});

test("keeps pending users on registration and sends approved users to password setup", () => {
  const pendingProfile = { ...approvedProfile, approval_status: "Pending" };
  const metadata = { [MUST_CHANGE_PASSWORD_KEY]: true };

  assert.deepEqual(
    getAuthenticatedRedirect("/register", pendingProfile, metadata),
    { allow: true }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/set-password", pendingProfile, metadata),
    { redirect: "/register" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/dashboard", pendingProfile, metadata),
    { redirect: "/register" }
  );
  assert.deepEqual(
    getAuthenticatedRedirect("/approval-pending", approvedProfile, metadata),
    { redirect: "/set-password" }
  );
});
