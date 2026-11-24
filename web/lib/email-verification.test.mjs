
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { NextResponse } from "next/server.js";
import ts from "typescript";
import * as claim from "./registration-claim.mjs";
import {
  registrationEmailRedirect,
  verifyRegistrationEmail,
} from "./email-verification.mjs";

test("verification redirect accepts only an explicit safe application origin", () => {
  assert.equal(
    registrationEmailRedirect("https://erp.example.invalid"),
    "https://erp.example.invalid/auth/verify-email"
  );

  assert.equal(
    registrationEmailRedirect("http://localhost:3000"),
    "http://localhost:3000/auth/verify-email"
  );

  for (const value of [
    "",
    "http://erp.example.invalid",
    "https://user:pass@erp.example.invalid",
    "https://erp.example.invalid/path",
  ]) {
    assert.equal(registrationEmailRedirect(value), null);
  }
});

test("valid invitation access token is sent once to the verification endpoint", async () => {
  const calls = [];

  const result = await verifyRegistrationEmail(
    "#access_token=valid-access-token&type=invite",
    async (token) => {
      calls.push(token);
      return { ok: true };
    }
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, ["valid-access-token"]);
});

test("invalid, expired, used, and wrong-type invitations cannot save verification", async () => {
  for (const fragment of [
    "",
    "#access_token=x&type=recovery",
    "#access_token=expired&type=invite",
    "#access_token=used&type=invite",
    "#type=invite",
  ]) {
    let saved = false;

    const result = await verifyRegistrationEmail(fragment, async () => {
      saved = true;
      return { status: 401, ok: false };
    });

    assert.equal(result.ok, false);
    assert.match(result.error, /invalid, expired, or already used/);
    assert.equal(saved, fragment.includes("access_token=") && fragment.includes("type=invite"));
  }
});

test("failed persistence does not report success", async () => {
  const result = await verifyRegistrationEmail(
    "#access_token=valid-access-token&type=invite",
    async () => ({ status: 503, ok: false })
  );

  assert.equal(result.ok, false);
});

test("verification endpoint validates a Supabase access token and matching pending email", async () => {
  const require = createRequire(import.meta.url);
  const filename = fileURLToPath(
    new URL("../app/api/register/verified/route.ts", import.meta.url)
  );

  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  const id = "00000000-0000-4000-8000-000000000101";
  const accessToken = "valid-access-token-for-test";

  let validToken = true;
  let saved = 0;
  let matches = true;
  let confirmed = true;
  let saveError = null;

  const filters = [];
  const auth = {
    getUser: async (token) => {
      assert.equal(token, accessToken);

      if (!validToken) {
        return {
          data: { user: null },
          error: { code: "invalid_token" },
        };
      }

      return {
        data: {
          user: {
            id,
            email: "owner@example.com",
            is_anonymous: false,
            email_confirmed_at: confirmed
              ? "2026-01-01T00:00:00Z"
              : null,
          },
        },
        error: null,
      };
    },
  };

  const admin = {
    from: () => {
      const query = {
        update: () => query,

        eq: (column, value) => {
          filters.push([column, value]);
          return query;
        },

        select: () => query,

        maybeSingle: async () => {
          if (matches && !saveError) saved += 1;

          return {
            data: matches && !saveError ? { auth_user_id: id } : null,
            error: saveError,
          };
        },
      };

      return query;
    },
  };

  const imports = {
    "@supabase/supabase-js": {
      createClient: (_url, key) => (key === "anon" ? { auth: { getUser: auth.getUser } } : admin),
    },

    "next/server": { NextResponse },
    "@/lib/registration-claim.mjs": claim,

    "@/lib/supabase-admin": {
      getSupabaseServerConfig: () => ({
        url: "http://localhost",
        anonKey: "anon",
        serviceRoleKey: "secret",
      }),
    },
  };

  const loaded = { exports: {} };

  new Function("require", "module", "exports", js)(
    (name) =>
      Object.hasOwn(imports, name) ? imports[name] : require(name),
    loaded,
    loaded.exports
  );

  const request = (token) =>
    new Request("http://localhost/api/register/verified", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
    });

  // Valid confirmed user and matching pending profile.
  let response = await loaded.exports.POST(request(accessToken));

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("set-cookie"),
    /verified_registration_claim=/
  );

  assert.deepEqual(filters, [
    ["auth_user_id", id],
    ["email", "owner@example.com"],
    ["approval_status", "Pending"],
  ]);

  assert.equal(saved, 1);

  // Invalid access token.
  validToken = false;
  response = await loaded.exports.POST(request(accessToken));

  assert.equal(response.status, 401);
  assert.equal(saved, 1);

  // Invalid request format.
  response = await loaded.exports.POST(request("short"));

  assert.equal(response.status, 400);

  // No matching pending registration.
  validToken = true;
  matches = false;

  response = await loaded.exports.POST(request(accessToken));

  assert.equal(response.status, 409);
  assert.equal(response.headers.get("set-cookie"), null);

  // Unconfirmed email.
  matches = true;
  confirmed = false;

  response = await loaded.exports.POST(request(accessToken));

  assert.equal(response.status, 401);
  assert.equal(saved, 1);

  // Database update failure.
  confirmed = true;
  saveError = { code: "database_error" };

  response = await loaded.exports.POST(request(accessToken));

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(saved, 1);
});
