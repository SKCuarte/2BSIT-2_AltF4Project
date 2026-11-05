import {
  findActiveRoleId,
  findAppUserRoleColumn,
} from "./role-lookup.mjs";

const VALID_STATUSES = new Set([
  "Active",
  "Blocked",
  "Inactive",
  "Pending",
  "Rejected",
]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function getVisibleManagedRoles(actorRole) {
  if (actorRole === "Admin") return ["User"];
  if (actorRole === "Superadmin") return ["User", "Admin"];
  return [];
}

export function canManageRole(actorRole, targetRole) {
  return getVisibleManagedRoles(actorRole).includes(targetRole);
}

export function getManagedAccountStatus(account) {
  if (account.is_blocked) return "Blocked";
  if (account.status === "Inactive") return "Inactive";
  if (account.approval_status === "Pending") return "Pending";
  if (account.approval_status === "Rejected") return "Rejected";
  return "Active";
}

export function validateUserListQuery(value) {
  const search =
    typeof value.search === "string"
      ? value.search.trim().replace(/[^\p{L}\p{N}@._+\-' ]/gu, " ")
      : "";
  const page = value.page === undefined ? 1 : Number(value.page);
  const pageSize = value.pageSize === undefined ? 25 : Number(value.pageSize);
  const role = value.role === undefined || value.role === "" ? null : value.role;
  const status =
    value.status === undefined || value.status === "" ? null : value.status;

  if (
    search.length > 100 ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (role !== null && !["User", "Admin"].includes(role)) ||
    (status !== null && !VALID_STATUSES.has(status))
  ) {
    return null;
  }

  return { search, page, pageSize, role, status };
}

export function validateUserChanges(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const keys = Object.keys(value).sort();
  if (
    keys.length === 2 &&
    keys[0] === "firstName" &&
    keys[1] === "lastName" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string"
  ) {
    const firstName = value.firstName.trim();
    const lastName = value.lastName.trim();
    if (
      firstName.length > 0 &&
      firstName.length <= 100 &&
      lastName.length > 0 &&
      lastName.length <= 100 &&
      !CONTROL_CHARACTERS.test(firstName) &&
      !CONTROL_CHARACTERS.test(lastName)
    ) {
      return { type: "profile", firstName, lastName };
    }
    return null;
  }

  if (keys.length === 1 && keys[0] === "isBlocked" && typeof value.isBlocked === "boolean") {
    return { type: "block", isBlocked: value.isBlocked };
  }

  if (
    keys.length === 1 &&
    keys[0] === "role" &&
    (value.role === "User" || value.role === "Admin")
  ) {
    return { type: "role", role: value.role };
  }

  return null;
}

function isAppUserId(value) {
  return (
    typeof value === "string" &&
    /^[1-9]\d{0,18}$/.test(value) &&
    BigInt(value) <= 9223372036854775807n
  );
}

async function findOptionalColumn(admin, column) {
  const { error } = await admin.from("app_user").select(column).limit(0);
  if (!error) return { available: true, error: null };
  if (error.code === "42703") return { available: false, error: null };
  return { available: false, error };
}

async function getUserSchema(admin) {
  const roleSchema = await findAppUserRoleColumn(admin);
  if (roleSchema.error || !roleSchema.roleColumn) {
    return { error: roleSchema.error ?? { code: "role_column_missing" } };
  }

  const status = await findOptionalColumn(admin, "status");
  if (status.error) return { error: status.error };

  const createdAt = await findOptionalColumn(admin, "created_at");
  if (createdAt.error) return { error: createdAt.error };
  const stamp = createdAt.available
    ? { available: false, error: null }
    : await findOptionalColumn(admin, "stamp");
  if (stamp.error) return { error: stamp.error };

  return {
    roleColumn: roleSchema.roleColumn,
    statusColumn: status.available ? "status" : null,
    createdColumn: createdAt.available
      ? "created_at"
      : stamp.available
        ? "stamp"
        : null,
    error: null,
  };
}

function createdDate(account, createdColumn) {
  if (!createdColumn) return null;
  if (createdColumn === "created_at") return account.created_at;
  return account.stamp?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

function filterSearch(query, search) {
  if (!search) return query;
  const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  const value = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return query.or(
    `first_name.ilike.${value},last_name.ilike.${value},email.ilike.${value}`
  );
}

function filterStatus(query, status, statusColumn) {
  if (!status) return query;
  if (status === "Blocked") return query.eq("is_blocked", true);
  if (status === "Inactive") {
    return statusColumn
      ? query.eq("status", "Inactive").eq("is_blocked", false)
      : null;
  }

  query = query.eq("is_blocked", false);
  if (statusColumn) query = query.eq("status", "Active");
  return query.eq(
    "approval_status",
    status === "Active" ? "Approved" : status
  );
}

function roleErrorCode(error) {
  return error?.code ?? "user_management_query_failed";
}

export async function listManagedUsers(admin, actorRole, rawQuery) {
  const options = validateUserListQuery(rawQuery);
  if (!options) return { status: "invalid" };

  const visibleRoles = getVisibleManagedRoles(actorRole);
  if (visibleRoles.length === 0) return { status: "forbidden" };

  const schema = await getUserSchema(admin);
  if (schema.error) {
    return { status: "unavailable", code: roleErrorCode(schema.error) };
  }

  let rolesById = new Map();
  let roleValues = visibleRoles;
  if (schema.roleColumn === "role_id") {
    const { data: roles, error } = await admin
      .from("role")
      .select("id, name")
      .eq("status", "Active")
      .in("name", visibleRoles);
    if (error) {
      return { status: "unavailable", code: roleErrorCode(error) };
    }
    const manageableRoles = (roles ?? []).filter((role) =>
      visibleRoles.includes(role.name)
    );
    rolesById = new Map(
      manageableRoles.map((role) => [String(role.id), role.name])
    );
    roleValues = manageableRoles
      .filter((role) => !options.role || role.name === options.role)
      .map((role) => role.id);
  } else if (options.role) {
    roleValues = visibleRoles.filter((role) => role === options.role);
  }

  if (options.role && !canManageRole(actorRole, options.role)) {
    return { status: "forbidden" };
  }
  if (roleValues.length === 0) {
    return {
      status: "ok",
      users: [],
      total: 0,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  const columns = [
    "id",
    "first_name",
    "last_name",
    "email",
    schema.roleColumn,
    "is_blocked",
    "approval_status",
    ...(schema.statusColumn ? [schema.statusColumn] : []),
    ...(schema.createdColumn ? [schema.createdColumn] : []),
  ];
  let query = admin
    .from("app_user")
    .select(columns.join(", "), { count: "exact" })
    .in(schema.roleColumn, roleValues);
  query = filterSearch(query, options.search);
  query = filterStatus(query, options.status, schema.statusColumn);
  if (!query) {
    return {
      status: "ok",
      users: [],
      total: 0,
      page: options.page,
      pageSize: options.pageSize,
    };
  }
  if (schema.createdColumn === "created_at") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("id", { ascending: false });
  }
  const start = (options.page - 1) * options.pageSize;
  const { data, error, count } = await query.range(
    start,
    start + options.pageSize - 1
  );
  if (error) return { status: "unavailable", code: roleErrorCode(error) };

  return {
    status: "ok",
    users: (data ?? [])
      .map((account) => {
        const role =
          schema.roleColumn === "role_id"
            ? rolesById.get(String(account.role_id))
            : account.role;
        return { account, role };
      })
      .filter(({ role }) => canManageRole(actorRole, role))
      .map(({ account, role }) => ({
        id: String(account.id),
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
        role,
        status: getManagedAccountStatus(account),
        createdAt: createdDate(account, schema.createdColumn),
      })),
    total: count ?? 0,
    page: options.page,
    pageSize: options.pageSize,
  };
}

export async function listPendingUserApprovals(admin) {
  const schema = await getUserSchema(admin);
  if (schema.error) {
    return { status: "unavailable", code: roleErrorCode(schema.error) };
  }

  let userRole = "User";
  let rolesById = null;
  if (schema.roleColumn === "role_id") {
    const { data: role, error: roleError } = await admin
      .from("role")
      .select("id")
      .eq("name", "User")
      .eq("status", "Active")
      .maybeSingle();
    if (roleError) {
      return { status: "unavailable", code: roleErrorCode(roleError) };
    }
    if (!role) return { status: "ok", approvals: [] };
    userRole = role.id;
    rolesById = new Map([[String(role.id), "User"]]);
  }

  const columns = [
    "id",
    "first_name",
    "last_name",
    "email",
    schema.roleColumn,
    "approval_status",
    "is_blocked",
    ...(schema.statusColumn ? [schema.statusColumn] : []),
  ];
  const { data, error } = await admin
    .from("app_user")
    .select(columns.join(", "))
    .eq(schema.roleColumn, userRole)
    .eq("approval_status", "Pending")
    .order("id", { ascending: true });
  if (error) return { status: "unavailable", code: roleErrorCode(error) };

  return {
    status: "ok",
    approvals: (data ?? []).map((account) => ({
      id: String(account.id),
      firstName: account.first_name,
      lastName: account.last_name,
      email: account.email,
      isBlocked: account.is_blocked,
      role: rolesById
        ? rolesById.get(String(account.role_id))
        : account.role,
    })),
  };
}

export async function decideUserApproval(admin, targetId, decision) {
  if (!isAppUserId(targetId) || !["approve", "reject"].includes(decision)) {
    return { status: "invalid" };
  }

  const schema = await getUserSchema(admin);
  if (schema.error) {
    return { status: "unavailable", code: roleErrorCode(schema.error) };
  }

  let userRole = "User";
  if (schema.roleColumn === "role_id") {
    const { data: role, error: roleError } = await admin
      .from("role")
      .select("id")
      .eq("name", "User")
      .eq("status", "Active")
      .maybeSingle();
    if (roleError) {
      return { status: "unavailable", code: roleErrorCode(roleError) };
    }
    if (!role) return { status: "not_found" };
    userRole = role.id;
  }

  const values = {
    approval_status: decision === "approve" ? "Approved" : "Rejected",
    ...(decision === "approve" && schema.statusColumn
      ? { [schema.statusColumn]: "Active" }
      : {}),
  };
  const { data, error } = await admin
    .from("app_user")
    .update(values)
    .eq("id", targetId)
    .eq(schema.roleColumn, userRole)
    .eq("approval_status", "Pending")
    .select("id, is_blocked")
    .maybeSingle();

  if (error) return { status: "unavailable", code: roleErrorCode(error) };
  if (!data) return { status: "conflict" };
  return {
    status: "ok",
    approvalStatus: values.approval_status,
    wasBlocked: data.is_blocked,
  };
}

async function getManageableUser(admin, actorRole, targetId) {
  const schema = await getUserSchema(admin);
  if (schema.error) {
    return { status: "unavailable", code: roleErrorCode(schema.error) };
  }

  const accountColumns = [
    "id",
    schema.roleColumn,
    "auth_user_id",
    "approval_status",
    "is_blocked",
    ...(schema.statusColumn ? [schema.statusColumn] : []),
  ];
  const { data: account, error } = await admin
    .from("app_user")
    .select(accountColumns.join(", "))
    .eq("id", targetId)
    .maybeSingle();
  if (error) return { status: "unavailable", code: roleErrorCode(error) };
  if (!account) return { status: "not_found" };

  let role;
  if (schema.roleColumn === "role_id") {
    const { data, error: roleError } = await admin
      .from("role")
      .select("name")
      .eq("id", account.role_id)
      .eq("status", "Active")
      .maybeSingle();
    if (roleError) {
      return { status: "unavailable", code: roleErrorCode(roleError) };
    }
    role = data?.name;
  } else {
    role = account.role;
  }

  if (role === "Superadmin") {
    return actorRole === "Superadmin"
      ? { status: "protected" }
      : { status: "forbidden" };
  }
  if (!canManageRole(actorRole, role)) return { status: "forbidden" };
  return { status: "ok", account, schema, role };
}

export async function updateManagedUser(
  admin,
  actorRole,
  targetId,
  rawChanges
) {
  if (!isAppUserId(targetId)) return { status: "invalid" };
  const changes = validateUserChanges(rawChanges);
  if (!changes) return { status: "invalid" };
  if (changes.type === "role" && actorRole !== "Superadmin") {
    return { status: "forbidden" };
  }

  const target = await getManageableUser(admin, actorRole, targetId);
  if (target.status !== "ok") return target;

  if (changes.type === "role") {
    if (
      target.account.approval_status !== "Approved" ||
      target.account.is_blocked ||
      (target.schema.statusColumn &&
        target.account[target.schema.statusColumn] !== "Active")
    ) {
      return { status: "ineligible" };
    }
  }

  let values;
  if (changes.type === "profile") {
    values = {
      first_name: changes.firstName,
      last_name: changes.lastName,
    };
  } else if (changes.type === "block") {
    values = { is_blocked: changes.isBlocked };
  } else if (target.schema.roleColumn === "role_id") {
    const roleResult = await findActiveRoleId(admin, changes.role);
    if (roleResult.error || roleResult.roleId === null) {
      return {
        status: "unavailable",
        code: roleErrorCode(roleResult.error ?? { code: "active_role_missing" }),
      };
    }
    values = { role_id: roleResult.roleId };
  } else {
    values = { role: changes.role };
  }

  let query = admin
    .from("app_user")
    .update(values)
    .eq("id", targetId)
    .eq(target.schema.roleColumn, target.account[target.schema.roleColumn]);
  if (changes.type === "role") {
    query = query
      .eq("approval_status", "Approved")
      .eq("is_blocked", false);
    if (target.schema.statusColumn) {
      query = query.eq(target.schema.statusColumn, "Active");
    }
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return { status: "unavailable", code: roleErrorCode(error) };
  if (!data) {
    return changes.type === "role"
      ? { status: "conflict" }
      : { status: "not_found" };
  }
  return { status: "ok" };
}
