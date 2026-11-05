import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canManageRole,
  decideUserApproval,
  getManagedAccountStatus,
  getVisibleManagedRoles,
  listPendingUserApprovals,
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
  assert.deepEqual(validateUserChanges({ role: "Admin" }), {
    type: "role",
    role: "Admin",
  });
  assert.equal(validateUserChanges({ role: "Superadmin" }), null);
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

test("pending approvals list includes only pending User accounts", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 3 }, error: null },
    {
      data: [
        {
          id: 789,
          first_name: "Ana",
          last_name: "User",
          email: "ana@example.com",
          role_id: 3,
          approval_status: "Pending",
          is_blocked: false,
          status: "Active",
        },
      ],
      error: null,
    },
  ]);

  const result = await listPendingUserApprovals(admin);

  assert.deepEqual(result, {
    status: "ok",
    approvals: [
      {
        id: "789",
        firstName: "Ana",
        lastName: "User",
        email: "ana@example.com",
        isBlocked: false,
        role: "User",
      },
    ],
  });
  assert.deepEqual(admin.calls[5].filters, [
    ["eq", "role_id", 3],
    ["eq", "approval_status", "Pending"],
  ]);
});

test("approving a pending User sets approval and account status to active", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 3 }, error: null },
    { data: { id: 789, is_blocked: false }, error: null },
  ]);

  const result = await decideUserApproval(admin, "789", "approve");

  assert.deepEqual(result, {
    status: "ok",
    approvalStatus: "Approved",
    wasBlocked: false,
  });
  const updateCall = admin.calls.find((call) => call.update);
  assert.deepEqual(updateCall.update, {
    approval_status: "Approved",
    status: "Active",
  });
  assert.deepEqual(updateCall.filters, [
    ["eq", "id", "789"],
    ["eq", "role_id", 3],
    ["eq", "approval_status", "Pending"],
  ]);
});

test("rejecting a pending User does not make the account active", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    { data: { id: 3 }, error: null },
    { data: { id: 789, is_blocked: false }, error: null },
  ]);

  const result = await decideUserApproval(admin, "789", "reject");

  assert.deepEqual(result, {
    status: "ok",
    approvalStatus: "Rejected",
    wasBlocked: false,
  });
  const updateCall = admin.calls.find((call) => call.update);
  assert.deepEqual(updateCall.update, { approval_status: "Rejected" });
});

test("Superadmin can promote an active approved User to Admin", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: {
        id: 789,
        role_id: 3,
        auth_user_id: "auth-user",
        approval_status: "Approved",
        is_blocked: false,
        status: "Active",
      },
      error: null,
    },
    { data: { name: "User" }, error: null },
    { data: { id: 2 }, error: null },
    { data: { id: 789 }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Superadmin", "789", {
    role: "Admin",
  });

  assert.deepEqual(result, { status: "ok" });
  const updateCall = admin.calls.find((call) => call.update);
  assert.deepEqual(updateCall.update, { role_id: 2 });
  assert.deepEqual(updateCall.filters, [
    ["eq", "id", "789"],
    ["eq", "role_id", 3],
    ["eq", "approval_status", "Approved"],
    ["eq", "is_blocked", false],
    ["eq", "status", "Active"],
  ]);
});

test("Superadmin can demote an active approved Admin to User", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: {
        id: 789,
        role_id: 2,
        auth_user_id: "auth-admin",
        approval_status: "Approved",
        is_blocked: false,
        status: "Active",
      },
      error: null,
    },
    { data: { name: "Admin" }, error: null },
    { data: { id: 3 }, error: null },
    { data: { id: 789 }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Superadmin", "789", {
    role: "User",
  });

  assert.deepEqual(result, { status: "ok" });
  assert.deepEqual(
    admin.calls.find((call) => call.update).update,
    { role_id: 3 }
  );
});

test("Admin cannot promote a User to Admin", async () => {
  const admin = createAdminMock([]);
  const result = await updateManagedUser(admin, "Admin", "789", {
    role: "Admin",
  });

  assert.deepEqual(result, { status: "forbidden" });
  assert.equal(admin.calls.length, 0);
});

test("Superadmin cannot promote a pending or blocked account", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: {
        id: 789,
        role_id: 3,
        auth_user_id: "auth-user",
        approval_status: "Pending",
        is_blocked: false,
        status: "Active",
      },
      error: null,
    },
    { data: { name: "User" }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Superadmin", "789", {
    role: "Admin",
  });

  assert.deepEqual(result, { status: "ineligible" });
  assert.equal(admin.calls.some((call) => call.update), false);
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

test("Superadmin cannot block a Superadmin account", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: {
        id: 1,
        role_id: 1,
        auth_user_id: "auth-superadmin",
        approval_status: "Approved",
        is_blocked: false,
        status: "Active",
      },
      error: null,
    },
    { data: { name: "Superadmin" }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Superadmin", "1", {
    isBlocked: true,
  });

  assert.deepEqual(result, { status: "protected" });
  assert.equal(admin.calls.some((call) => call.update), false);
});

test("Superadmin cannot demote a Superadmin account", async () => {
  const admin = createAdminMock([
    ...canonicalSchemaResponses(),
    {
      data: {
        id: 1,
        role_id: 1,
        auth_user_id: "auth-superadmin",
        approval_status: "Approved",
        is_blocked: false,
        status: "Active",
      },
      error: null,
    },
    { data: { name: "Superadmin" }, error: null },
  ]);

  const result = await updateManagedUser(admin, "Superadmin", "1", {
    role: "User",
  });

  assert.deepEqual(result, { status: "protected" });
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
