import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateTemporaryPassword,
  getAdminProvisioningAccess,
  provisionRegularUser,
  validateProvisioningInput,
} from "./admin-provisioning.mjs";

function createQueryMock(responses) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const query = {
        select(columns) {
          call.columns = columns;
          return query;
        },
        insert(values) {
          call.insert = values;
          return query;
        },
        eq(column, value) {
          call.filters.push([column, value]);
          return query;
        },
        maybeSingle() {
          return Promise.resolve(responses.shift());
        },
        then(resolve, reject) {
          return Promise.resolve(responses.shift()).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test("temporary passwords are random URL-safe strings", () => {
  const first = generateTemporaryPassword();
  const second = generateTemporaryPassword();

  assert.match(first, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(first, second);
});

test("provisioning input is normalized and bounded", () => {
  assert.deepEqual(
    validateProvisioningInput({
      firstName: "  Ana ",
      lastName: " Dela Cruz ",
      email: " ANA@example.com ",
    }),
    {
      firstName: "Ana",
      lastName: "Dela Cruz",
      email: "ana@example.com",
    }
  );
  assert.equal(
    validateProvisioningInput({
      firstName: "A".repeat(101),
      lastName: "User",
      email: "ana@example.com",
    }),
    null
  );
});

test("only approved, unblocked Admins and Superadmins may provision", async () => {
  const admin = createQueryMock([
    {
      data: {
        role_id: 2,
        is_blocked: false,
        approval_status: "Approved",
      },
      error: null,
    },
    { data: { name: "Admin" }, error: null },
  ]);
  assert.deepEqual(await getAdminProvisioningAccess(admin, "auth-1"), {
    status: "allowed",
  });
  assert.equal(admin.calls[0].columns, "role_id, is_blocked, approval_status");
  assert.equal(admin.calls[1].table, "role");
  assert.deepEqual(admin.calls[1].filters, [
    ["id", 2],
    ["status", "Active"],
  ]);

  const pending = createQueryMock([
    {
      data: {
        role_id: 2,
        is_blocked: false,
        approval_status: "Pending",
      },
      error: null,
    },
  ]);
  assert.deepEqual(await getAdminProvisioningAccess(pending, "auth-1"), {
    status: "forbidden",
  });
  assert.equal(pending.calls.length, 1);
});

test("creates a Pending regular user with a first-login password marker", async () => {
  const admin = createQueryMock([
    { data: { id: 3 }, error: null },
    { data: null, error: null },
  ]);
  admin.auth = {
    admin: {
      async createUser(user) {
        admin.createdUser = user;
        return { data: { user: { id: "new-auth-user" } }, error: null };
      },
      async deleteUser() {
        assert.fail("successful profile creation must not delete the Auth user");
      },
    },
  };

  const result = await provisionRegularUser(admin, {
    firstName: "Ana",
    lastName: "User",
    email: "ana@example.com",
  });

  assert.equal(result.ok, true);
  assert.match(result.temporaryPassword, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(
    admin.createdUser.app_metadata.must_change_password,
    true
  );
  assert.equal(admin.createdUser.password, result.temporaryPassword);
  assert.equal(admin.calls[0].table, "role");
  assert.equal(admin.calls[0].columns, "id");
  assert.deepEqual(admin.calls[0].filters, [
    ["name", "User"],
    ["status", "Active"],
  ]);
  assert.equal(admin.calls[1].table, "app_user");
  assert.equal(admin.calls[1].insert.role_id, 3);
  assert.equal("role" in admin.calls[1].insert, false);
  assert.equal(admin.calls[1].insert.approval_status, "Pending");
  assert.equal("status" in admin.calls[1].insert, false);
  assert.equal(admin.calls[1].insert.auth_user_id, "new-auth-user");
});

test("does not delete an existing Auth account when creation is rejected", async () => {
  const admin = createQueryMock([{ data: { id: 3 }, error: null }]);
  admin.auth = {
    admin: {
      async createUser() {
        return { data: { user: null }, error: { code: "already_exists" } };
      },
      async deleteUser() {
        assert.fail("must not delete an account that predates this attempt");
      },
    },
  };
  const originalError = console.error;
  console.error = () => {};

  try {
    const result = await provisionRegularUser(admin, {
      firstName: "Ana",
      lastName: "User",
      email: "ana@example.com",
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(admin.calls.length, 1);
  } finally {
    console.error = originalError;
  }
});

test("removes the newly created Auth user if profile insertion fails", async () => {
  const admin = createQueryMock([
    { data: { id: 3 }, error: null },
    { data: null, error: { code: "insert_failed" } },
  ]);
  const deletedIds = [];
  admin.auth = {
    admin: {
      async createUser() {
        return { data: { user: { id: "new-auth-user" } }, error: null };
      },
      async deleteUser(id) {
        deletedIds.push(id);
        return { error: null };
      },
    },
  };

  const originalError = console.error;
  console.error = () => {};
  let result;
  try {
    result = await provisionRegularUser(admin, {
      firstName: "Ana",
      lastName: "User",
      email: "ana@example.com",
    });
  } finally {
    console.error = originalError;
  }

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.deepEqual(deletedIds, ["new-auth-user"]);
});

test("reports administrator intervention if profile save and Auth cleanup both fail", async () => {
  const admin = createQueryMock([
    { data: { id: 3 }, error: null },
    { data: null, error: { code: "insert_failed" } },
  ]);
  admin.auth = {
    admin: {
      async createUser() {
        return { data: { user: { id: "new-auth-user" } }, error: null };
      },
      async deleteUser() {
        return { error: { code: "delete_failed" } };
      },
    },
  };
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);

  try {
    const result = await provisionRegularUser(admin, {
      firstName: "Ana",
      lastName: "User",
      email: "ana@example.com",
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
    assert.match(result.error, /administrator must investigate/i);
    assert.equal(logged.length, 2);
    assert.equal(JSON.stringify(logged).includes("ana@example.com"), false);
    assert.equal(JSON.stringify(logged).includes("password"), false);
  } finally {
    console.error = originalError;
  }
});

test("does not create an account when the active User role cannot be resolved", async () => {
  const admin = createQueryMock([{ data: null, error: null }]);
  admin.auth = {
    admin: {
      async createUser() {
        assert.fail("must not create an Auth user without the User role");
      },
    },
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await provisionRegularUser(admin, {
      firstName: "Ana",
      lastName: "User",
      email: "ana@example.com",
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
    assert.equal(admin.calls.length, 1);
  } finally {
    console.error = originalError;
  }
});
