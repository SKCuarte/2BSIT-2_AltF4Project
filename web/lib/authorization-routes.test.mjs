import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";
import * as authPolicy from "./auth-policy.mjs";
import * as dashboardAccess from "./dashboard-access.mjs";
import * as dashboardPolicy from "./dashboard-policy.mjs";
import * as provisioning from "./admin-provisioning.mjs";
import * as rightsPolicy from "./rights-management-policy.mjs";
import * as rightsWrite from "./rights-management-write.mjs";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function loadRoute(relativePath, imports) {
  const filename = fileURLToPath(new URL(relativePath, root));
  const source = readFileSync(filename, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    return require(name);
  };
  new Function("require", "module", "exports", js)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function fixture(options = {}) {
  const {
    role = "User", signedIn = true, status = "Active", approval = "Approved",
    blocked = false, mustChangePassword = false, moduleActive = true,
    grantStatus = "Active", hasGrant = true,
  } = options;
  const calls = [];
  const account = { id: 7, role_id: 1, status, is_blocked: blocked, approval_status: approval };
  const data = {
    app_user: [account],
    role: [{ id: 1, name: role, status: "Active" }],
    module: [{ id: 1, code: "CUSTOMER", status: moduleActive ? "Active" : "Inactive" }],
    rights: [{ id: 1, module_id: 1, action: "ADD", status: "Active" }],
    user_permission: hasGrant ? [{ user_id: 7, right_id: 1, status: grantStatus }] : [],
  };
  const admin = {
    from(table) {
      if (!data[table]) throw new Error(`Unexpected table: ${table}`);
      const filters = [];
      const result = () => ({
        data: data[table].filter((row) => filters.every(([key, value]) =>
          key === "auth_user_id" || row[key] === value)),
        error: null,
      });
      const query = {
        select() { return query; },
        limit() { return Promise.resolve({ error: null }); },
        eq(key, value) { filters.push([key, value]); return query; },
        maybeSingle() { const value = result(); return Promise.resolve({ ...value, data: value.data[0] ?? null }); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
  };
  const user = signedIn ? { id: "auth-id", app_metadata: { must_change_password: mustChangePassword } } : null;
  const record = (name, value) => async () => { calls.push(name); return value; };
  const imports = {
    "server-only": {},
    "next/server": { NextRequest, NextResponse },
    "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
    "@supabase/ssr": {
      createServerClient: () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }), signOut: async () => ({ error: null }) },
      }),
    },
    "@/lib/supabase-admin": {
      getSupabaseServerConfig: () => ({ url: "http://localhost", anonKey: "test" }),
      createSupabaseAdminClient: () => admin,
    },
    "@/lib/auth-policy.mjs": authPolicy,
    "@/lib/dashboard-access.mjs": dashboardAccess,
    "@/lib/dashboard-policy.mjs": dashboardPolicy,
    "@/lib/admin-provisioning.mjs": {
      ...provisioning,
      provisionRegularUser: record("provision", { ok: true, temporaryPassword: "test" }),
    },
    "@/lib/user-management.mjs": {
      listManagedUsers: record("list", { status: "ok", users: [], total: 0 }),
      updateManagedUser: record("update", { status: "ok" }),
      listPendingUserApprovals: record("approvals", { status: "ok", users: [] }),
      decideUserApproval: record("decide", { status: "ok", approvalStatus: "Approved", wasBlocked: false }),
    },
    "@/lib/rights-management.mjs": {
      loadManagedUserRights: record("rights", { status: "ok", modules: [] }),
    },
    "@/lib/rights-management-policy.mjs": rightsPolicy,
    "@/lib/rights-management-write.mjs": {
      ...rightsWrite,
      saveManagedUserRights: record("saveRights", { status: "ok", changedCount: 1 }),
    },
  };
  imports["@/lib/superadmin-route"] = loadRoute("lib/superadmin-route.ts", imports);
  return { imports, calls };
}

function request(path, method = "GET", body) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

