import assert from "node:assert/strict";
import test from "node:test";
import {
  hashRecoveryToken,
  RECOVERY_MARKER_KEY,
  registerEmail,
} from "./email-registration.mjs";

const authUserId = "e9c60f4d-6a93-4f20-a3f1-e063ad2cae21";
const fixedNow = 2_000_000_000_000;

function createHarness(options = {}) {
  const state = {
    authUser: null,
    profile: null,
    deleteCalls: [],
    insertCalls: [],
    logs: [],
  };
  const profileError = {
    code: "XX000",
    message: "simulated profile write failure",
    hint: "simulated database detail",
  };

  const dependencies = {
    invite: async (email) => {
      if (options.invitationError) {
        return { error: options.invitationError };
      }

      state.authUser = {
        id: authUserId,
        email,
        invited_at: new Date(fixedNow).toISOString(),
        email_confirmed_at: null,
        app_metadata: { provider: "email", providers: ["email"] },
      };
      return { user: state.authUser };
    },
    getAuthUserById: async (id) => ({
      user: state.authUser?.id === id ? state.authUser : null,
    }),
    setRecoveryMarker: async (id, marker) => {
      if (state.authUser?.id !== id) {
        return { error: new Error("Auth user not found") };
      }
      state.authUser.app_metadata[RECOVERY_MARKER_KEY] = marker;
      return {};
    },
    findProfileByAuthUserId: async (id) => ({
      profile: state.profile?.auth_user_id === id ? state.profile : null,
    }),
    insertProfile: async (profile) => {
      state.insertCalls.push(profile);
      if (options.profileWriteFails) {
        return { error: profileError };
      }
      if (state.profile) {
        return {
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
          },
        };
      }
      state.profile = { ...profile };
      return { profile: state.profile };
    },
    deleteAuthUser: async (id) => {
      state.deleteCalls.push(id);
      if (options.cleanupFails) {
        return { error: { code: "XX001", message: "simulated delete failure" } };
      }
      if (state.authUser?.id === id) {
        state.authUser = null;
        return {};
      }
      return { error: new Error("Auth user not found") };
    },
    logError: (event, details) => state.logs.push({ event, details }),
    now: () => fixedNow,
    createToken: () => "a".repeat(43),
  };

  return { dependencies, state, profileError };
}

const registration = {
  email: "applicant@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
};

test("cleans up the Auth user created by the failed invitation request", async () => {
  const { dependencies, state, profileError } = createHarness({
    profileWriteFails: true,
  });

  const result = await registerEmail(registration, dependencies);

  assert.equal(result.status, 500);
  assert.deepEqual(state.deleteCalls, [authUserId]);
  assert.equal(state.authUser, null);
  assert.equal(result.recovery, undefined);
  assert.ok(
    state.logs.some(
      ({ event, details }) =>
        event === "Registration app_user profile creation failed" &&
        details.message === profileError.message &&
        details.code === profileError.code &&
        details.hint === profileError.hint
    )
  );
});

test("issues a recovery capability only when cleanup fails", async () => {
  const { dependencies, state } = createHarness({
    profileWriteFails: true,
    cleanupFails: true,
  });

  const result = await registerEmail(registration, dependencies);

  assert.equal(result.status, 500);
  assert.equal(state.authUser.id, authUserId);
  assert.equal(state.authUser.app_metadata[RECOVERY_MARKER_KEY].email, registration.email);
  assert.equal(
    state.authUser.app_metadata[RECOVERY_MARKER_KEY].tokenHash,
    hashRecoveryToken("a".repeat(43))
  );
  assert.deepEqual(result.recovery, {
    authUserId,
    token: "a".repeat(43),
  });
  assert.ok(
    state.logs.some(
      ({ event }) => event === "Registration Auth user cleanup failed"
    )
  );
  assert.equal(JSON.stringify(state.logs).includes("a".repeat(43)), false);
});

test("reconciles an incomplete registration only after verified email and matching marker", async () => {
  const { dependencies, state } = createHarness({
    profileWriteFails: true,
    cleanupFails: true,
  });
  const failedRegistration = await registerEmail(registration, dependencies);
  state.authUser.email_confirmed_at = new Date(fixedNow).toISOString();
  dependencies.insertProfile = async (profile) => {
    state.insertCalls.push(profile);
    state.profile = { ...profile };
    return { profile: state.profile };
  };

  const result = await registerEmail(
    { ...registration, recovery: failedRegistration.recovery },
    dependencies
  );

  assert.equal(result.status, 201);
  assert.equal(state.profile.auth_user_id, authUserId);
  assert.equal(state.profile.approval_status, "Pending");
  assert.equal("role_id" in state.profile, false);
});

test("rejects recovery for an unverified existing Auth account", async () => {
  const { dependencies, state } = createHarness({
    profileWriteFails: true,
    cleanupFails: true,
  });
  const failedRegistration = await registerEmail(registration, dependencies);

  const result = await registerEmail(
    { ...registration, recovery: failedRegistration.recovery },
    dependencies
  );

  assert.equal(result.status, 403);
  assert.match(result.body.error, /Verify the invitation/);
  assert.equal(state.insertCalls.length, 1);
  assert.equal(state.profile, null);
});

test("duplicate recovery retries return the existing profile without reinserting", async () => {
  const { dependencies, state } = createHarness({
    profileWriteFails: true,
    cleanupFails: true,
  });
  const failedRegistration = await registerEmail(registration, dependencies);
  state.authUser.email_confirmed_at = new Date(fixedNow).toISOString();
  dependencies.insertProfile = async (profile) => {
    state.insertCalls.push(profile);
    state.profile = { ...profile };
    return { profile: state.profile };
  };

  const firstRetry = await registerEmail(
    { ...registration, recovery: failedRegistration.recovery },
    dependencies
  );
  const secondRetry = await registerEmail(
    { ...registration, recovery: failedRegistration.recovery },
    dependencies
  );

  assert.equal(firstRetry.status, 201);
  assert.equal(secondRetry.status, 200);
  assert.equal(state.insertCalls.length, 2);
  assert.equal(state.profile.auth_user_id, authUserId);
});

test("invitation failure does not insert a profile or delete an Auth user", async () => {
  const { dependencies, state } = createHarness({
    invitationError: { message: "User already registered" },
  });

  const result = await registerEmail(registration, dependencies);

  assert.equal(result.status, 409);
  assert.equal(state.insertCalls.length, 0);
  assert.equal(state.deleteCalls.length, 0);
  assert.equal(state.authUser, null);
});
