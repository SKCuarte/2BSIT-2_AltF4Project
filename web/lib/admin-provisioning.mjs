import { randomBytes } from "node:crypto";
import { MUST_CHANGE_PASSWORD_KEY } from "./auth-policy.mjs";
import {
  findActiveRoleId,
  findActiveRoleName,
  findAppUserRoleColumn,
  findAuthorizationAccount,
} from "./role-lookup.mjs";

const GENERIC_PROVISIONING_ERROR =
  "Unable to create this account. Verify the details or try again later.";

export function generateTemporaryPassword() {
  return randomBytes(24).toString("base64url");
}

/** @param {{ id: string, app_metadata: Record<string, unknown> }} authUser */
export async function getAdminProvisioningAccess(admin, authUser) {
  if (!authUser || typeof authUser.id !== "string" ||
      !authUser.app_metadata || typeof authUser.app_metadata !== "object" ||
      Array.isArray(authUser.app_metadata)) {
    console.error("Admin provisioning Auth user metadata is unavailable.");
    return { status: "unavailable" };
  }
  if (authUser.app_metadata[MUST_CHANGE_PASSWORD_KEY] === true) {
    return { status: "forbidden" };
  }

  const { account, roleColumn, error: accountError } =
    await findAuthorizationAccount(admin, authUser.id);

  if (accountError) {
    console.error("Admin provisioning account lookup failed:", {
      code: accountError.code ?? "account_lookup_failed",
    });
    return { status: "unavailable" };
  }

  if (
    !account ||
    account.is_blocked ||
    account.approval_status !== "Approved" ||
    account.status !== "Active"
  ) {
    return { status: "forbidden" };
  }

  let roleResult;
  if (roleColumn === "role_id") {
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
  }
  const roleName =
    roleColumn === "role_id" ? roleResult.roleName : account.role;
  if (!["Admin", "Superadmin"].includes(roleName)) {
    return { status: "forbidden", roleName };
  }

  return { status: "allowed", roleName };
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

export async function provisionRegularUser(admin, input, redirectTo) {
  if (!redirectTo) {
    console.error("Admin provisioning verification URL is unavailable.");
    return { ok: false, status: 503, error: GENERIC_PROVISIONING_ERROR };
  }
  const roleSchema = await findAppUserRoleColumn(admin);
  if (roleSchema.error || !roleSchema.roleColumn) {
    console.error("Admin provisioning role schema lookup failed:", {
      code: roleSchema.error?.code ?? "role_column_missing",
    });
    return {
      ok: false,
      status: 503,
      error: GENERIC_PROVISIONING_ERROR,
    };
  }

  let userRoleId = null;
  if (roleSchema.roleColumn === "role_id") {
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
    userRoleId = roleResult.roleId;
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: temporaryPassword,
      email_confirm: false,
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

  const profile = {
    auth_user_id: authData.user.id,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    role_id: userRoleId,
    is_blocked: false,
    approval_status: "Pending",
  };
  if (roleSchema.roleColumn === "role") {
    delete profile.role_id;
    profile.role = "User";
  }

  const { error: profileError } = await admin.from("app_user").insert(profile);

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

  let invitation;
  try {
    invitation = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo });
  } catch (error) {
    console.error("Admin provisioning invitation failed:", {
      code: error instanceof Error ? error.name : "invitation_failed",
    });
    return { ok: false, status: 503, error: "Account was saved, but the verification invitation failed. Contact an administrator." };
  }
  if (invitation.error || invitation.data?.user?.id !== authData.user.id) {
    console.error("Admin provisioning invitation failed:", {
      code: invitation.error?.code ?? "unexpected_invitation_user",
    });
    return { ok: false, status: 503, error: "Account was saved, but the verification invitation failed. Contact an administrator." };
  }

  return {
    ok: true,
    temporaryPassword,
  };
}
