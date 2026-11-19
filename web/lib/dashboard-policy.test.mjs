import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDashboardAccess } from "./dashboard-access.mjs";
import { hasRight, MODULES, routeRequirement } from "./dashboard-policy.mjs";
import { loadDashboardStats } from "./dashboard-stats.mjs";

function mockAdmin({
  role = "User", account = {}, permissions = [{ right_id: 1 }], failure,
  modules = MODULES.map((entry, index) => ({ id: index + 1, code: entry.code })),
  rights = MODULES.map((entry, index) => ({ id: index + 1, module_id: index + 1, action: "ADD" }))
    .concat({ id: 6, module_id: 1, action: "EDIT" }),
} = {}) {
  const calls = [];
  const responses = {
    app_user: { data: { id: 7, role_id: 3, status: "Active", is_blocked: false, approval_status: "Approved", ...account }, error: null },
    role: { data: { name: role }, error: null },
    module: { data: modules, error: null },
    rights: { data: rights, error: null },
    user_permission: { data: permissions, error: null },
  };
  return {
    calls,
    from(table) {
      const filters = [];
      calls.push({ table, filters });
      const query = {
        select() { return query; },
        limit() { return Promise.resolve({ error: null }); },
        eq(column, value) { filters.push([column, value]); return query; },
        maybeSingle() { return Promise.resolve(failure === table ? { error: { code: "failure" } } : responses[table]); },
        then(resolve, reject) { return Promise.resolve(failure === table ? { error: { code: "failure" } } : responses[table]).then(resolve, reject); },
      };
      return query;
    },
  };
}

test("regular users receive only their active assigned module and action rights", async () => {
  const admin = mockAdmin();
  const access = await loadDashboardAccess(admin, "auth-id");
  assert.equal(access.status, "ok");
  assert.equal(hasRight(access, "CUSTOMER"), true);
  assert.equal(hasRight(access, "CUSTOMER", "ADD"), true);
  assert.equal(hasRight(access, "CUSTOMER", "EDIT"), false);
  assert.equal(hasRight(access, "PRODUCT"), false);
  assert.ok(admin.calls.find((call) => call.table === "user_permission").filters.some(([key, value]) => key === "status" && value === "Active"));
});

test("administrators have implicit module rights but cannot use unknown actions", async () => {
  for (const role of ["Admin", "Superadmin"]) {
    const admin = mockAdmin({ role });
    const access = await loadDashboardAccess(admin, "auth-id");
    for (const entry of MODULES) assert.equal(hasRight(access, entry.code), true);
    assert.equal(hasRight(access, "PRODUCT", "ADD"), true);
    assert.equal(hasRight(access, "PRODUCT", "BOGUS"), false);
    assert.equal(hasRight(access, "BOGUS"), false);
    assert.equal(admin.calls.some((call) => call.table === "user_permission"), false);
  }
});

test("all roles reject inactive modules and modules without active rights", async () => {
  const modules = [{ id: 1, code: "CUSTOMER" }, { id: 2, code: "PRODUCT" }];
  const rights = [{ id: 1, module_id: 1, action: "ADD" }, { id: 3, module_id: 3, action: "ADD" }];
  for (const role of ["User", "Admin", "Superadmin"]) {
    const access = await loadDashboardAccess(mockAdmin({ role, modules, rights }), "auth-id");
    assert.equal(access.status, "ok");
    assert.equal(hasRight(access, "CUSTOMER"), true);
    assert.equal(hasRight(access, "PRODUCT"), false);
    assert.equal(hasRight(access, "HR"), false);
    assert.equal(hasRight(access, "HR", "ADD"), false);
    const queried = [];
    const admin = {
      from(table) {
        queried.push(table);
        return { select: () => ({ eq: () => Promise.resolve({ count: 1, error: null }) }) };
      },
    };
    await loadDashboardStats(admin, access);
    assert.deepEqual(queried, ["CUSTOMER"]);
  }
});

test("inactive, blocked or unapproved accounts and failed lookups fail closed", async () => {
  for (const role of ["User", "Admin", "Superadmin"]) {
    for (const account of [{ status: "Inactive" }, { is_blocked: true }, { approval_status: "Pending" }]) {
      assert.equal((await loadDashboardAccess(mockAdmin({ role, account }), "auth-id")).status, "forbidden");
    }
  }
  assert.equal((await loadDashboardAccess(mockAdmin({ failure: "user_permission" }), "auth-id")).status, "unavailable");
});

test("module routes guard reads and reject unmapped nested routes and writes", () => {
  assert.deepEqual(routeRequirement("/dashboard/customers", "GET"), { module: "CUSTOMER", unsupported: false });
  assert.deepEqual(routeRequirement("/api/customers", "POST"), { module: "CUSTOMER", unsupported: true });
  assert.deepEqual(routeRequirement("/api/customers/123", "GET"), { module: "CUSTOMER", unsupported: true });
  assert.equal(routeRequirement("/api/admin/users", "GET"), null);
});

test("counts active records only for permitted modules and exposes query failures", async () => {
  const calls = [];
  const admin = {
    from(table) {
      calls.push({ table });
      return {
        select(columns, options) {
          calls.at(-1).options = options;
          return {
            eq(column, value) {
              calls.at(-1).filter = [column, value];
              return Promise.resolve(table === "PRODUCT" ? { count: null, error: { code: "failure" } } : { count: 12, error: null });
            },
          };
        },
      };
    },
  };
  const access = {
    role: "User",
    catalogue: [{ module: "CUSTOMER" }, { module: "PRODUCT" }],
    grants: [{ module: "CUSTOMER" }, { module: "PRODUCT" }],
  };
  assert.deepEqual(await loadDashboardStats(admin, access), ["12", "Unavailable", null, null, null]);
  assert.deepEqual(calls.map((call) => call.table), ["CUSTOMER", "PRODUCT"]);
  assert.deepEqual(calls[0].filter, ["status", "Active"]);
  assert.deepEqual(calls[0].options, { count: "exact", head: true });
});
