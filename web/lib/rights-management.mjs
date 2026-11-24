import { getManageableUser } from "./user-management.mjs";

const EXPECTED_RIGHTS = new Map([
  ["CUSTOMER", 3],
  ["PRODUCT", 6],
  ["HR", 13],
  ["SALES", 7],
  ["REPORTS", 7],
]);

const MAX_RIGHTS = 36;
const PAGE_SIZE = 1000;

function validId(value) {
  return (
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value > 0) ||
    (typeof value === "string" &&
      /^[1-9]\d*$/.test(value))
  );
}

export async function loadManagedUserRights(admin, actorRole, targetId) {
  const target = await getManageableUser(admin, actorRole, targetId);
  if (target.status !== "ok") return target;

  const { data: modules, error: moduleError, count: moduleCount } =
    await admin
      .from("module")
      .select("id, code, name, sort_order", { count: "exact" })
      .eq("status", "Active")
      .order("sort_order");

  if (moduleError) {
    return { status: "unavailable", code: moduleError.code };
  }

  const { data: rights, error: rightsError, count: rightsCount } =
    await admin
      .from("rights")
      .select("id, module_id, code, label, sort_order", {
        count: "exact",
      })
      .eq("status", "Active")
      .order("sort_order");

  if (rightsError) {
    return { status: "unavailable", code: rightsError.code };
  }

  if (
    !Array.isArray(modules) ||
    !Array.isArray(rights) ||
    moduleCount !== modules.length ||
    rightsCount !== rights.length ||
    modules.length > EXPECTED_RIGHTS.size ||
    rights.length > MAX_RIGHTS ||
    modules.some(
      (item) =>
        !validId(item.id) ||
        typeof item.code !== "string" ||
        !item.code.trim() ||
        typeof item.name !== "string" ||
        !item.name.trim()
    ) ||
    rights.some(
      (item) =>
        !validId(item.id) ||
        !validId(item.module_id) ||
        typeof item.code !== "string" ||
        !item.code.trim() ||
        typeof item.label !== "string" ||
        !item.label.trim()
    )
  ) {
    return {
      status: "unavailable",
      code: "invalid_rights_catalogue",
    };
  }

  const moduleIds = new Set(modules.map((item) => String(item.id)));
  const moduleCodes = new Set(modules.map((item) => item.code));
  const rightIds = new Set(rights.map((item) => String(item.id)));
  const rightCodes = new Set(rights.map((item) => item.code));

  if (
    moduleIds.size !== modules.length ||
    moduleCodes.size !== modules.length ||
    rightIds.size !== rights.length ||
    rightCodes.size !== rights.length ||
    [...moduleCodes].some((code) => !EXPECTED_RIGHTS.has(code))
  ) {
    return {
      status: "unavailable",
      code: "invalid_rights_catalogue",
    };
  }

  const activeRights = rights.filter((right) =>
    moduleIds.has(String(right.module_id))
  );

  for (const rightsModule of modules) {
    const expectedCount = EXPECTED_RIGHTS.get(rightsModule.code);

    const actualCount = activeRights.filter(
      (right) => String(right.module_id) === String(rightsModule.id)
    ).length;

    if (actualCount !== expectedCount) {
      return {
        status: "unavailable",
        code: "invalid_rights_catalogue",
      };
    }
  }

  const activeRightIds = new Set(
    activeRights.map((right) => String(right.id))
  );

  const assigned = new Set();

  if (activeRights.length > 0) {
    let offset = 0;
    let assignmentCount = null;

    while (true) {
      const { data, error, count } = await admin
        .from("user_permission")
        .select("right_id", { count: "exact" })
        .eq("user_id", targetId)
        .eq("status", "Active")
        .in(
          "right_id",
          activeRights.map((right) => right.id)
        )
        .order("right_id")
        .range(offset, offset + PAGE_SIZE - 1);

      if (
        error ||
        !Array.isArray(data) ||
        !Number.isSafeInteger(count) ||
        count < 0
      ) {
        return {
          status: "unavailable",
          code: error?.code ?? "permission_query_failed",
        };
      }

      if (assignmentCount === null) {
        assignmentCount = count;
      } else if (count !== assignmentCount) {
        return {
          status: "unavailable",
          code: "incomplete_permission_query",
        };
      }

      for (const item of data) {
        if (
          !validId(item.right_id) ||
          !activeRightIds.has(String(item.right_id))
        ) {
          return {
            status: "unavailable",
            code: "invalid_permission_assignment",
          };
        }

        assigned.add(String(item.right_id));
      }

      offset += data.length;

      if (offset >= assignmentCount) break;

      if (data.length === 0) {
        return {
          status: "unavailable",
          code: "incomplete_permission_query",
        };
      }
    }
  }

  return {
    status: "ok",
    modules: modules.map((module) => ({
      id: String(module.id),
      code: module.code,
      name: module.name,
      rights: activeRights
        .filter(
          (right) => String(right.module_id) === String(module.id)
        )
        .map((right) => ({
          id: String(right.id),
          code: right.code,
          label: right.label,
          assigned: assigned.has(String(right.id)),
        })),
    })),
  };
}


