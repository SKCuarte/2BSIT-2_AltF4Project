import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const REGISTRATION_CLAIM_COOKIE = "registration_claim";
export const REGISTRATION_CLAIM_MAX_AGE = 60 * 60 * 24 * 90;

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createRegistrationClaim(authUserId, secret, now = Date.now()) {
  if (!secret) throw new Error("Registration claim signing secret is missing.");

  const expiresAt = Math.floor(now / 1000) + REGISTRATION_CLAIM_MAX_AGE;
  const payload = `${authUserId}.${expiresAt}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyRegistrationClaim(token, secret, now = Date.now()) {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [authUserId, expiresAtValue, nonce, signature] = parts;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authUserId
    ) ||
    !/^\d+$/.test(expiresAtValue) ||
    !/^[A-Za-z0-9_-]{22}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return null;
  }

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return null;
  }

  const payload = `${authUserId}.${expiresAtValue}.${nonce}`;
  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  return authUserId;
}
