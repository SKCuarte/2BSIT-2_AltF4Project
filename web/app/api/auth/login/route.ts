import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getProfileAccessIssue,
  MUST_CHANGE_PASSWORD_KEY,
} from "@/lib/auth-policy.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (
    !email ||
    email.length > 254 ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 400 });
  }

  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Supabase authentication configuration is incomplete.");
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Email or password is incorrect. Check your credentials or try again later." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .select("auth_user_id, is_blocked, approval_status")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Sign-in profile lookup failed:", { code: profileError.code });
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Unable to verify your account. Please try again." },
      { status: 503 }
    );
  }

  const accessIssue = getProfileAccessIssue(profile);
  if (accessIssue) {
    await supabase.auth.signOut({ scope: "local" });
    const messages: Record<string, string> = {
      blocked: "This account is blocked. Contact the administrator for help.",
      pending: "Your account is pending approval.",
      rejected: "Your account was not approved. Contact the administrator for help.",
      profile_missing: "An application profile is not linked to this account. Contact the administrator.",
    };

    return NextResponse.json(
      { error: messages[accessIssue] },
      { status: 403 }
    );
  }

  return NextResponse.json({
    redirect:
      data.user.app_metadata?.[MUST_CHANGE_PASSWORD_KEY] === true
        ? "/set-password"
        : "/dashboard",
  });
}
