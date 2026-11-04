import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getProfileAccessIssue,
  MUST_CHANGE_PASSWORD_KEY,
} from "@/lib/auth-policy.mjs";
import {
  createSupabaseAdminClient,
  getSupabaseServerConfig,
} from "@/lib/supabase-admin";
import {
  REGISTRATION_CLAIM_COOKIE,
  verifyRegistrationClaim,
} from "@/lib/registration-claim.mjs";

export async function GET() {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Approval status configuration is incomplete.");
    return NextResponse.json(
      { error: "Unable to check approval status. Please try again." },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const registrationClaim = verifyRegistrationClaim(
    cookieStore.get(REGISTRATION_CLAIM_COOKIE)?.value,
    config.serviceRoleKey
  );
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

  const { data: authData, error: authError } = registrationClaim
    ? { data: { user: null }, error: null }
    : await supabase.auth.getUser();
  if (!registrationClaim && (authError || !authData.user)) {
    return NextResponse.json(
      { error: "Your registration session expired. Start registration again." },
      { status: 401 }
    );
  }
  const authUserId = registrationClaim ?? authData.user?.id;
  if (!authUserId) {
    return NextResponse.json(
      { error: "Your registration session expired. Start registration again." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .select("auth_user_id, is_blocked, approval_status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError) {
    console.error("Approval status profile lookup failed:", {
      code: profileError.code ?? "profile_lookup_failed",
    });
    return NextResponse.json(
      { error: "Unable to check approval status. Please try again." },
      { status: 503 }
    );
  }

  const accessIssue = getProfileAccessIssue(profile);
  if (accessIssue && accessIssue !== "pending") {
    if (
      accessIssue === "profile_missing" &&
      authData.user?.is_anonymous
    ) {
      return NextResponse.json(
        { error: "No pending registration is linked to this browser session." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "This account cannot continue. Contact the administrator." },
      { status: 403 }
    );
  }

  const { data: adminUser, error: adminUserError } =
    await admin.auth.admin.getUserById(authUserId);
  if (adminUserError || !adminUser.user) {
    console.error("Approval status Auth lookup failed:", {
      code: adminUserError?.status ?? "user_lookup_failed",
    });
    return NextResponse.json(
      { error: "Unable to check account setup. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: accessIssue === "pending" ? "pending" : "approved",
      needsPassword:
        adminUser.user.app_metadata?.[MUST_CHANGE_PASSWORD_KEY] === true,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
