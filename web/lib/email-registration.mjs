import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const REGISTRATION_RECOVERY_TTL_SECONDS = 30 * 60;

export const RECOVERY_MARKER_KEY = "hope_email_registration_recovery";

const NEUTRAL_REGISTRATION_MESSAGE =
  "Registration request received. Check your email for an invitation, or contact the administrator if you don't receive one.";

function neutralRegistrationResponse() {
  return {
    status: 202,
    body: { message: NEUTRAL_REGISTRATION_MESSAGE },
  };
}

function administratorRecoveryResponse() {
  return {
    status: 500,
    body: {
      error:
        "Registration could not be completed automatically. Please contact the administrator for assistance.",
    },
  };
}

/**
 * @param {string} email
 */
export function getRecoveryCookieName(email) {
  const emailHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 20);

  return `hope_registration_recovery_${emailHash}`;
}

/**
 * @param {string} token
 */
export function hashRecoveryToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * @returns {string}
 */
export function createRecoveryToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * @param {unknown} error
 */
function errorDetails(error) {
  if (typeof error === "object" && error !== null) {
    const value = /** @type {{ code?: unknown; message?: unknown; hint?: unknown }} */ (
      error
    );

    return {
      code:
        typeof value.code === "string"
          ? sanitizeLogText(value.code)
          : undefined,
      message:
        typeof value.message === "string"
          ? sanitizeLogText(value.message)
          : "Unknown Supabase error",
      hint:
        typeof value.hint === "string"
          ? sanitizeLogText(value.hint)
          : undefined,
    };
  }

  return {
    message:
      error instanceof Error
        ? sanitizeLogText(error.message)
        : "Unknown error",
  };
}

/**
 * @param {string} value
 */
