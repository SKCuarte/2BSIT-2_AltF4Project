
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  createRegistrationClaim,
  REGISTRATION_CLAIM_COOKIE,
  REGISTRATION_CLAIM_MAX_AGE,
} from "@/lib/registration-claim.mjs";
import { getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Verification is temporarily unavailable." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid verification link." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("accessToken" in body) ||
    typeof body.accessToken !== "string" ||
    body.accessToken.length < 20 ||
    body.accessToken.length > 8192
  ) {
    return NextResponse.json(
      { error: "Invalid verification link." },
      { status: 400 }
    );
  }

  const auth = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Validate the access token directly with Supabase Auth.
  const { data, error } = await auth.auth.getUser(body.accessToken);
  const user = data.user;

  if (
    error ||
    !user ||
    user.is_anonymous ||
    !user.email_confirmed_at ||
    !user.email
  ) {
    return NextResponse.json(
      { error: "Invalid, expired, or already-used verification link." },
      { status: 401 }
    );
  }

  const admin = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .update({ email_verified_at: user.email_confirmed_at })
    .eq("auth_user_id", user.id)
    .eq("email", user.email.trim().toLowerCase())
    .eq("approval_status", "Pending")
    .select("auth_user_id")
    .maybeSingle();

if (profileError) {
  console.error(
    "EMAIL_VERIFICATION_DB_ERROR " +
      JSON.stringify({
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      })
  );

  return NextResponse.json(
    { error: "Verification could not be saved. Contact the administrator." },
    { status: 503 }
  );
}

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "No pending registration matches this verified email. Contact the administrator.",
      },
      { status: 409 }
    );
  }

  const response = NextResponse.json(
    { verified: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  response.cookies.set(
    REGISTRATION_CLAIM_COOKIE,
    createRegistrationClaim(user.id, config.serviceRoleKey),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REGISTRATION_CLAIM_MAX_AGE,
    }
  );

  return response;
}
