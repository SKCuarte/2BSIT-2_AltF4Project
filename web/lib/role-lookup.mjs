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
