
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getRecoveryCookieName,
  RECOVERY_MARKER_KEY,
  REGISTRATION_RECOVERY_TTL_SECONDS,
  registerEmail,
} from "@/lib/email-registration.mjs";

type RecoveryCapability = {
  authUserId: string;
  token: string;
};

function decodeRecoveryCapability(value: string): RecoveryCapability | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    );

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "authUserId" in parsed &&
      "token" in parsed &&
      typeof parsed.authUserId === "string" &&
      typeof parsed.token === "string"
    ) {
      return { authUserId: parsed.authUserId, token: parsed.token };
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid registration data." },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  const firstName =
    typeof data.firstName === "string"
      ? data.firstName.trim()
      : "";

  const lastName =
    typeof data.lastName === "string"
      ? data.lastName.trim()
      : "";

  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "First name, last name, and email are required." },
      { status: 400 }
    );
  }

  if (
    firstName.length > 80 ||
    lastName.length > 80 ||
    email.length > 254
  ) {
    return NextResponse.json(
      { error: "One or more fields are too long." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase server configuration is missing.");

    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const recoveryCookieName = getRecoveryCookieName(email);
  const rawCookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${recoveryCookieName}=`))
    ?.slice(recoveryCookieName.length + 1);
  let recovery: RecoveryCapability | null = null;
  if (rawCookieValue !== undefined) {
    try {
      recovery = decodeRecoveryCapability(decodeURIComponent(rawCookieValue)) ?? {
        authUserId: "",
        token: "",
      };
    } catch {
      recovery = { authUserId: "", token: "" };
    }
  }

  const result = await registerEmail(
    { email, firstName, lastName, recovery },
    {
      invite: async (targetEmail, metadata) => {
        const { data, error } =
          await supabase.auth.admin.inviteUserByEmail(targetEmail, {
            data: metadata,
          });
        return { user: data.user, error };
      },
      getAuthUserById: async (id) => {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        return { user: data.user, error };
      },
      setRecoveryMarker: async (id, marker) => {
        const { data: current, error: lookupError } =
          await supabase.auth.admin.getUserById(id);

        if (lookupError || !current.user) {
          return {
            error:
              lookupError ??
              new Error("Newly invited Auth user could not be retrieved."),
          };
        }

        const { error } = await supabase.auth.admin.updateUserById(id, {
          app_metadata: {
            ...current.user.app_metadata,
            [RECOVERY_MARKER_KEY]: marker,
          },
        });
        return { error };
      },
      findProfileByAuthUserId: async (id) => {
        const { data, error } = await supabase
          .from("app_user")
          .select("auth_user_id, approval_status")
          .eq("auth_user_id", id)
          .maybeSingle();
        return { profile: data, error };
      },
      insertProfile: async (profile) => {
        const { data, error } = await supabase
          .from("app_user")
          .insert(profile)
          .select("auth_user_id, approval_status")
          .single();
        return { profile: data, error };
      },
      deleteAuthUser: async (id) => {
        const { error } = await supabase.auth.admin.deleteUser(id);
        return { error };
      },
      logError: (event, details) => {
        console.error(event, details);
      },
    }
  );

  const response = NextResponse.json(result.body, { status: result.status });
  if ("recovery" in result && result.recovery) {
    response.cookies.set(
      recoveryCookieName,
      Buffer.from(JSON.stringify(result.recovery)).toString("base64url"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/register",
        maxAge: REGISTRATION_RECOVERY_TTL_SECONDS,
      }
    );
  } else if ("clearRecovery" in result && result.clearRecovery) {
    response.cookies.set(recoveryCookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/register",
      maxAge: 0,
    });
  }

  return response;
}
