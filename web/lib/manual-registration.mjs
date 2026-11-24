import { MUST_CHANGE_PASSWORD_KEY } from "./auth-policy.mjs";

/**
 * Creates a pending Auth identity and sends an email invitation.
 *
 * @param {{ firstName: string; lastName: string; email: string }} input
 * @param {object} dependencies
 */
export async function createPendingManualRegistration(input, dependencies) {
  let roleResult;

  try {
    roleResult = await dependencies.findUserRoleId();
  } catch (error) {
    return failure(dependencies, "Registration User role lookup failed", error);
  }

  if (roleResult.error || roleResult.roleId == null) {
    return failure(
      dependencies,
      "Registration User role lookup failed",
      roleResult.error ?? new Error("Active User role was not found.")
    );
  }

  let existingProfile;

  try {
    existingProfile = await dependencies.findProfileByEmail(input.email);
  } catch (error) {
    return failure(dependencies, "Registration email lookup failed", error);
  }

  if (existingProfile.error) {
    return failure(
      dependencies,
      "Registration email lookup failed",
      existingProfile.error
    );
  }

  if (existingProfile.profile) {
    return {
      status: 409,
      body: { error: "This email already has a registration request or account." },
    };
  }

  let invitation;

  try {
    invitation = await dependencies.inviteAuthUser(input.email, {
      first_name: input.firstName,
      last_name: input.lastName,
    });
  } catch (error) {
    invitation = { error };
  }

  if (invitation.error || !invitation.user?.id) {
    if (
      invitation.error?.code === "email_exists" ||
      invitation.error?.code === "user_already_exists"
    ) {
      return {
        status: 409,
        body: { error: "This email already has a registration request or account." },
      };
    }

    logFailure(
      dependencies,
      "Registration invitation failed",
      invitation.error ?? new Error("Invitation returned no Auth user.")
    );

    return {
      status: 503,
      body: {
        error: "Unable to send the verification invitation. Please try again or contact the administrator.",
      },
    };
  }

  const authUserId = invitation.user.id;

  let metadataResult;

  try {
    metadataResult = await dependencies.updateAuthUser(authUserId, {
      app_metadata: { [MUST_CHANGE_PASSWORD_KEY]: true },
    });
  } catch (error) {
    metadataResult = { error };
  }

  if (metadataResult.error || !metadataResult.user?.id) {
    logFailure(
      dependencies,
      "Registration Auth metadata update failed",
      metadataResult.error ?? new Error("Auth metadata update returned no user.")
    );

    const cleanupOk = await cleanupAuthUser(authUserId, dependencies);

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to finish registration setup. Please try again."
          : "Registration setup failed and cleanup could not be completed. Contact the administrator.",
      },
    };
  }

  let profileResult;

  try {
    profileResult = await dependencies.insertProfile({
      auth_user_id: authUserId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      role_id: roleResult.roleId,
      approval_status: "Pending",
      is_blocked: false,
    });
  } catch (error) {
    profileResult = { error };
  }

  if (profileResult.error || !profileResult.profile) {
    const cleanupOk = await cleanupAuthUser(authUserId, dependencies);

    if (profileResult.error?.code === "23505" && cleanupOk) {
      return {
        status: 409,
        body: { error: "This email already has a registration request or account." },
      };
    }

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to save the registration request. Please try again."
          : "Registration setup failed and cleanup could not be completed. Contact the administrator.",
      },
    };
  }

  return {
    status: 201,
    body: {
      approvalStatus: profileResult.profile.approval_status ?? "Pending",
      authUserId,
    },
  };
}

/**
 * Creates a pending registration request for a verified anonymous Auth session.
 *
 * @param {object} user
 * @param {{ firstName: string; lastName: string; email: string }} input
 * @param {object} dependencies
 */
