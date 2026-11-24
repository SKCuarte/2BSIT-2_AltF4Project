const MANAGEABLE_ROLES = {
  Admin: ["User"],
  Superadmin: ["User", "Admin"],
};

export function getRightsWritePolicyDecision(context) {
  if (
    typeof context !== "object" ||
    context === null ||
    typeof context.actorRole !== "string" ||
    typeof context.targetRole !== "string"
  ) {
    return { allowed: false, code: "invalid_policy_context" };
  }

  const manageableRoles = MANAGEABLE_ROLES[context.actorRole];

  if (!manageableRoles) {
    return { allowed: false, code: "forbidden" };
  }

  if (context.targetRole === "Superadmin") {
    return { allowed: false, code: "protected" };
  }

  if (!manageableRoles.includes(context.targetRole)) {
    return { allowed: false, code: "forbidden" };
  }

  return { allowed: true, code: "allowed" };
}