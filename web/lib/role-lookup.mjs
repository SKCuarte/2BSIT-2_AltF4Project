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
