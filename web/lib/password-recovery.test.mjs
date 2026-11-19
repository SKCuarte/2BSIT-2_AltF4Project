import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordValidationError } from "./password-recovery.mjs";

test("requires a password between 8 and 128 characters", () => {
  assert.equal(getPasswordValidationError("", ""), "Enter a new password.");
  assert.equal(
    getPasswordValidationError("short", "short"),
    "Your password must be between 8 and 128 characters."
  );
  assert.equal(
    getPasswordValidationError("a".repeat(129), "a".repeat(129)),
    "Your password must be between 8 and 128 characters."
  );
});

test("requires matching password confirmation", () => {
  assert.equal(
    getPasswordValidationError("valid-pass", "different-pass"),
    "The passwords do not match."
  );
  assert.equal(getPasswordValidationError("valid-pass", "valid-pass"), null);
});
