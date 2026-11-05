export const MUST_CHANGE_PASSWORD_KEY = "must_change_password";

function normalizeApprovalStatus(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getProfileAccessIssue(profile) {
  if (!profile) return "profile_missing";
  if (profile.is_blocked) return "blocked";
  const approvalStatus = normalizeApprovalStatus(profile.approval_status);
  if (approvalStatus === "rejected") return "rejected";
  if (approvalStatus !== "approved") return "pending";
  return null;
}

export function getAuthenticatedRedirect(pathname, profile, appMetadata) {
  const mustChangePassword =
    appMetadata?.[MUST_CHANGE_PASSWORD_KEY] === true;
  const issue = getProfileAccessIssue(profile);

  if (issue === "pending") {
    return pathname === "/register"
      ? { allow: true }
      : { redirect: "/register" };
  }
  if (issue) return { redirect: `/login?error=${issue}` };

  if (mustChangePassword) {
    if (pathname === "/set-password") return { allow: true };
    return { redirect: "/set-password" };
  }

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/set-password" ||
    pathname === "/approval-pending"
  ) {
    return { redirect: "/dashboard" };
  }

  return { allow: true };
}
