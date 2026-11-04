import { randomBytes } from "node:crypto";
import { MUST_CHANGE_PASSWORD_KEY } from "./auth-policy.mjs";

/**
 * Creates a pending Auth identity without signing the browser in.
 *
 * @param {{ firstName: string; lastName: string; email: string }} input
 * @param {{
 *   findProfileByEmail: (email: string) => Promise<{ profile?: object | null; error?: object | null }>;
 *   createAuthUser: (user: object) => Promise<{ user?: object | null; error?: object | null }>;
 *   insertProfile: (profile: object) => Promise<{ profile?: object | null; error?: object | null }>;
 *   deleteAuthUser: (id: string) => Promise<{ error?: object | null }>;
 *   logError?: (event: string, details: object) => void;
 * }} dependencies
 */
export async function createPendingManualRegistration(input, dependencies) {
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

  const temporaryPassword = randomBytes(32).toString("base64url");
  let authResult;
  try {
    authResult = await dependencies.createAuthUser({
      email: input.email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: { [MUST_CHANGE_PASSWORD_KEY]: true },
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });
  } catch (error) {
    return failure(dependencies, "Registration Auth user creation failed", error);
  }
  if (authResult.error || !authResult.user?.id) {
    if (
      authResult.error?.code === "email_exists" ||
      authResult.error?.code === "user_already_exists"
    ) {
      return {
        status: 409,
        body: { error: "This email already has a registration request or account." },
      };
    }
    return failure(
      dependencies,
      "Registration Auth user creation failed",
      authResult.error ?? new Error("Auth user creation returned no user.")
    );
  }

  const authUserId = authResult.user.id;
  let profileResult;
  try {
    profileResult = await dependencies.insertProfile({
      auth_user_id: authUserId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      role: "User",
      approval_status: "Pending",
      is_blocked: false,
    });
  } catch (error) {
    profileResult = { error };
  }

  if (profileResult.error || !profileResult.profile) {
    let cleanupResult;
    try {
      cleanupResult = await dependencies.deleteAuthUser(authUserId);
    } catch (error) {
      cleanupResult = { error };
    }
    if (cleanupResult.error) {
      logFailure(dependencies, "Registration Auth cleanup failed", {
        authUserId,
        error: cleanupResult.error,
      });
    }

    if (profileResult.error?.code === "23505" && !cleanupResult.error) {
      return {
        status: 409,
        body: { error: "This email already has a registration request or account." },
      };
    }
    return {
      status: 503,
      body: {
        error: cleanupResult.error
          ? "Registration setup failed and cleanup could not be completed. Contact the administrator."
          : "Unable to save the registration request. Please try again.",
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
 * The email is not verified until an administrator approves the request.
 *
 * @param {object} user
 * @param {{ firstName: string; lastName: string; email: string }} input
 * @param {{
 *   findProfileByAuthUserId: (id: string) => Promise<{ profile?: object | null; error?: object | null }>;
 *   findProfileByEmail: (email: string) => Promise<{ profile?: object | null; error?: object | null }>;
 *   insertProfile: (profile: object) => Promise<{ profile?: object | null; error?: object | null }>;
 *   setFirstLoginMarker: (id: string) => Promise<{ error?: object | null }>;
 *   deleteAuthUser: (id: string) => Promise<{ error?: object | null }>;
 *   logError?: (event: string, details: object) => void;
 * }} dependencies
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
 * @param {{
 *   createUser: (user: object) => Promise<{ user?: object | null; error?: object | null }>;
 *   moveProfile: (oldId: string, newId: string) => Promise<{ moved?: boolean; error?: object | null }>;
 *   deleteAuthUser: (id: string) => Promise<{ error?: object | null }>;
 *   logError?: (event: string, details: object) => void;
 * }} dependencies
 * @param {{
 *   authUserId: string;
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   password: string;
 * }} input
 */
export async function activateApprovedManualRegistration(
  input,
  dependencies
) {
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
    "Registration anonymous Auth user cleanup failed",
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
  const details =
    typeof error === "object" && error !== null
      ? {
          code: "code" in error ? error.code : undefined,
          message: "message" in error ? error.message : "Unknown error",
        }
      : { message: "Unknown error" };
  dependencies.logError?.(event, details);
}
