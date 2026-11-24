import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";
import * as authPolicy from "./auth-policy.mjs";
import * as passwordReservation from "./password-setup-reservation.mjs";
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
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
    grantStatus = "Active", hasGrant = true, statusColumnMissing = false,
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
      let columns;
      const missingStatus = () => table === "app_user" && statusColumnMissing &&
        columns.split(",").map((column) => column.trim()).includes("status");
      const result = () => {
        if (missingStatus()) return { data: null, error: { code: "42703" } };
        const rows = data[table].filter((row) => filters.every(([key, value]) =>
          key === "auth_user_id" || row[key] === value));
        return {
          data: table === "app_user"
            ? rows.map((row) => Object.fromEntries(columns.split(",").map((column) => {
              const name = column.trim();
              return [name, row[name]];
            })))
            : rows,
          error: null,
          count: rows.length,
        };
      };
      const query = {
        select(value) { columns = value; return query; },
        limit() { return Promise.resolve({ error: missingStatus() ? { code: "42703" } : null }); },
        eq(key, value) { filters.push([key, value]); return query; },
        maybeSingle() { const value = result(); return Promise.resolve({ ...value, data: value.data?.[0] ?? null }); },
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
    "next/headers": { cookies: async () => ({ getAll: () => [], get: () => undefined, set() {} }) },
    "@supabase/ssr": {
      createServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user }, error: null }),
          signInWithPassword: async () => ({ data: { user }, error: null }),
          signOut: async () => { calls.push("signOut"); return { error: null }; },
        },
      }),
    },
    "@/lib/supabase-admin": {
      getSupabaseServerConfig: () => ({ url: "http://localhost", anonKey: "test" }),
      createSupabaseAdminClient: () => admin,
    },
    "@/lib/auth-policy.mjs": authPolicy,
    "@/lib/password-setup-reservation.mjs": passwordReservation,
    "@/lib/dashboard-access.mjs": dashboardAccess,
    "@/lib/dashboard-policy.mjs": dashboardPolicy,
    "@/lib/registration-claim.mjs": { verifyRegistrationClaim: () => null, REGISTRATION_CLAIM_COOKIE: "claim" },
    "@/lib/manual-registration.mjs": { activateApprovedManualRegistration: record("activate", { ok: true }) },
    "@/lib/email-verification.mjs": { registrationEmailRedirect: () => "http://localhost:3000/auth/verify-email" },
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
    ["inactive account", { status: "Inactive" }, "/api/customers", "GET", 401],
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

test("login and password setup deny inactive and blocked accounts", async () => {
  for (const options of [{ status: "Inactive" }, { blocked: true }]) {
    const login = fixture(options);
    const { POST: signIn } = loadRoute("app/api/auth/login/route.ts", login.imports);
    const signInResponse = await signIn(request("/api/auth/login", "POST", {
      email: "test@example.invalid", password: "password",
    }));
    assert.equal(signInResponse.status, 403);
    assert.deepEqual(login.calls, ["signOut"]);

    const setup = fixture(options);
    const { POST: setPassword } = loadRoute("app/api/auth/set-password/route.ts", setup.imports);
    const setupResponse = await setPassword(request("/api/auth/set-password", "POST", { password: "new-password" }));
    assert.equal(setupResponse.status, 403);
    assert.deepEqual(setup.calls, ["signOut"]);
  }
});


test("both password setup paths reserve eligibility before updating Auth", async () => {
  for (const claim of [false, true]) {
    for (const eligible of [false, true]) {
      const { imports } = fixture({ mustChangePassword: true });
      const calls = [];
      const admin = imports["@/lib/supabase-admin"].createSupabaseAdminClient();

      admin.rpc = async (name) => {
        calls.push(name);
        return {
          data: name === "reserve_password_setup" ? eligible : true,
          error: null,
        };
      };

      admin.auth = {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                app_metadata: { must_change_password: true },
              },
            },
            error: null,
          }),
          updateUserById: async (id) => {
            calls.push("admin-update");
            return { data: { user: { id } }, error: null };
          },
        },
      };

      if (claim) {
        imports["@/lib/registration-claim.mjs"].verifyRegistrationClaim =
          () => "registration-id";
      } else {
        const create = imports["@supabase/ssr"].createServerClient;

        imports["@supabase/ssr"].createServerClient = () => {
          const client = create();

          client.auth.updateUser = async () => {
            calls.push("user-update");
            return {
              data: { user: { id: "auth-id" } },
              error: null,
            };
          };

          return client;
        };
      }

      const { POST: setPassword } = loadRoute(
        "app/api/auth/set-password/route.ts",
        imports
      );

      const response = await setPassword(
        request("/api/auth/set-password", "POST", {
          password: "new-password",
        })
      );

      assert.equal(response.status, eligible ? 200 : 403);
      assert.equal(calls[0], "reserve_password_setup");

      if (!eligible) {
        assert.deepEqual(calls, ["reserve_password_setup"]);
      } else if (claim) {
        assert.deepEqual(calls, [
          "reserve_password_setup",
          "admin-update",
          "release_password_setup",
        ]);
      } else {
        assert.deepEqual(calls, [
          "reserve_password_setup",
          "user-update",
          "admin-update",
          "release_password_setup",
        ]);
      }
    }
  }
});

