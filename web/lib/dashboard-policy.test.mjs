
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { loadDashboardAccess } from "./dashboard-access.mjs";
import { hasRight, MODULES, routeRequirement } from "./dashboard-policy.mjs";
import { loadDashboardStats } from "./dashboard-stats.mjs";

function mockAdmin({
  role = "User", account = {}, permissions = [{ right_id: 1 }], failure,
  counts = {},
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
      let columns;
      calls.push({ table, filters });

      const query = {
        select(value) {
          columns = value;
          return query;
        },
        limit() {
          return Promise.resolve({ error: null });
        },
        eq(column, value) {
          filters.push([column, value]);
          return query;
        },
        maybeSingle() {
          if (failure === "status" && columns.includes("status")) {
            return Promise.resolve({ error: { code: "42703" } });
          }
          return Promise.resolve(
            failure === table
              ? { error: { code: "failure" } }
              : responses[table]
          );
        },
        then(resolve, reject) {
          const response = responses[table];
          return Promise.resolve(
            failure === table
              ? { error: { code: "failure" } }
              : {
                  ...response,
                  count: Object.hasOwn(counts, table)
                    ? counts[table]
                    : response.data.length,
                }
          ).then(resolve, reject);
        },
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

  assert.ok(
    admin.calls.find((call) => call.table === "user_permission")
      .filters.some(([key, value]) => key === "status" && value === "Active")
  );

  assert.equal(
    admin.calls.filter((call) => call.table === "app_user").length,
    1
  );
});

test("incomplete or unavailable catalogue and assignment counts fail closed", async () => {
  for (const role of ["User", "Admin", "Superadmin"]) {
    for (const counts of [{ rights: 7 }, { module: null }]) {
      assert.equal(
        (await loadDashboardAccess(mockAdmin({ role, counts }), "auth-id")).status,
        "unavailable"
      );
    }
  }

  assert.equal(
    (await loadDashboardAccess(
      mockAdmin({ counts: { user_permission: 2 } }),
      "auth-id"
    )).status,
    "unavailable"
  );
});

test("administrators have implicit module rights but cannot use unknown actions", async () => {
  for (const role of ["Admin", "Superadmin"]) {
    const admin = mockAdmin({ role });
    const access = await loadDashboardAccess(admin, "auth-id");

    for (const entry of MODULES) {
      assert.equal(hasRight(access, entry.code), true);
    }

    assert.equal(hasRight(access, "PRODUCT", "ADD"), true);
    assert.equal(hasRight(access, "PRODUCT", "BOGUS"), false);
    assert.equal(hasRight(access, "PRODUCT", ""), false);
    assert.equal(hasRight(access, "PRODUCT", null), false);
    assert.equal(hasRight(access, "BOGUS"), false);

    assert.equal(
      admin.calls.some((call) => call.table === "user_permission"),
      false
    );
  }
});

test("an explicitly invalid action never becomes a module-level check", async () => {
  const access = await loadDashboardAccess(mockAdmin(), "auth-id");

  assert.equal(hasRight(access, "CUSTOMER"), true);

  for (const action of ["", null, false, 0]) {
    assert.equal(hasRight(access, "CUSTOMER", action), false);
  }
});

test("all roles reject inactive modules and modules without active rights", async () => {
  const modules = [
    { id: 1, code: "CUSTOMER" },
    { id: 2, code: "PRODUCT" },
  ];

  const rights = [
    { id: 1, module_id: 1, action: "ADD" },
    { id: 3, module_id: 3, action: "ADD" },
  ];

  for (const role of ["User", "Admin", "Superadmin"]) {
    const access = await loadDashboardAccess(
      mockAdmin({ role, modules, rights }),
      "auth-id"
    );

    assert.equal(access.status, "ok");
    assert.equal(hasRight(access, "CUSTOMER"), true);
    assert.equal(hasRight(access, "PRODUCT"), false);
    assert.equal(hasRight(access, "HR"), false);
    assert.equal(hasRight(access, "HR", "ADD"), false);

    const queried = [];

    const admin = {
      from(table) {
        queried.push(table);

        return {
          select: () => ({
            eq: () => ({
              limit: () =>
                Promise.resolve({ count: 1, error: null }),
            }),
          }),
        };
      },
    };

    await loadDashboardStats(admin, access);

    // Correct live Supabase table name is lowercase.
    assert.deepEqual(queried, ["customer"]);
  }
});

test("inactive, blocked or unapproved accounts and failed lookups fail closed", async () => {
  for (const role of ["User", "Admin", "Superadmin"]) {
    for (const account of [
      { status: "Inactive" },
      { is_blocked: true },
      { approval_status: "Pending" },
    ]) {
      assert.equal(
        (await loadDashboardAccess(mockAdmin({ role, account }), "auth-id")).status,
        "forbidden"
      );
    }
  }

  assert.equal(
    (await loadDashboardAccess(
      mockAdmin({ failure: "user_permission" }),
      "auth-id"
    )).status,
    "unavailable"
  );

  assert.equal(
    (await loadDashboardAccess(
      mockAdmin({ failure: "status" }),
      "auth-id"
    )).status,
    "unavailable"
  );
});

test("module routes guard reads and reject unmapped nested routes and writes", () => {
  assert.deepEqual(
    routeRequirement("/dashboard/customers", "GET"),
    { module: "CUSTOMER", unsupported: false }
  );

  assert.deepEqual(
    routeRequirement("/api/customers", "POST"),
    { module: "CUSTOMER", unsupported: true }
  );

  assert.deepEqual(
    routeRequirement("/api/customers/123", "GET"),
    { module: "CUSTOMER", unsupported: true }
  );

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

              return {
                limit: () =>
                  Promise.resolve(
                    table === "product"
                      ? {
                          count: null,
                          error: { code: "failure" },
                          status: 403,
                        }
                      : {
                          count: 12,
                          error: null,
                          status: 200,
                        }
                  ),
              };
            },
          };
        },
      };
    },
  };

  const access = {
    role: "User",
    catalogue: [
      { module: "CUSTOMER" },
      { module: "PRODUCT" },
    ],
    grants: [
      { module: "CUSTOMER" },
      { module: "PRODUCT" },
    ],
  };

  assert.deepEqual(
    await loadDashboardStats(admin, access),
    ["12", "Unavailable", null, null, null]
  );

  assert.deepEqual(
    calls.map((call) => call.table),
    ["customer", "product"]
  );

  assert.deepEqual(calls[0].filter, ["is_deleted", false]);
  assert.deepEqual(calls[0].options, { count: "exact" });
});

