import { findActiveRoleName, findAuthorizationAccount } from "./role-lookup.mjs";

/**
 * @returns {Promise<{status: "unavailable" | "forbidden"} | {
 *   status: "ok", role: "User" | "Admin" | "Superadmin",
 *   catalogue: {id: string, module: string, action: string}[],
 *   grants: {id: string, module: string, action: string}[]
 * }>}
 */
export async function loadDashboardAccess(admin, authUserId) {
  const { account, roleColumn, error } = await findAuthorizationAccount(admin, authUserId);
  if (error) {
    console.error("Dashboard account lookup failed:", { code: error.code });
    return { status: "unavailable" };
  }
  if (!account || account.status !== "Active" || account.is_blocked ||
      account.approval_status !== "Approved") return { status: "forbidden" };

  let role = account.role;
  if (roleColumn === "role_id") {
    const result = await findActiveRoleName(admin, account.role_id);
    if (result.error) {
      console.error("Dashboard role lookup failed:", { code: result.error.code });
      return { status: "unavailable" };
    }
    role = result.roleName;
  }
  if (!["User", "Admin", "Superadmin"].includes(role)) return { status: "forbidden" };

  const [{ data: rights, error: rightsError, count: rightsCount },
    { data: modules, error: modulesError, count: modulesCount }] =
    await Promise.all([
      admin.from("rights").select("id, module_id, action", { count: "exact" }).eq("status", "Active"),
      admin.from("module").select("id, code", { count: "exact" }).eq("status", "Active"),
    ]);
  if (rightsError || modulesError || !Array.isArray(rights) || !Array.isArray(modules) ||
      rightsCount !== rights.length || modulesCount !== modules.length) {
    console.error("Dashboard rights catalogue lookup failed:", {
      code: rightsError?.code ?? modulesError?.code ?? "invalid_catalogue",
    });
    return { status: "unavailable" };
  }
  const activeModules = new Map(modules.map((item) => [String(item.id), item.code]));
  const catalogue = rights.filter((right) => activeModules.has(String(right.module_id))).map((right) => ({
    id: String(right.id),
    module: activeModules.get(String(right.module_id)),
    action: right.action,
  }));
  if (catalogue.some((right) => !right.module || typeof right.action !== "string")) {
    console.error("Dashboard rights catalogue is invalid.");
    return { status: "unavailable" };
  }
  if (role !== "User") return { status: "ok", role, catalogue, grants: [] };

  const { data: permissions, error: permissionError, count: permissionCount } = await admin.from("user_permission")
    .select("right_id", { count: "exact" }).eq("user_id", account.id).eq("status", "Active");
  if (permissionError || !Array.isArray(permissions) || permissionCount !== permissions.length) {
    console.error("Dashboard permission lookup failed:", {
      code: permissionError?.code ?? "invalid_permissions",
    });
    return { status: "unavailable" };
  }
  const assigned = new Set(permissions.map((item) => String(item.right_id)));
  return { status: "ok", role, catalogue, grants: catalogue.filter((right) => assigned.has(right.id)) };
}
