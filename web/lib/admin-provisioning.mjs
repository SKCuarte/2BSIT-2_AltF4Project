import { randomBytes } from "node:crypto";
import { MUST_CHANGE_PASSWORD_KEY } from "./auth-policy.mjs";
import { findActiveRoleId, findActiveRoleName } from "./role-lookup.mjs";

const GENERIC_PROVISIONING_ERROR =
  "Unable to create this account. Verify the details or try again later.";

export function generateTemporaryPassword() {
  return randomBytes(24).toString("base64url");
}

export async function getAdminProvisioningAccess(admin, authUserId) {
  const { data: account, error: accountError } = await admin
    .from("app_user")
    .select("role_id, is_blocked, approval_status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (accountError) {
    console.error("Admin provisioning account lookup failed:", {
      code: accountError.code ?? "account_lookup_failed",
    });
    return { status: "unavailable" };
  }

  if (!account || account.is_blocked || account.approval_status !== "Approved") {
    return { status: "forbidden" };
  }

  let roleResult;
  try {
    roleResult = await findActiveRoleName(admin, account.role_id);
  } catch (error) {
    console.error("Admin provisioning role lookup failed:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: "unavailable" };
  }
  if (roleResult.error) {
    console.error("Admin provisioning role lookup failed:", {
      code: roleResult.error.code ?? "role_lookup_failed",
    });
    return { status: "unavailable" };
  }
  if (!["Admin", "Superadmin"].includes(roleResult.roleName)) {
    return { status: "forbidden" };
  }

  return { status: "allowed" };
}

export function validateProvisioningInput(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("firstName" in value) ||
    !("lastName" in value) ||
    !("email" in value) ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string"
  ) {
    return null;
  }

  const firstName = value.firstName.trim();
  const lastName = value.lastName.trim();
  const email = value.email.trim().toLowerCase();
  const containsControlCharacter = /[\u0000-\u001f\u007f]/;

  if (
    !firstName ||
    firstName.length > 100 ||
    containsControlCharacter.test(firstName) ||
    !lastName ||
    lastName.length > 100 ||
    containsControlCharacter.test(lastName) ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return { firstName, lastName, email };
}

export async function provisionRegularUser(admin, input) {
  let roleResult;
  try {
    roleResult = await findActiveRoleId(admin, "User");
  } catch (error) {
    console.error("Admin provisioning User role lookup failed:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false,
      status: 503,
      error: GENERIC_PROVISIONING_ERROR,
    };
  }
  if (roleResult.error || roleResult.roleId === null) {
    console.error("Admin provisioning User role lookup failed:", {
      code: roleResult.error?.code ?? "active_user_role_missing",
    });
    return {
      ok: false,
      status: 503,
      error: GENERIC_PROVISIONING_ERROR,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: { [MUST_CHANGE_PASSWORD_KEY]: true },
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });

  if (authError || !authData.user) {
    console.error("Admin provisioning Auth user creation failed:", {
      code: authError?.code ?? authError?.status ?? "auth_create_failed",
    });
    return {
      ok: false,
      status: 400,
      error: GENERIC_PROVISIONING_ERROR,
    };
  }

  const { error: profileError } = await admin.from("app_user").insert({
    auth_user_id: authData.user.id,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    role_id: roleResult.roleId,
    is_blocked: false,
    approval_status: "Pending",
  });

  if (profileError) {
    console.error("Admin provisioning profile insert failed:", {
      authUserId: authData.user.id,
      code: profileError.code ?? "profile_insert_failed",
    });

    const { error: cleanupError } = await admin.auth.admin.deleteUser(
      authData.user.id
    );

    if (cleanupError) {
      console.error("Admin provisioning Auth cleanup failed:", {
        authUserId: authData.user.id,
        code: cleanupError.code ?? cleanupError.status ?? "auth_cleanup_failed",
      });
      return {
        ok: false,
        status: 503,
        error:
          "Account setup could not be completed and automatic cleanup failed. An administrator must investigate this account before retrying.",
      };
    }

    return {
      ok: false,
      status: 503,
      error: "Account setup could not be completed. Please try again later.",
    };
  }

  return {
    ok: true,
    temporaryPassword,
  };
}