test("module API proxy checks authenticated roles, grants, account state, and mappings", async (t) => {
  const cases = [
    ["unauthenticated", { signedIn: false }, "/api/customers", "GET", 401],
    ["User without grant", { hasGrant: false }, "/api/customers", "GET", 403],
    ["User with active grant", {}, "/api/customers", "GET", 200],
    ["User with inactive grant", { grantStatus: "Inactive" }, "/api/customers", "GET", 403],
    ["Admin", { role: "Admin", hasGrant: false }, "/api/customers", "GET", 200],
    ["Superadmin", { role: "Superadmin", hasGrant: false }, "/api/customers", "GET", 200],
    ["inactive account", { status: "Inactive" }, "/api/customers", "GET", 403],
    ["pending account", { approval: "Pending" }, "/api/customers", "GET", 403],
    ["rejected account", { approval: "Rejected" }, "/api/customers", "GET", 401],
    ["blocked account", { blocked: true }, "/api/customers", "GET", 401],
    ["password change required", { mustChangePassword: true }, "/api/customers", "GET", 403],
    ["inactive module", { role: "Superadmin", moduleActive: false }, "/api/customers", "GET", 403],
    ["unmapped nested API", {}, "/api/customers/1", "GET", 403],
    ["unauthorized mutation", {}, "/api/customers", "POST", 403],
  ];
  for (const [label, options, path, method, expected] of cases) {
    await t.test(label, async () => {
      const { imports } = fixture(options);
      const { proxy } = loadRoute("proxy.ts", imports);
      const response = await proxy(request(path, method));
      assert.equal(response.status, expected);
      if (expected === 200) assert.equal(response.headers.get("x-middleware-next"), "1");
    });
  }
});

test("protected admin route handlers enforce authorization and preserve rights write lock", async (t) => {
  const routes = [
    ["users GET", "app/api/admin/users/route.ts", "GET", "/api/admin/users", undefined, "list", 200],
    ["users POST", "app/api/admin/users/route.ts", "POST", "/api/admin/users", { firstName: "Test", lastName: "User", email: "test@example.invalid" }, "provision", 201],
    ["user PATCH", "app/api/admin/users/[id]/route.ts", "PATCH", "/api/admin/users/2", { isBlocked: true }, "update", 200],
    ["rights GET", "app/api/admin/users/[id]/rights/route.ts", "GET", "/api/admin/users/2/rights", undefined, "rights", 200],
    ["rights POST", "app/api/admin/users/[id]/rights/route.ts", "POST", "/api/admin/users/2/rights", { rightIds: ["1"] }, null, 409],
    ["approvals GET", "app/api/admin/approvals/route.ts", "GET", "/api/admin/approvals", undefined, "approvals", 200],
    ["approval PATCH", "app/api/admin/approvals/[id]/route.ts", "PATCH", "/api/admin/approvals/2", { action: "approve" }, "decide", 200],
  ];
  for (const [label, file, method, path, body, call, success] of routes) {
    await t.test(label, async () => {
      const superadminOnly = label.startsWith("approval");
      const cases = [
        [{ signedIn: false }, 401],
        [{ role: "User" }, 403],
        [{ role: "Admin", mustChangePassword: true }, 403],
        [{ role: "Superadmin", mustChangePassword: true }, 403],
        [{ role: "Admin", status: "Inactive" }, 403],
        [{ role: "Admin", approval: "Pending" }, 403],
        [{ role: "Admin", approval: "Rejected" }, 403],
        [{ role: "Admin", blocked: true }, 403],
        [{ role: "Admin" }, superadminOnly ? 403 : success],
        [{ role: "Superadmin" }, success],
      ];
      for (const [options, expected] of cases) {
        const { imports, calls } = fixture(options);
        const route = loadRoute(file, imports);
        const response = await route[method](request(path, method, body), { params: Promise.resolve({ id: "2" }) });
        assert.equal(response.status, expected, JSON.stringify(options));
        if (expected === success && call) assert.deepEqual(calls, [call]);
        else assert.deepEqual(calls, []);
        if (label === "rights POST" && expected === 409) {
          assert.equal((await response.json()).code, "policy_pending");
        }
      }
    });
  }
});
