import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canManageRole,
  getManagedAccountStatus,
  getVisibleManagedRoles,
  listManagedUsers,
  updateManagedUser,
  validateUserChanges,
  validateUserListQuery,
} from "./user-management.mjs";

function createAdminMock(responses) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const query = {
        select(columns, options) {
          call.columns = columns;
          call.options = options;
          return query;
        },
        limit(value) {
          call.limit = value;
          return query;
        },
        eq(column, value) {
          call.filters.push(["eq", column, value]);
          return query;
        },
        in(column, values) {
          call.filters.push(["in", column, values]);
          return query;
        },
        or(value) {
          call.or = value;
          return query;
        },
        order(column, options) {
          call.order = [column, options];
          return query;
        },
        range(start, end) {
          call.range = [start, end];
          return query;
        },
        update(values) {
          call.update = values;
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

function canonicalSchemaResponses() {
  return [
    { data: null, error: null },
    { data: null, error: null },
    { data: null, error: { code: "42703" } },
    { data: null, error: null },
  ];
}

test("Admin can only see and manage regular Users", () => {
  assert.deepEqual(getVisibleManagedRoles("Admin"), ["User"]);
  assert.equal(canManageRole("Admin", "User"), true);
  assert.equal(canManageRole("Admin", "Admin"), false);
  assert.equal(canManageRole("Admin", "Superadmin"), false);
});

test("Superadmin can manage User and Admin accounts, but not Superadmins", () => {
  assert.deepEqual(getVisibleManagedRoles("Superadmin"), ["User", "Admin"]);
  assert.equal(canManageRole("Superadmin", "User"), true);
  assert.equal(canManageRole("Superadmin", "Admin"), true);
  assert.equal(canManageRole("Superadmin", "Superadmin"), false);
  assert.equal(canManageRole("User", "User"), false);
});

test("account status reflects blocked, inactive, approval, then active state", () => {
  assert.equal(
    getManagedAccountStatus({
      is_blocked: true,
      status: "Active",
      approval_status: "Approved",
    }),
    "Blocked"
  );
  assert.equal(
    getManagedAccountStatus({
      is_blocked: false,
      status: "Inactive",
      approval_status: "Approved",
    }),
    "Inactive"
  );
  assert.equal(
    getManagedAccountStatus({
      is_blocked: false,
      status: "Active",
      approval_status: "Pending",
    }),
    "Pending"
  );
});

test("user list query validates role, status, search length, and pagination", () => {
  assert.deepEqual(
    validateUserListQuery({
      search: "  Ana User ",
      role: "User",
      status: "Active",
      page: "2",
      pageSize: "50",
    }),
    {
      search: "Ana User",
      role: "User",
      status: "Active",
      page: 2,
      pageSize: 50,
    }
  );
  assert.equal(
    validateUserListQuery({ role: "Superadmin" }),
    null
  );
  assert.equal(
    validateUserListQuery({ status: "Approved" }),
    null
  );
  assert.equal(
    validateUserListQuery({ pageSize: 101 }),
    null
  );
  assert.equal(
    validateUserListQuery({ search: "x".repeat(101) }),
    null
  );
});

test("edit accepts only bounded names or an explicit block toggle", () => {
  assert.deepEqual(
    validateUserChanges({ firstName: " Ana ", lastName: " User " }),
    { type: "profile", firstName: "Ana", lastName: "User" }
  );
  assert.deepEqual(validateUserChanges({ isBlocked: true }), {
    type: "block",
    isBlocked: true,
  });
  assert.equal(
    validateUserChanges({ firstName: "Ana", lastName: "User", role: "Admin" }),
    null
  );
  assert.equal(
    validateUserChanges({ firstName: "Ana", lastName: "User", email: "x@y.z" }),
    null
  );
  assert.equal(validateUserChanges({ isBlocked: "true" }), null);
});

test("Admin list query is scoped to the User role before returning accounts", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: [
        { id: 3, name: "User" },
        { id: 2, name: "Admin" },
        { id: 1, name: "Superadmin" },
      ],
      error: null,
    },
    {
      data: [
        {
          id: 42,
          first_name: "Ana",
          last_name: "User",
          email: "ana@example.com",
          role_id: 3,
          is_blocked: false,
          approval_status: "Approved",
          status: "Active",
          stamp: "CREATED system 2026-11-05 10:30 AM",
        },
        {
          id: 1,
          first_name: "Hidden",
          last_name: "Superadmin",
          email: "hidden@example.com",
          role_id: 1,
          is_blocked: false,
          approval_status: "Approved",
          status: "Active",
          stamp: "CREATED system 2026-11-04 10:30 AM",
        },
      ],
      count: 1,
      error: null,
    },
  ]);

  const result = await listManagedUsers(admin, "Admin", {
    search: "",
    role: "",
    status: "",
    page: 1,
    pageSize: 25,
  });

  assert.equal(result.status, "ok");
  assert.deepEqual(result.users, [
    {
      id: "42",
      firstName: "Ana",
      lastName: "User",
      email: "ana@example.com",
      role: "User",
      status: "Active",
      createdAt: "2026-11-05",
    },
  ]);
  assert.deepEqual(admin.calls[4].filters.at(-1), ["in", "name", ["User"]]);
  assert.deepEqual(admin.calls[5].filters[0], ["in", "role_id", [3]]);
});

