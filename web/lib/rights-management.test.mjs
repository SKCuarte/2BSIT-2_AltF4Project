import assert from "node:assert/strict";
import { test } from "node:test";
import { loadManagedUserRights } from "./rights-management.mjs";
import { getRightsWritePolicyDecision } from "./rights-management-policy.mjs";
import {
  getModuleSelectionState,
  getUserSelection,
  updateRightSelection,
} from "./rights-selection.mjs";
import {
  planRightsChanges,
  saveManagedUserRights,
  validateRightsSelection,
} from "./rights-management-write.mjs";

const userId = "00000000-0000-0000-0000-000000000001";

function mockAdmin(responses) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const query = {
        select() { return query; },
        limit() { return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        in(column, value) { call.filters.push([column, value]); return query; },
        order() { return query; },
        range(start, end) { call.range = [start, end]; return query; },
        maybeSingle() { return Promise.resolve(responses.shift()); },
        then(resolve, reject) {
          const response = responses.shift() ?? { data: null, error: { code: "failure" }, count: 0 };
          if (
            ["module", "rights"].includes(table) &&
            Array.isArray(response?.data) &&
            !Object.hasOwn(response, "count")
          ) {
            response.count = response.data.length;
          }
          return Promise.resolve(response).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

function targetResponses(role = "User") {
  return [
    { error: null }, { error: null }, { error: null },
    { data: { id: userId, role_id: 3 }, error: null },
    { data: { name: role }, error: null },
  ];
}

function catalogue() {
  const codes = ["CUSTOMER", "PRODUCT", "HR", "SALES", "REPORTS"];
  const counts = [3, 6, 13, 7, 7];
  const modules = codes.map((code, index) => ({ id: index + 1, code, name: code }));
  let id = 0;
  const rights = modules.flatMap((module, index) =>
    Array.from({ length: counts[index] }, () => {
      id += 1;
      return { id, module_id: module.id, code: `RIGHT_${id}`, label: `Right ${id}` };
    })
  );
  return { modules, rights };
}

test("loads grouped rights and only active assignments for the selected user", async () => {
  const { modules, rights } = catalogue();
  const admin = mockAdmin([
    ...targetResponses(),
    { data: modules, error: null },
    { data: rights, error: null },
    { data: [{ right_id: 1 }, { right_id: 1 }, { right_id: 4 }], count: 3, error: null },
  ]);
  const result = await loadManagedUserRights(admin, "Admin", userId);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.modules.map((module) => module.rights.length), [3, 6, 13, 7, 7]);
  assert.deepEqual(result.modules.flatMap((module) => module.rights.filter((right) => right.assigned).map((right) => right.id)), ["1", "4"]);
  const permissions = admin.calls.find((call) => call.table === "user_permission");
  assert.ok(permissions.filters.some(([column, value]) => column === "user_id" && value === userId));
  assert.ok(permissions.filters.some(([column, value]) => column === "status" && value === "Active"));
});

test("rejects unmanageable targets before querying the catalogue", async () => {
  for (const [actor, role, status] of [["Admin", "Admin", "forbidden"], ["Admin", "Superadmin", "forbidden"], ["Superadmin", "Superadmin", "protected"], ["User", "User", "forbidden"]]) {
    const admin = mockAdmin(targetResponses(role));
    assert.equal((await loadManagedUserRights(admin, actor, userId)).status, status);
    assert.equal(admin.calls.some((call) => call.table === "module"), false);
  }
  const admin = mockAdmin([]);
  assert.equal((await loadManagedUserRights(admin, "Admin", "invalid")).status, "invalid");
  assert.equal(admin.calls.length, 0);
});

test("reads assignments beyond the first page when duplicate rows exist", async () => {
  const { modules, rights } = catalogue();
  const admin = mockAdmin([
    ...targetResponses(),
    { data: modules, error: null },
    { data: rights, error: null },
    { data: Array.from({ length: 1000 }, () => ({ right_id: 1 })), count: 1001, error: null },
    { data: [{ right_id: 36 }], count: 1001, error: null },
  ]);
  const result = await loadManagedUserRights(admin, "Superadmin", userId);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.modules.flatMap((module) => module.rights.filter((right) => right.assigned).map((right) => right.id)), ["1", "36"]);
});

test("continues pagination when the API caps pages below the requested size", async () => {
  const { modules, rights } = catalogue();
  const admin = mockAdmin([
    ...targetResponses(),
    { data: modules, error: null },
    { data: rights, error: null },
    { data: [{ right_id: 1 }, { right_id: 4 }], count: 3, error: null },
    { data: [{ right_id: 36 }], count: 3, error: null },
  ]);
  const result = await loadManagedUserRights(admin, "Admin", userId);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.modules.flatMap((module) => module.rights.filter((right) => right.assigned).map((right) => right.id)), ["1", "4", "36"]);
  assert.deepEqual(admin.calls.filter((call) => call.table === "user_permission").map((call) => call.range), [[0, 999], [2, 1001]]);
});

