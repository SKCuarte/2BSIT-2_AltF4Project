import assert from "node:assert/strict";
import { test } from "node:test";
import { withPasswordSetupReservation } from "./password-setup-reservation.mjs";

test("password update runs only between successful reservation and release", async () => {
  const calls = [];
  const admin = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: true, error: null };
    },
  };
  const result = await withPasswordSetupReservation(admin, "user", async () => {
    calls.push({ name: "update" });
    return { data: { user: { id: "user" } }, error: null };
  });
  assert.equal(result, "ok");
  assert.deepEqual(calls.map((call) => call.name), [
    "reserve_password_setup", "update", "release_password_setup",
  ]);
  assert.deepEqual(calls[0].args, calls[2].args);
});

test("ineligible or unavailable reservation never starts the Auth update", async () => {
  for (const response of [
    { data: false, error: null },
    { data: null, error: { code: "unavailable" } },
  ]) {
    let updated = false;
    const result = await withPasswordSetupReservation(
      { rpc: async () => response },
      "user",
      async () => { updated = true; return { data: { user: { id: "user" } }, error: null }; }
    );
    assert.equal(result, response.error ? "unavailable" : "ineligible");
    assert.equal(updated, false);
  }
});

test("uncertain Auth outcomes retain the reservation", async () => {
  for (const update of [
    async () => ({ error: { code: "failure" } }),
    async () => { throw new Error("network failure"); },
    async () => ({ data: { user: null }, error: null }),
  ]) {
    const calls = [];
    const result = await withPasswordSetupReservation(
      { rpc: async (name) => { calls.push(name); return { data: true, error: null }; } },
      "user",
      update
    );
    assert.equal(result, "uncertain");
    assert.deepEqual(calls, ["reserve_password_setup"]);
  }
});

test("a failed release is not reported as successful setup", async () => {
  const result = await withPasswordSetupReservation(
    { rpc: async (name) => name === "reserve_password_setup"
      ? { data: true, error: null }
      : { data: null, error: { code: "unavailable" } } },
    "user",
    async () => ({ data: { user: { id: "user" } }, error: null })
  );
  assert.equal(result, "release_failed");
});
