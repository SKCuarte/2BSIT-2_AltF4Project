import assert from "node:assert/strict";
import test from "node:test";
import {
  activateApprovedManualRegistration,
  createPendingManualRegistration,
  createManualRegistration,
} from "./manual-registration.mjs";

const user = { id: "anonymous-user-id", is_anonymous: true };
const input = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
};

function createHarness(options = {}) {
  const state = {
    profile: null,
    markerCalls: [],
    deleteCalls: [],
    logs: [],
  };
  const dependencies = {
    findProfileByAuthUserId: async () => ({
      profile: options.ownProfile ?? state.profile,
      error: options.ownLookupError,
    }),
    findProfileByEmail: async () => ({
      profile: options.emailProfile ?? null,
      error: options.emailLookupError,
    }),
    insertProfile: async (profile) => {
      if (options.insertError) return { error: options.insertError };
      state.profile = profile;
      return { profile };
    },
    setFirstLoginMarker: async (id) => {
      state.markerCalls.push(id);
      return { error: options.markerError };
    },
    deleteAuthUser: async (id) => {
      state.deleteCalls.push(id);
      return { error: options.cleanupError };
    },
    logError: (event, details) => state.logs.push({ event, details }),
  };
  return { dependencies, state };
}

test("creates a pending account without an anonymous session", async () => {
  const calls = [];
  const result = await createPendingManualRegistration(input, {
    findUserRoleId: async () => ({ roleId: 7 }),
    findProfileByEmail: async () => ({ profile: null }),
    createAuthUser: async (createdUser) => {
      calls.push(["create", createdUser]);
      return { user: { id: "created-auth-user" } };
    },
    insertProfile: async (profile) => {
      calls.push(["profile", profile]);
      return { profile };
    },
    deleteAuthUser: async () => assert.fail("successful registration is retained"),
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.approvalStatus, "Pending");
  assert.equal(result.body.authUserId, "created-auth-user");
  assert.deepEqual(calls[0][1], {
    email: input.email,
    password: calls[0][1].password,
    email_confirm: true,
    app_metadata: { must_change_password: true },
    user_metadata: { first_name: "Ada", last_name: "Lovelace" },
  });
  assert.equal(typeof calls[0][1].password, "string");
  assert.ok(calls[0][1].password.length >= 40);
  assert.deepEqual(calls[1][1], {
    auth_user_id: "created-auth-user",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    role_id: 7,
    approval_status: "Pending",
    is_blocked: false,
  });
});

test("cleans up the Auth account if the pending profile cannot be saved", async () => {
  const deleted = [];
  const result = await createPendingManualRegistration(input, {
    findUserRoleId: async () => ({ roleId: 7 }),
    findProfileByEmail: async () => ({ profile: null }),
    createAuthUser: async () => ({ user: { id: "created-auth-user" } }),
    insertProfile: async () => ({
      error: { code: "XX001", message: "insert failed" },
    }),
    deleteAuthUser: async (id) => {
      deleted.push(id);
      return {};
    },
  });

  assert.equal(result.status, 503);
  assert.deepEqual(deleted, ["created-auth-user"]);
});

test("does not create a pending account when the active User role is missing", async () => {
  let authUserCreated = false;
  const result = await createPendingManualRegistration(input, {
    findUserRoleId: async () => ({ roleId: null }),
    findProfileByEmail: async () => assert.fail("role must be resolved first"),
    createAuthUser: async () => {
      authUserCreated = true;
      return { user: { id: "created-auth-user" } };
    },
    insertProfile: async () => assert.fail("must not insert without a role"),
    deleteAuthUser: async () => assert.fail("no Auth user was created"),
  });

  assert.equal(result.status, 503);
  assert.equal(authUserCreated, false);
});

test("creates a Pending profile and marks password setup for a manual request", async () => {
  const { dependencies, state } = createHarness();
  const result = await createManualRegistration(user, input, dependencies);

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { approvalStatus: "Pending" });
  assert.deepEqual(state.profile, {
    auth_user_id: user.id,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    approval_status: "Pending",
  });
  assert.deepEqual(state.markerCalls, [user.id]);
  assert.deepEqual(state.deleteCalls, []);
});

