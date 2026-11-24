
export async function verifyRegistrationEmail(fragment, submitVerification) {
  const params = new URLSearchParams(
    fragment.startsWith("#") ? fragment.slice(1) : fragment
  );

  const accessToken = params.get("access_token");

  if (
    !accessToken ||
    accessToken.length > 8192 ||
    params.get("type") !== "invite"
  ) {
    return {
      ok: false,
      error:
        "This verification link is invalid, expired, or already used. Contact the administrator for a new invitation.",
    };
  }

  const response = await submitVerification(accessToken);

  if (response.status === 401 || response.status === 400) {
    return {
      ok: false,
      error:
        "This verification link is invalid, expired, or already used. Contact the administrator for a new invitation.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: "Email verification could not be saved. Contact the administrator.",
    };
  }

  return { ok: true };
}

export function registrationEmailRedirect(baseUrl) {
  if (!baseUrl) return null;

  try {
    const base = new URL(baseUrl);

    if (
      base.username ||
      base.password ||
      base.pathname !== "/" ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" &&
        !(
          base.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
        ))
    ) {
      return null;
    }

    return new URL("/auth/verify-email", base).toString();
  } catch {
    return null;
  }
}
