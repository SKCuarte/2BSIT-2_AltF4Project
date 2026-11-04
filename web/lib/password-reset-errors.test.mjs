import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordResetRequestErrorMessage } from "./password-reset-errors.mjs";

test("explains Supabase's email quota and cooldown response", () => {
  assert.match(getPasswordResetRequestErrorMessage(429), /2 emails per hour/);
  assert.match(getPasswordResetRequestErrorMessage(429), /cooldown/);
});

test("explains email delivery and SMTP configuration failures", () => {
  const message = getPasswordResetRequestErrorMessage(500);
  assert.match(message, /Supabase could not send/);
  assert.match(message, /custom SMTP/);
});

test("does not reveal account existence for other failures", () => {
  const message = getPasswordResetRequestErrorMessage(400);
  assert.match(message, /try again later/);
  assert.doesNotMatch(message, /account exists/i);
});