test("count requests return no rows and retain PostgREST error codes", async (t) => {
  const requests = [];
  const errors = t.mock.method(console, "error", () => {});

  const admin = createClient(
    "https://example.invalid",
    "mock-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: async (url, options) => {
          requests.push({
            url: new URL(url),
            method: options.method,
          });

          if (requests.length === 1) {
            return new Response("[]", {
              status: 200,
              headers: { "content-range": "*/12" },
            });
          }

          return new Response(
            JSON.stringify({
              code: "PGRST205",
              message: "Table not found",
            }),
            { status: 404 }
          );
        },
      },
    }
  );

  const access = {
    role: "User",
    catalogue: [
      { module: "CUSTOMER" },
      { module: "PRODUCT" },
    ],
    grants: [
      { module: "CUSTOMER" },
      { module: "PRODUCT" },
    ],
  };

  assert.deepEqual(
    await loadDashboardStats(admin, access),
    ["12", "Unavailable", null, null, null]
  );

  for (const request of requests) {
    assert.equal(request.method, "GET");
    assert.equal(request.url.searchParams.get("limit"), "0");
    assert.equal(
      request.url.searchParams.get("is_deleted"),
      "eq.false"
    );
  }

  assert.match(
    errors.mock.calls[0].arguments[0],
    /module=PRODUCT status=404 code=PGRST205 count=null/
  );
});

test("all missing dashboard tables are reported without fabricating counts", async (t) => {
  const paths = [];
  const errors = t.mock.method(console, "error", () => {});

  const admin = createClient(
    "https://example.invalid",
    "mock-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: async (url) => {
          paths.push(new URL(url).pathname);

          return new Response(
            JSON.stringify({
              code: "PGRST205",
              message: "Table not found",
            }),
            { status: 404 }
          );
        },
      },
    }
  );

  const access = {
    role: "Admin",
    catalogue: MODULES.map((entry) => ({
      module: entry.code,
      action: "ADD",
    })),
    grants: [],
  };

  assert.deepEqual(
    await loadDashboardStats(admin, access),
    [
      "Unavailable",
      "Unavailable",
      "Unavailable",
      "Unavailable",
      null,
    ]
  );

  // Expected paths now match the lowercase live database tables.
  assert.deepEqual(paths, [
    "/rest/v1/customer",
    "/rest/v1/product",
    "/rest/v1/employee",
    "/rest/v1/sales",
  ]);

  assert.equal(errors.mock.calls.length, 4);

  for (const [index, module] of [
    "CUSTOMER",
    "PRODUCT",
    "HR",
    "SALES",
  ].entries()) {
    assert.match(
      errors.mock.calls[index].arguments[0],
      new RegExp(`module=${module} status=404 code=PGRST205`)
    );
  }
});