function sanitizeLogText(value) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(
      /\b(?:eyJ[A-Za-z0-9_-]{10,}\.)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED-TOKEN]"
    )
    .replace(
      /\b(service[_ -]?role[_ -]?key|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|token|password|secret|authorization)\b\s*[:=]\s*(['"]?)[^\s,;]+/gi,
      (_match, key) => `${key}=[REDACTED]`
    )
    .slice(0, 500);
}

/**
 * @param {{ logError?: (event: string, details: object) => void }} dependencies
 * @param {string} event
 * @param {object} details
 */
function logError(dependencies, event, details) {
  dependencies.logError?.(event, details);
}

/**
 * @param {unknown} error
 */
function isDuplicateError(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

/**
 * Creates a Pending application profile after a new invitation, or reconciles
 * one only when a verified recovery capability matches the Auth-side marker.
 *
 * @param {{
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   recovery?: { authUserId: string; token: string } | null;
 * }} input
 * @param {{
 *   invite: (email: string, metadata: object) => Promise<{ user?: object | null; error?: object | null }>;
 *   getAuthUserById: (id: string) => Promise<{ user?: object | null; error?: object | null }>;
 *   setRecoveryMarker: (id: string, marker: object) => Promise<{ error?: object | null }>;
 *   findProfileByAuthUserId: (id: string) => Promise<{ profile?: object | null; error?: object | null }>;
 *   insertProfile: (profile: object) => Promise<{ profile?: object | null; error?: object | null }>;
 *   deleteAuthUser: (id: string) => Promise<{ error?: object | null }>;
 *   logError?: (event: string, details: object) => void;
 *   now?: () => number;
 *   createToken?: () => string;
 * }} dependencies
 */
export async function registerEmail(input, dependencies) {
  const email = input.email.trim().toLowerCase();
  const now = dependencies.now ?? Date.now;
  const createToken = dependencies.createToken ?? createRecoveryToken;

  if (input.recovery) {
    return reconcileRegistration(
      { ...input, email },
      dependencies,
      now
    );
  }

  let inviteResult;
  try {
    inviteResult = await dependencies.invite(email, {
      first_name: input.firstName,
      last_name: input.lastName,
    });
  } catch (error) {
    logError(dependencies, "Registration invitation failed", errorDetails(error));
    return neutralRegistrationResponse();
  }

  if (inviteResult.error || !inviteResult.user) {
    const details = errorDetails(inviteResult.error);
    logError(dependencies, "Registration invitation failed", details);
    return neutralRegistrationResponse();
  }

  const invitedUser = inviteResult.user;
  const authUserId =
    typeof invitedUser.id === "string" ? invitedUser.id : "";
  const invitedEmail =
    typeof invitedUser.email === "string"
      ? invitedUser.email.trim().toLowerCase()
      : "";

  if (!authUserId || invitedEmail !== email) {
    logError(dependencies, "Registration invitation returned an unexpected user", {
      hasUserId: Boolean(authUserId),
      emailMatched: invitedEmail === email,
    });
    return neutralRegistrationResponse();
  }

  const profileResult = await insertProfile(
    authUserId,
    email,
    input.firstName,
    input.lastName,
    dependencies
  );

  if (profileResult.profile) {
    return neutralRegistrationResponse();
  }

  logError(
    dependencies,
    "Registration app_user profile creation failed",
    errorDetails(profileResult.error)
  );

  if (profileResult.conflict) {
    const cleanupResult = await cleanupCreatedAuthUser(
      authUserId,
      dependencies
    );
    return cleanupResult
      ? neutralRegistrationResponse()
      : administratorRecoveryResponse();
  }

  const recoveryToken = createToken();
  const recoveryMarker = {
    version: 1,
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    tokenHash: hashRecoveryToken(recoveryToken),
    expiresAt: new Date(
      now() + REGISTRATION_RECOVERY_TTL_SECONDS * 1000
    ).toISOString(),
  };

  let markerResult;
  try {
    markerResult = await dependencies.setRecoveryMarker(
      authUserId,
      recoveryMarker
    );
  } catch (error) {
    markerResult = { error };
  }

  if (markerResult.error) {
    logError(
      dependencies,
      "Registration recovery marker creation failed",
      { authUserId, ...errorDetails(markerResult.error) }
    );
    const cleanupSucceeded = await cleanupCreatedAuthUser(
      authUserId,
      dependencies
    );

    return cleanupSucceeded
      ? neutralRegistrationResponse()
      : administratorRecoveryResponse();
  }

  const cleanupSucceeded = await cleanupCreatedAuthUser(
    authUserId,
    dependencies
  );

  if (cleanupSucceeded) {
    return neutralRegistrationResponse();
  }

  return {
    status: 500,
    body: {
      error:
        "Registration could not be completed automatically. If you received an invitation, verify it and retry from the same browser. If recovery still fails, contact the administrator.",
    },
    recovery: { authUserId, token: recoveryToken },
  };
}

/**
 * @param {string} authUserId
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {object} dependencies
 */
async function insertProfile(
  authUserId,
  email,
  firstName,
  lastName,
  dependencies
) {
  let insertResult;
  try {
    insertResult = await dependencies.insertProfile({
      auth_user_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      approval_status: "Pending",
    });
  } catch (error) {
    return { error };
  }

  if (!insertResult.error && insertResult.profile) {
    return { profile: insertResult.profile };
  }

  if (isDuplicateError(insertResult.error)) {
    let profileResult;
    try {
      profileResult = await dependencies.findProfileByAuthUserId(authUserId);
    } catch (error) {
      return { error };
    }

    if (profileResult.error) {
      return { error: profileResult.error };
    }

    if (profileResult.profile) {
      return { profile: profileResult.profile, duplicate: true };
    }

    return { error: insertResult.error, conflict: true };
  }

  return {
    error:
      insertResult.error ??
      new Error("Profile insert did not return a saved profile."),
  };
}

/**
 * @param {string} authUserId
 * @param {object} dependencies
 * @returns {Promise<boolean>}
 */
async function cleanupCreatedAuthUser(authUserId, dependencies) {
  let cleanupResult;
  try {
    cleanupResult = await dependencies.deleteAuthUser(authUserId);
  } catch (error) {
    cleanupResult = { error };
  }

  if (!cleanupResult.error) {
    return true;
  }

  logError(
    dependencies,
    "Registration Auth user cleanup failed",
    { authUserId, ...errorDetails(cleanupResult.error) }
  );
  return false;
}

/**
 * @param {{
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   recovery?: { authUserId: string; token: string } | null;
 * }} input
 * @param {object} dependencies
 * @param {() => number} now
 */
async function reconcileRegistration(input, dependencies, now) {
  const recovery = input.recovery;

  if (
    !recovery ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      recovery.authUserId
    ) ||
    typeof recovery.token !== "string" ||
    recovery.token.length < 40 ||
    recovery.token.length > 100
  ) {
    return {
      status: 403,
      body: { error: "Registration recovery could not be verified." },
      clearRecovery: true,
    };
  }

  let authResult;
  try {
    authResult = await dependencies.getAuthUserById(recovery.authUserId);
  } catch (error) {
    logError(
      dependencies,
      "Registration recovery Auth lookup failed",
      errorDetails(error)
    );
    return {
      status: 500,
      body: { error: "Unable to verify registration recovery. Please retry." },
    };
  }

  if (authResult.error) {
    logError(
      dependencies,
      "Registration recovery Auth lookup failed",
      errorDetails(authResult.error)
    );
    return {
      status: 500,
      body: { error: "Unable to verify registration recovery. Please retry." },
    };
  }

  const user = authResult.user;
  const marker =
    user?.app_metadata &&
    typeof user.app_metadata === "object" &&
    user.app_metadata[RECOVERY_MARKER_KEY];

  if (
    !user ||
    user.id !== recovery.authUserId ||
    user.email?.trim().toLowerCase() !== input.email ||
    !marker ||
    marker.version !== 1 ||
    marker.email !== input.email ||
    marker.firstName !== input.firstName ||
    marker.lastName !== input.lastName ||
    typeof marker.tokenHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(marker.tokenHash) ||
    typeof marker.expiresAt !== "string"
  ) {
    return {
      status: 403,
      body: { error: "Registration recovery could not be verified." },
      clearRecovery: true,
    };
  }

  if (!user.email_confirmed_at && !user.confirmed_at) {
    return {
      status: 403,
      body: {
        error:
          "Verify the invitation from your email before retrying profile recovery.",
      },
    };
  }

  const expiresAt = Date.parse(marker.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now()) {
    return {
      status: 410,
      body: {
        error:
          "The registration recovery window expired. Contact the administrator for help.",
      },
      clearRecovery: true,
    };
  }

  const expectedHash = Buffer.from(marker.tokenHash, "hex");
  const suppliedHash = Buffer.from(hashRecoveryToken(recovery.token), "hex");
  if (
    expectedHash.length !== suppliedHash.length ||
    !timingSafeEqual(expectedHash, suppliedHash)
  ) {
    return {
      status: 403,
      body: { error: "Registration recovery could not be verified." },
      clearRecovery: true,
    };
  }

  let existingResult;
  try {
    existingResult = await dependencies.findProfileByAuthUserId(user.id);
  } catch (error) {
    logError(
      dependencies,
      "Registration recovery profile lookup failed",
      errorDetails(error)
    );
    return {
      status: 500,
      body: { error: "Unable to check the registration profile. Please retry." },
    };
  }

  if (existingResult.error) {
    logError(
      dependencies,
      "Registration recovery profile lookup failed",
      errorDetails(existingResult.error)
    );
    return {
      status: 500,
      body: { error: "Unable to check the registration profile. Please retry." },
    };
  }

  if (existingResult.profile) {
    return {
      status: 200,
      body: {
        message: "Registration profile already exists.",
        approvalStatus: existingResult.profile.approval_status ?? "Pending",
      },
    };
  }

  const profileResult = await insertProfile(
    user.id,
    input.email,
    input.firstName,
    input.lastName,
    dependencies
  );

  if (profileResult.profile) {
    return {
      status: 201,
      body: {
        message: "Registration profile recovered. Your account is pending approval.",
        approvalStatus: profileResult.profile.approval_status ?? "Pending",
      },
    };
  }

  if (profileResult.conflict) {
    return {
      status: 409,
      body: {
        error:
          "This email is already linked to another application profile. Contact the administrator for help.",
      },
    };
  }

  logError(
    dependencies,
    "Registration recovery profile creation failed",
    errorDetails(profileResult.error)
  );
  return {
    status: 500,
    body: {
      error: "Unable to save the registration profile. Please retry.",
    },
  };
}