test("fails closed when the assignment count cannot be fully read", async () => {
  const { modules, rights } = catalogue();
  const admin = mockAdmin([
    ...targetResponses(),
    { data: modules, error: null },
    { data: rights, error: null },
    { data: [], count: 1, error: null },
  ]);
  assert.equal((await loadManagedUserRights(admin, "Admin", userId)).code, "incomplete_permission_query");
});

test("fails closed for missing catalogue items and permission query errors", async () => {
  const { modules, rights } = catalogue();
  const invalid = mockAdmin([
    ...targetResponses(), { data: modules, error: null },
    { data: rights.slice(1), error: null },
  ]);
  assert.equal((await loadManagedUserRights(invalid, "Admin", userId)).code, "invalid_rights_catalogue");
  const failed = mockAdmin([
    ...targetResponses(), { data: modules, error: null },
    { data: rights, error: null }, { data: null, error: { code: "failure" } },
  ]);
  assert.equal((await loadManagedUserRights(failed, "Admin", userId)).code, "failure");
});

test("validates a unique, bounded selection of bigint right IDs", () => {
  assert.deepEqual(validateRightsSelection({ rightIds: ["1", "9223372036854775807"] }), {
    status: "ok",
    rightIds: ["1", "9223372036854775807"],
  });
  for (const value of [
    { rightIds: ["1", "1"] },
    { rightIds: ["0"] },
    { rightIds: ["9223372036854775808"] },
    { rightIds: Array.from({ length: 37 }, (_, index) => String(index + 1)) },
    { rightIds: [1.5] },
    { rightIds: ["1"], actorId: userId },
    {},
  ]) {
    assert.deepEqual(validateRightsSelection(value), { status: "invalid" });
  }
});

test("plans grants and soft revokes without deleting assignment history", () => {
  assert.deepEqual(
    planRightsChanges(
      ["1", "2", "3"],
      [
        { right_id: "1", status: "Active" },
        { right_id: "2", status: "Active" },
        { right_id: "3", status: "Inactive" },
      ],
      ["1", "3"]
    ),
    { status: "ok", grantRightIds: ["3"], revokeRightIds: ["2"] }
  );
});

test("module and global draft controls update local selection without touching assignments", () => {
  const assigned = new Set(["1", "3"]);
  const moduleAll = updateRightSelection(assigned, ["1", "2"], true);
  assert.deepEqual([...moduleAll].sort(), ["1", "2", "3"]);
  const moduleNone = updateRightSelection(moduleAll, ["1", "2"], false);
  assert.deepEqual([...moduleNone], ["3"]);
  const allRights = updateRightSelection(moduleNone, ["1", "2", "3", "4"], true);
  assert.deepEqual([...allRights].sort(), ["1", "2", "3", "4"]);
  assert.deepEqual([...assigned].sort(), ["1", "3"]);
});