test("registration-claim password page requires an eligible profile", async (t) => {
  for (const [label, changes, allowed] of [
    ["active and approved", {}, true],
    ["pending", { approval_status: "Pending" }, false],
    ["rejected", { approval_status: "Rejected" }, false],
    ["inactive", { status: "Inactive" }, false],
    ["blocked", { is_blocked: true }, false],
  ]) {
    await t.test(label, async () => {
      const { imports } = fixture();
      const profile = {
        auth_user_id: "registration-id",
        is_blocked: false,
        approval_status: "Approved",
        status: "Active",
        ...changes,
      };
      imports["next/server"] = { ...imports["next/server"], connection: async () => {} };
      imports["next/navigation"] = { redirect: (path) => { throw new Error(`redirect:${path}`); } };
      imports["@/components/set-password-form"] = { SetPasswordForm: () => null };
      imports["@/lib/registration-claim.mjs"] = {
        REGISTRATION_CLAIM_COOKIE: "claim",
        verifyRegistrationClaim: () => "registration-id",
      };
      imports["@/lib/supabase-admin"] = {
        getSupabaseServerConfig: () => ({ serviceRoleKey: "test" }),
        createSupabaseAdminClient: () => ({
          from: () => ({
            select: (columns) => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: Object.fromEntries(columns.split(",").map((column) => {
                    const name = column.trim();
                    return [name, profile[name]];
                  })),
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      const { default: SetPasswordPage } = loadRoute("app/set-password/page.tsx", imports);
      if (allowed) {
        assert.equal((await SetPasswordPage()).type, "main");
      } else {
        await assert.rejects(SetPasswordPage(), { message: "redirect:/register" });
      }
    });
  }
});

test("missing status schema fails closed for login and proxy", async () => {
  const login = fixture({ statusColumnMissing: true });
  const { POST: signIn } = loadRoute("app/api/auth/login/route.ts", login.imports);
  const response = await signIn(request("/api/auth/login", "POST", {
    email: "test@example.invalid", password: "password",
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(login.calls, ["signOut"]);

  const { imports } = fixture({ statusColumnMissing: true });
  const { proxy } = loadRoute("proxy.ts", imports);
  assert.equal((await proxy(request("/api/customers"))).status, 503);
});

test("user management page rejects regular Users in the proxy", async () => {
  for (const [role, status] of [["User", 307], ["Admin", 200], ["Superadmin", 200]]) {
    const { imports } = fixture({ role });
    const { proxy } = loadRoute("proxy.ts", imports);
    const response = await proxy(request("/dashboard/users"));
    assert.equal(response.status, status);
    if (role === "User") assert.equal(new URL(response.headers.get("location")).pathname, "/no-access");
  }
});

test("protected admin route handlers enforce authorization and allow approved rights writes", async (t) => {
  const routes = [
    ["users GET", "app/api/admin/users/route.ts", "GET", "/api/admin/users", undefined, "list", 200],
    ["users POST", "app/api/admin/users/route.ts", "POST", "/api/admin/users", { firstName: "Test", lastName: "User", email: "test@example.invalid" }, "provision", 201],
    ["user PATCH", "app/api/admin/users/[id]/route.ts", "PATCH", "/api/admin/users/2", { isBlocked: true }, "update", 200],
    ["rights GET", "app/api/admin/users/[id]/rights/route.ts", "GET", "/api/admin/users/2/rights", undefined, "rights", 200],
    ["rights POST", "app/api/admin/users/[id]/rights/route.ts", "POST", "/api/admin/users/2/rights", { rightIds: ["1"] }, "saveRights", 200],
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
      }
    });
  }
});