test("rejects sessions that are not anonymous", async () => {
  const { dependencies, state } = createHarness();
  const result = await createManualRegistration(
    { ...user, is_anonymous: false },
    input,
    dependencies
  );

  assert.equal(result.status, 401);
  assert.equal(state.profile, null);
});

test("returns an existing request without overwriting profile data", async () => {
  const existing = {
    auth_user_id: user.id,
    approval_status: "Pending",
    first_name: "Existing",
  };
  const { dependencies, state } = createHarness({ ownProfile: existing });
  const result = await createManualRegistration(user, input, dependencies);

  assert.equal(result.status, 200);
  assert.equal(result.body.existingRequest, true);
  assert.deepEqual(state.markerCalls, []);
  assert.deepEqual(state.deleteCalls, []);
});

test("cleans up a new anonymous identity when the email is already in use", async () => {
  const { dependencies, state } = createHarness({
    emailProfile: { auth_user_id: "another-user" },
  });
  const result = await createManualRegistration(user, input, dependencies);

  assert.equal(result.status, 409);
  assert.deepEqual(state.deleteCalls, [user.id]);
});

test("does not claim success if profile or marker setup fails", async () => {
  const profile = createHarness({
    insertError: { code: "XX001", message: "insert failed" },
  });
  const marker = createHarness({
    markerError: { code: "XX002", message: "marker failed" },
  });

  assert.equal(
    (
      await createManualRegistration(user, input, profile.dependencies)
    ).status,
    503
  );
  assert.equal(
    (
      await createManualRegistration(user, input, marker.dependencies)
    ).status,
    503
  );
  assert.deepEqual(profile.state.deleteCalls, [user.id]);
  assert.deepEqual(marker.state.deleteCalls, [user.id]);
});

test("reports cleanup failure for administrator follow-up", async () => {
  const { dependencies, state } = createHarness({
    insertError: { code: "XX001", message: "insert failed" },
    cleanupError: { code: "XX002", message: "cleanup failed" },
  });
  const result = await createManualRegistration(user, input, dependencies);

  assert.equal(result.status, 503);
  assert.match(result.body.error, /Contact the administrator/);
  assert.equal(
    state.logs.some(
      ({ event }) => event === "Registration anonymous Auth user cleanup failed"
    ),
    true
  );
});

test("activates an approved request with confirmed Gmail and new password", async () => {
  const calls = [];
  const result = await activateApprovedManualRegistration(
    {
      authUserId: user.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: "a-secure-password",
    },
    {
      createUser: async (createdUser) => {
        calls.push(["create", createdUser]);
        return { user: { id: "permanent-user-id" } };
      },
      moveProfile: async (oldId, newId) => {
        calls.push(["move", oldId, newId]);
        return { moved: true };
      },
      deleteAuthUser: async (id) => {
        calls.push(["delete", id]);
        return {};
      },
    }
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [
    [
      "create",
      {
        email: input.email,
        email_confirm: true,
        password: "a-secure-password",
        app_metadata: { must_change_password: false },
        user_metadata: { first_name: "Ada", last_name: "Lovelace" },
      },
    ],
    ["move", user.id, "permanent-user-id"],
    ["delete", user.id],
  ]);
});

test("does not promote duplicate Auth emails or leave a new user on profile update failure", async () => {
  const duplicate = await activateApprovedManualRegistration(
    {
      authUserId: user.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: "a-secure-password",
    },
    {
      createUser: async () => ({
        error: { code: "email_exists", message: "duplicate" },
      }),
      moveProfile: async () => assert.fail("must not move profile"),
      deleteAuthUser: async () => assert.fail("no user was created"),
    }
  );
  assert.equal(duplicate.status, 409);

  const deletions = [];
  const failedMove = await activateApprovedManualRegistration(
    {
      authUserId: user.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: "a-secure-password",
    },
    {
      createUser: async () => ({ user: { id: "new-user" } }),
      moveProfile: async () => ({
        error: { code: "not_approved", message: "no longer approved" },
      }),
      deleteAuthUser: async (id) => {
        deletions.push(id);
        return {};
      },
    }
  );

  assert.equal(failedMove.ok, false);
  assert.deepEqual(deletions, ["new-user"]);
});