test("selection state is scoped to the current user", () => {
  const priorUserSelection = { userId: "user-a", ids: new Set(["1", "2"]) };
  const currentUserAssigned = new Set(["3"]);
  const selected = getUserSelection(priorUserSelection, "user-b", currentUserAssigned);

  assert.deepEqual([...selected], ["3"]);
  assert.deepEqual([...priorUserSelection.ids].sort(), ["1", "2"]);
});

test("module checkbox state handles empty, partial, and fully selected modules", () => {
  const selected = new Set(["1", "3"]);
  assert.deepEqual(getModuleSelectionState([], selected), {
    checked: false,
    indeterminate: false,
  });
  assert.deepEqual(getModuleSelectionState(["1", "2"], selected), {
    checked: false,
    indeterminate: true,
  });
  assert.deepEqual(getModuleSelectionState(["1", "3"], selected), {
    checked: true,
    indeterminate: false,
  });
});

test("fails closed on duplicate active assignments and selections outside the catalogue", () => {
  assert.deepEqual(
    planRightsChanges(
      ["1"],
      [{ right_id: "1", status: "Active" }, { right_id: "1", status: "Active" }],
      ["1"]
    ),
    { status: "duplicate_active" }
  );
  assert.deepEqual(planRightsChanges(["1"], [], ["2"]), { status: "invalid" });
});

test("Admin can manage Users and Superadmin can manage Admins", () => {
  assert.deepEqual(
    getRightsWritePolicyDecision({ actorRole: "Admin", targetRole: "User" }),
    { allowed: true, code: "allowed" }
  );
  assert.deepEqual(
    getRightsWritePolicyDecision({ actorRole: "Superadmin", targetRole: "Admin" }),
    { allowed: true, code: "allowed" }
  );
});

test("protected and unauthorized roles cannot be managed", () => {
  assert.deepEqual(
    getRightsWritePolicyDecision({ actorRole: "Admin", targetRole: "Superadmin" }),
    { allowed: false, code: "protected" }
  );
  assert.deepEqual(
    getRightsWritePolicyDecision({ actorRole: "Admin", targetRole: "Admin" }),
    { allowed: false, code: "forbidden" }
  );
  assert.deepEqual(
    getRightsWritePolicyDecision({ actorRole: "User", targetRole: "User" }),
    { allowed: false, code: "forbidden" }
  );
});

test("concurrent saves use the BIGINT RPC contract after role authorization", async () => {
  const makeAdmin = (targetRole = "User") => {
    const admin = mockAdmin([
      { error: null },
      { error: null },
      { error: null },
      { data: { id: "1", role_id: 3 }, error: null },
      { data: { name: targetRole }, error: null },
    ]);

    const calls = [];
    admin.rpc = async (name, args) => {
      calls.push({ name, args });
      return { data: 1, error: null };
    };

    return { admin, calls };
  };

  const first = makeAdmin();
  const second = makeAdmin();

  const results = await Promise.all([
    saveManagedUserRights(first.admin, "Admin", "2", "1", ["1", "3"]),
    saveManagedUserRights(second.admin, "Admin", "2", "1", ["1"]),
  ]);

  assert.deepEqual(results, [
    { status: "ok", changedCount: 1 },
    { status: "ok", changedCount: 1 },
  ]);

  for (const entry of [first, second]) {
    assert.equal(entry.calls.length, 1);
    assert.equal(entry.calls[0].name, "manage_user_permissions");
    assert.equal(entry.calls[0].args.p_actor_id, "2");
    assert.equal(entry.calls[0].args.p_target_user_id, "1");
  }
});

test("Admin cannot save rights for an Admin target", async () => {
  const admin = mockAdmin([
    { error: null },
    { error: null },
    { error: null },
    { data: { id: "1", role_id: 3 }, error: null },
    { data: { name: "Admin" }, error: null },
  ]);

  let rpcCalled = false;
  admin.rpc = async () => {
    rpcCalled = true;
    return { data: 1, error: null };
  };

  const result = await saveManagedUserRights(
    admin,
    "Admin",
    "2",
    "1",
    ["1"]
  );

  assert.equal(result.status, "forbidden");
  assert.equal(rpcCalled, false);
});