export async function createManualRegistration(user, input, dependencies) {
  const authUserId = typeof user.id === "string" ? user.id : "";

  if (!authUserId || user.is_anonymous !== true) {
    return {
      status: 401,
      body: { error: "Start registration using the registration form." },
    };
  }

  let ownProfileResult;

  try {
    ownProfileResult = await dependencies.findProfileByAuthUserId(authUserId);
  } catch (error) {
    return failure(dependencies, "Registration profile lookup failed", error);
  }

  if (ownProfileResult.error) {
    return failure(
      dependencies,
      "Registration profile lookup failed",
      ownProfileResult.error
    );
  }

  if (ownProfileResult.profile) {
    return {
      status: 200,
      body: {
        approvalStatus: ownProfileResult.profile.approval_status,
        existingRequest: true,
      },
    };
  }

  let emailProfileResult;

  try {
    emailProfileResult = await dependencies.findProfileByEmail(input.email);
  } catch (error) {
    const cleanupOk = await cleanupFailure(
      authUserId,
      dependencies,
      "Registration email lookup failed",
      error
    );

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to check the registration email. Please try again."
          : "Registration could not be checked and cleanup failed. Contact the administrator.",
      },
    };
  }

  if (emailProfileResult.error) {
    const cleanupOk = await cleanupFailure(
      authUserId,
      dependencies,
      "Registration email lookup failed",
      emailProfileResult.error
    );

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to check the registration email. Please try again."
          : "Registration could not be checked and cleanup failed. Contact the administrator.",
      },
    };
  }

  if (emailProfileResult.profile) {
    const cleanupOk = await cleanupAuthUser(authUserId, dependencies);

    return {
      status: cleanupOk ? 409 : 503,
      body: {
        error: cleanupOk
          ? "This email already has a registration request or account."
          : "This email already has a request, and account cleanup failed. Contact the administrator.",
      },
    };
  }

  let insertResult;

  try {
    insertResult = await dependencies.insertProfile({
      auth_user_id: authUserId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      approval_status: "Pending",
    });
  } catch (error) {
    insertResult = { error };
  }

  if (insertResult.error || !insertResult.profile) {
    const cleanupOk = await cleanupFailure(
      authUserId,
      dependencies,
      "Registration profile creation failed",
      insertResult.error ?? new Error("Profile insert did not return a row.")
    );

    if (insertResult.error?.code === "23505" && cleanupOk) {
      return {
        status: 409,
        body: { error: "This email already has a registration request or account." },
      };
    }

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to save the registration request. Please try again."
          : "Registration setup failed and cleanup could not be completed. Contact the administrator.",
      },
    };
  }

  let markerResult;

  try {
    markerResult = await dependencies.setFirstLoginMarker(authUserId);
  } catch (error) {
    markerResult = { error };
  }

  if (markerResult.error) {
    const cleanupOk = await cleanupFailure(
      authUserId,
      dependencies,
      "Registration password setup marker failed",
      markerResult.error
    );

    return {
      status: 503,
      body: {
        error: cleanupOk
          ? "Unable to finish registration. Please try again."
          : "Registration setup failed and cleanup could not be completed. Contact the administrator.",
      },
    };
  }

  return {
    status: 201,
    body: { approvalStatus: insertResult.profile.approval_status },
  };
}

/**
 * Converts an approved anonymous request into a confirmed password account.
 *
 * @param {object} input
 * @param {object} dependencies
 */
export async function activateApprovedManualRegistration(input, dependencies) {
  let createResult;

  try {
    createResult = await dependencies.createUser({
      email: input.email,
      email_confirm: true,
      password: input.password,
      app_metadata: { must_change_password: false },
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });
  } catch (error) {
    createResult = { error };
  }

  if (createResult.error || !createResult.user) {
    if (
      createResult.error?.code === "email_exists" ||
      createResult.error?.code === "user_already_exists"
    ) {
      return {
        ok: false,
        status: 409,
        error:
          "An Auth account already uses this Gmail. Contact the administrator to reconcile it before retrying.",
      };
    }

    logFailure(
      dependencies,
      "Approved manual registration Auth activation failed",
      createResult.error ?? new Error("Auth user creation returned no user.")
    );

    return {
      ok: false,
      status: 503,
      error:
        "Unable to activate this account and set its password. Please retry or contact the administrator.",
    };
  }

  const permanentAuthUserId = createResult.user.id;

  if (typeof permanentAuthUserId !== "string" || !permanentAuthUserId) {
    return {
      ok: false,
      status: 503,
      error:
        "Account activation returned an invalid result. Contact the administrator.",
    };
  }

  let moveResult;

  try {
    moveResult = await dependencies.moveProfile(
      input.authUserId,
      permanentAuthUserId
    );
  } catch (error) {
    moveResult = { error };
  }

  if (moveResult.error || !moveResult.moved) {
    let cleanupResult;

    try {
      cleanupResult = await dependencies.deleteAuthUser(permanentAuthUserId);
    } catch (error) {
      cleanupResult = { error };
    }

    if (cleanupResult.error) {
      logFailure(
        dependencies,
        "Approved registration rollback cleanup failed",
        cleanupResult.error
      );
    }

    logFailure(
      dependencies,
      "Approved registration profile activation failed",
      moveResult.error ?? new Error("Approved profile was not updated.")
    );

    return {
      ok: false,
      status: 503,
      error: cleanupResult.error
        ? "Account activation failed and cleanup needs administrator attention."
        : "Account activation failed. Please retry or contact the administrator.",
    };
  }

  let cleanupResult;

  try {
    cleanupResult = await dependencies.deleteAuthUser(input.authUserId);
  } catch (error) {
    cleanupResult = { error };
  }

  if (cleanupResult.error) {
    logFailure(
      dependencies,
      "Approved registration anonymous Auth cleanup failed",
      cleanupResult.error
    );
  }

  return { ok: true };
}

async function cleanupFailure(authUserId, dependencies, event, error) {
  logFailure(dependencies, event, error);
  return cleanupAuthUser(authUserId, dependencies);
}

async function cleanupAuthUser(authUserId, dependencies) {
  let result;

  try {
    result = await dependencies.deleteAuthUser(authUserId);
  } catch (error) {
    result = { error };
  }

  if (!result.error) return true;

  logFailure(
    dependencies,
    "Registration Auth user cleanup failed",
    result.error
  );

  return false;
}

function failure(dependencies, event, error) {
  logFailure(dependencies, event, error);

  return {
    status: 503,
    body: { error: "Unable to process registration. Please try again." },
  };
}

function logFailure(dependencies, event, error) {
  const details = {
    name: error?.name ?? undefined,
    code: error?.code ?? undefined,
    status: error?.status ?? undefined,
    message:
      typeof error === "string"
        ? error
        : error?.message ??
          error?.msg ??
          error?.error_description ??
          String(error),
  };

  dependencies.logError?.(event, details);
}