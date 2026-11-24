export async function findAppUserRoleColumn(admin) {
  try {
    const { error: roleIdError } = await admin
      .from("app_user")
      .select("role_id")
      .limit(0);

    if (!roleIdError) return { roleColumn: "role_id", error: null };
    if (roleIdError.code !== "42703") {
      return { roleColumn: null, error: roleIdError };
    }

    const { error: roleError } = await admin
      .from("app_user")
      .select("role")
      .limit(0);

    return roleError
      ? { roleColumn: null, error: roleError }
      : { roleColumn: "role", error: null };
  } catch (error) {
    return { roleColumn: null, error };
  }
}

export async function findAuthorizationAccount(admin, authUserId) {
  const load = (roleColumn) => admin.from("app_user")
      .select(`id, ${roleColumn}, is_blocked, approval_status, status`)
      .eq("auth_user_id", authUserId)
      .maybeSingle();
  const primary = await load("role_id");
  if (!primary.error) return { account: primary.data, roleColumn: "role_id", error: null };
  if (primary.error.code !== "42703") {
    return { account: null, roleColumn: null, error: primary.error };
  }
  const fallback = await load("role");
  return fallback.error
    ? { account: null, roleColumn: null, error: fallback.error }
    : { account: fallback.data, roleColumn: "role", error: null };
}

export async function findActiveRoleId(admin, roleName) {
  const { data, error } = await admin
    .from("role")
    .select("id")
    .eq("name", roleName)
    .eq("status", "Active")
    .maybeSingle();

  return { roleId: data?.id ?? null, error };
}

export async function findActiveRoleName(admin, roleId) {
  const { data, error } = await admin
    .from("role")
    .select("name")
    .eq("id", roleId)
    .eq("status", "Active")
    .maybeSingle();

  return { roleName: data?.name ?? null, error };
}