test("Superadmin list query includes Admin and User, but filters out Superadmin", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: [
        { id: 3, name: "User" },
        { id: 2, name: "Admin" },
        { id: 1, name: "Superadmin" },
      ],
      error: null,
    },
    { data: [], count: 0, error: null },
  ]);

  const result = await listManagedUsers(admin, "Superadmin", {
    search: "",
    role: "",
    status: "",
    page: 1,
    pageSize: 25,
  });

  assert.equal(result.status, "ok");
  assert.deepEqual(admin.calls[4].filters.at(-1), [
    "in",
    "name",
    ["User", "Admin"],
  ]);
  assert.deepEqual(admin.calls[5].filters[0], [
    "in",
    "role_id",
    [3, 2],
  ]);
});

test("text-role schema lists accounts using created_at without a role table", async () => {
  const admin = createAdminMock([
    { data: null, error: { code: "42703" } },
    { data: null, error: null },
    { data: null, error: { code: "42703" } },
    { data: null, error: null },
    {
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          first_name: "Ana",
          last_name: "User",
          email: "ana@example.com",
          role: "User",
          is_blocked: false,
          approval_status: "Approved",
          created_at: "2026-11-05T02:00:00.000Z",
        },
      ],
      count: 1,
      error: null,
    },
  ]);

  const result = await listManagedUsers(admin, "Admin", {
    search: "",
    role: "",
    status: "",
    page: 1,
    pageSize: 25,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.users[0].role, "User");
  assert.equal(result.users[0].createdAt, "2026-11-05T02:00:00.000Z");
  assert.equal(admin.calls.some((call) => call.table === "role"), false);
  assert.deepEqual(admin.calls[4].filters[0], ["in", "role", ["User"]]);
});

test("Admin cannot update an Admin or Superadmin account", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 2, role_id: 2, auth_user_id: "auth-admin" }, error: null },
    { data: { name: "Admin" }, error: null },
  ]);

  const result = await updateManagedUser(
    admin,
    "Admin",
    "2",
    { firstName: "Changed", lastName: "Name" }
  );

  assert.equal(result.status, "forbidden");
  assert.equal(admin.calls.some((call) => call.update), false);
});

test("Admin cannot update a Superadmin account", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 1, role_id: 1, auth_user_id: "auth-superadmin" }, error: null },
    { data: { name: "Superadmin" }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Admin", "1", {
    isBlocked: true,
  });

  assert.equal(result.status, "forbidden");
  assert.equal(admin.calls.some((call) => call.update), false);
});

test("blocking a User with a BIGINT ID updates is_blocked after authorization", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 789, role_id: 3, auth_user_id: "auth-user" }, error: null },
    { data: { name: "User" }, error: null },
    { data: { id: 789 }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Admin", "789", {
    isBlocked: true,
  });

  assert.equal(result.status, "ok");
  const updateCall = admin.calls.find((call) => call.update);
  assert.deepEqual(updateCall.update, { is_blocked: true });
  assert.deepEqual(updateCall.filters, [
    ["eq", "id", "789"],
    ["eq", "role_id", 3],
  ]);
});
