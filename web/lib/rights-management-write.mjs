import { getManageableUser } from "./user-management.mjs";
import { getRightsWritePolicyDecision } from "./rights-management-policy.mjs";


const MAX_RIGHTS_PER_USER = 36;
const MAX_BIGINT = 9223372036854775807n;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeAppUserId(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return String(value);
  }

  if (typeof value !== "string") return null;

  if (UUID_PATTERN.test(value)) return value;

  if (!/^[1-9]\d{0,18}$/.test(value)) return null;

  return BigInt(value) <= MAX_BIGINT ? value : null;
}
function normalizeRightId(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return String(value);
  }

  if (typeof value !== "string" || !/^[1-9]\d{0,18}$/.test(value)) {
    return null;
  }

  return BigInt(value) <= MAX_BIGINT ? value : null;
}

export function validateRightsSelection(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !Object.hasOwn(value, "rightIds") ||
    !Array.isArray(value.rightIds) ||
    value.rightIds.length > MAX_RIGHTS_PER_USER
  ) {
    return { status: "invalid" };
  }

  const rightIds = value.rightIds.map(normalizeRightId);

  if (
    rightIds.some((id) => id === null) ||
    new Set(rightIds).size !== rightIds.length
  ) {
    return { status: "invalid" };
  }

  return { status: "ok", rightIds };
}

export function planRightsChanges(
  catalogueRightIds,
  assignments,
  selectedRightIds
) {
  if (
    !Array.isArray(catalogueRightIds) ||
    !Array.isArray(assignments) ||
    !Array.isArray(selectedRightIds)
  ) {
    return { status: "invalid" };
  }

  const catalogueIds = catalogueRightIds.map(normalizeRightId);
  const selectedIds = selectedRightIds.map(normalizeRightId);

  if (
    catalogueIds.some((id) => id === null) ||
    selectedIds.some((id) => id === null) ||
    new Set(catalogueIds).size !== catalogueIds.length ||
    new Set(selectedIds).size !== selectedIds.length ||
    selectedIds.some((id) => !catalogueIds.includes(id))
  ) {
    return { status: "invalid" };
  }

  const activeIds = new Set();

  for (const assignment of assignments) {
    if (
      typeof assignment !== "object" ||
      assignment === null ||
      !("right_id" in assignment) ||
      !("status" in assignment) ||
      !["Active", "Inactive"].includes(assignment.status)
    ) {
      return { status: "invalid" };
    }

    const rightId = normalizeRightId(assignment.right_id);

    if (rightId === null) return { status: "invalid" };

    if (assignment.status === "Active") {
      if (activeIds.has(rightId)) {
        return { status: "duplicate_active" };
      }
      activeIds.add(rightId);
    }
  }

  const selected = new Set(selectedIds);

  return {
    status: "ok",
    grantRightIds: selectedIds.filter((id) => !activeIds.has(id)),
    revokeRightIds: [...activeIds].filter((id) => !selected.has(id)),
  };
}

export async function saveManagedUserRights(
  admin,
  actorRole,
  actorId,
  targetId,
  rightIds
) {
  const selection = validateRightsSelection({ rightIds });
  const normalizedActorId = normalizeAppUserId(actorId);
  const normalizedTargetId = normalizeAppUserId(targetId);

  if (
    selection.status !== "ok" ||
    normalizedActorId === null ||
    normalizedTargetId === null ||
    typeof actorRole !== "string"
  ) {
    return { status: "invalid" };
  }

  const target = await getManageableUser(
    admin,
    actorRole,
    normalizedTargetId
  );

  if (target.status !== "ok") return target;

  const policy = getRightsWritePolicyDecision({
    actorRole,
    targetRole: target.role,
  });

  if (!policy.allowed) {
    return { status: "forbidden", code: policy.code };
  }

  const { data, error } = await admin.rpc(
    "manage_user_permissions",
    {
      p_actor_id: normalizedActorId,
      p_target_user_id: normalizedTargetId,
      p_right_ids: selection.rightIds,
    }
  );

  if (error) {
    return {
      status: "unavailable",
      code: error.code ?? "permission_rpc_failed",
    };
  }

  if (!Number.isSafeInteger(data) || data < 0) {
    return {
      status: "unavailable",
      code: "invalid_permission_rpc_response",
    };
  }

  return {
    status: "ok",
    changedCount: data,
  };
}