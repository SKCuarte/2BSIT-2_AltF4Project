import assert from "node:assert/strict";
import test from "node:test";
import {
  createRegistrationClaim,
  verifyRegistrationClaim,
} from "./registration-claim.mjs";

const userId = "df85bfc1-0dc0-4d81-9a96-546a5bc440ae";
const secret = "test-only-signing-secret";

test("registration claims verify for their user", () => {
  const token = createRegistrationClaim(userId, secret, 1_800_000_000_000);
  assert.equal(verifyRegistrationClaim(token, secret, 1_800_000_000_000), userId);
});

test("registration claims reject tampering, expiration, and a different secret", () => {
  const now = 1_800_000_000_000;
  const token = createRegistrationClaim(userId, secret, now);
  const [id, expiry, nonce] = token.split(".");

  assert.equal(
    verifyRegistrationClaim(`${id}.${expiry}.${nonce}.bad`, secret, now),
    null
  );
  assert.equal(verifyRegistrationClaim(token, "another-secret", now), null);
  assert.equal(verifyRegistrationClaim(token, secret, now + 91 * 86400_000), null);
});
