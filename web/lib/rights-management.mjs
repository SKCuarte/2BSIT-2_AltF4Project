import { getManageableUser } from "./user-management.mjs";

function validId(value) {
  return (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && /^[1-9]\d*$/.test(value));
}

export async function loadManagedUserRights(admin, actorRole, targetId) {
  const target = await getManageableUser(admin, actorRole, targetId);
  if (target.status !== "ok") return target;

  const { data: modules, error: moduleError } = await admin
    .from("module")
    .select("id, code, name, sort_order")
    .eq("status", "Active")
    .order("sort_order");
  if (moduleError) return { status: "unavailable", code: moduleError.code };

  const { data: rights, error: rightsError } = await admin
    .from("rights")
    .select("id, module_id, code, label, sort_order")
    .eq("status", "Active")
    .order("sort_order");
  if (rightsError) return { status: "unavailable", code: rightsError.code };

  if (!Array.isArray(modules) || !Array.isArray(rights) ||
      modules.length !== 5 || rights.length !== 36 ||
      modules.some((item) => !validId(item.id) || typeof item.code !== "string" || typeof item.name !== "string") ||
      rights.some((item) => !validId(item.id) || !validId(item.module_id) || typeof item.code !== "string" || typeof item.label !== "string")) {
    return { status: "unavailable", code: "invalid_rights_catalogue" };
  }
  const moduleIds = new Set(modules.map((item) => String(item.id)));
  const rightIds = new Set(rights.map((item) => String(item.id)));
  const expectedCounts = new Map([
    ["CUSTOMER", 3], ["PRODUCT", 6], ["HR", 13], ["SALES", 7], ["REPORTS", 7],
  ]);
  if (moduleIds.size !== modules.length || rightIds.size !== rights.length ||
      new Set(modules.map((item) => item.code)).size !== expectedCounts.size ||
      modules.some((item) => expectedCounts.get(item.code) !== rights.filter(
        (right) => String(right.module_id) === String(item.id)
      ).length) ||
      rights.some((item) => !moduleIds.has(String(item.module_id)))) {
    return { status: "unavailable", code: "invalid_rights_catalogue" };
  }

  const assigned = new Set();
  const pageSize = 1000;
  for (let offset = 0; ;) {
    const { data, error, count } = await admin
      .from("user_permission")
      .select("right_id", { count: "exact" })
      .eq("user_id", targetId)
      .eq("status", "Active")
      .in("right_id", rights.map((item) => item.id))
      .order("right_id")
      .range(offset, offset + pageSize - 1);
    if (error || !Array.isArray(data) || !Number.isSafeInteger(count) || count < 0) {
      return { status: "unavailable", code: error?.code ?? "permission_query_failed" };
    }
    for (const item of data) {
      if (!validId(item.right_id) || !rightIds.has(String(item.right_id))) {
        return { status: "unavailable", code: "invalid_permission_assignment" };
      }
      assigned.add(String(item.right_id));
    }
    offset += data.length;
    if (offset >= count) break;
    if (data.length === 0) {
      return { status: "unavailable", code: "incomplete_permission_query" };
    }
  }

  return {
    status: "ok",
    modules: modules.map((module) => ({
      id: String(module.id),
      code: module.code,
      name: module.name,
      rights: rights
        .filter((right) => String(right.module_id) === String(module.id))
        .map((right) => ({
          id: String(right.id),
          code: right.code,
          label: right.label,
          assigned: assigned.has(String(right.id)),
        })),
    })),
  };
}
