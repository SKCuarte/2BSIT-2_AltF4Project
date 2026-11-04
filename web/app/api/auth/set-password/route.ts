import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfileAccessIssue, MUST_CHANGE_PASSWORD_KEY } from "@/lib/auth-policy.mjs";
import { activateApprovedManualRegistration } from "@/lib/manual-registration.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";
import {
  REGISTRATION_CLAIM_COOKIE,
  verifyRegistrationClaim,
} from "@/lib/registration-claim.mjs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password update request." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("password" in body) ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
  }

  const password = body.password;
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Your new password must be between 8 and 128 characters." },
      { status: 400 }
    );
  }

  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Supabase authentication configuration is incomplete.");
    return NextResponse.json(
      { error: "Password setup is temporarily unavailable." },
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

  const registrationClaim = verifyRegistrationClaim(
    cookieStore.get(REGISTRATION_CLAIM_COOKIE)?.value,
    config.serviceRoleKey
  );
  const admin = createSupabaseAdminClient();

  if (registrationClaim) {
    const { data: registrationProfile, error: registrationProfileError } =
      await admin
        .from("app_user")
        .select("auth_user_id, is_blocked, approval_status")
        .eq("auth_user_id", registrationClaim)
        .maybeSingle();

    if (registrationProfileError) {
      console.error("Registration password profile lookup failed:", {
        code: registrationProfileError.code,
      });
      return NextResponse.json(
        { error: "Unable to verify your registration. Please try again." },
        { status: 503 }
      );
    }

    const registrationAccessIssue =
      getProfileAccessIssue(registrationProfile);
    if (registrationAccessIssue) {
      return NextResponse.json(
        {
          error:
            registrationAccessIssue === "pending"
              ? "Your account is still pending approval. You can set your password after approval."
              : "This registration cannot set a password. Contact the administrator.",
        },
        { status: 403 }
      );
    }

    const { data: registrationAuth, error: registrationAuthError } =
      await admin.auth.admin.getUserById(registrationClaim);
    if (
      registrationAuthError ||
      !registrationAuth.user ||
      registrationAuth.user.app_metadata?.[MUST_CHANGE_PASSWORD_KEY] !== true
    ) {
      console.error("Registration password Auth lookup failed:", {
        code: registrationAuthError?.status ?? "password_setup_not_required",
      });
      return NextResponse.json(
        { error: "This account cannot set a password. Contact the administrator." },
        { status: 409 }
      );
    }

    const { error: registrationPasswordError } =
      await admin.auth.admin.updateUserById(registrationClaim, {
        password,
        app_metadata: {
          ...registrationAuth.user.app_metadata,
          [MUST_CHANGE_PASSWORD_KEY]: false,
        },
      });
    if (registrationPasswordError) {
      console.error("Registration password update failed:", {
        authUserId: registrationClaim,
        code: registrationPasswordError.status ?? "password_update_failed",
      });
      return NextResponse.json(
        { error: "Unable to set your password. Please try again." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      redirect: "/login?notice=password_set",
    });
    response.cookies.set(REGISTRATION_CLAIM_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Your session expired. Sign in again to continue." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .select("auth_user_id, first_name, last_name, email, is_blocked, approval_status")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Password setup profile lookup failed:", { code: profileError.code });
    return NextResponse.json(
      { error: "Unable to verify your account. Please try again." },
      { status: 503 }
    );
  }

  const { data: adminUser, error: adminLookupError } =
    await admin.auth.admin.getUserById(authData.user.id);
  if (adminLookupError || !adminUser.user) {
    console.error("Password setup Auth lookup failed:", {
      code: adminLookupError?.status ?? "user_not_found",
    });
    return NextResponse.json(
      { error: "Unable to verify password setup. Please try again." },
      { status: 503 }
    );
  }

  const hasFirstLoginMarker =
    adminUser.user.app_metadata?.[MUST_CHANGE_PASSWORD_KEY] === true;
  const accessIssue = getProfileAccessIssue(profile);

  if (accessIssue) {
    if (accessIssue !== "pending") {
      await supabase.auth.signOut({ scope: "local" });
    }
    return NextResponse.json(
      {
        error:
          accessIssue === "pending"
            ? "Your account is still pending approval. You can set your password after approval."
            : "This account is not eligible to set a password. Contact the administrator.",
      },
      { status: 403 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "This account is not eligible to set a password." },
      { status: 403 }
    );
  }

  if (!hasFirstLoginMarker) {
    return NextResponse.json(
      { error: "Password setup is not required for this account." },
      { status: 409 }
    );
  }

  const isManualRegistration = authData.user.is_anonymous === true;
  if (isManualRegistration) {
    if (
      typeof profile.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
    ) {
      console.error("Approved manual registration has an invalid email.", {
        authUserId: authData.user.id,
      });
      return NextResponse.json(
        {
          error:
            "Unable to activate the approved email. Contact the administrator.",
        },
        { status: 503 }
      );
    }

    const activation = await activateApprovedManualRegistration(
      {
        authUserId: authData.user.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        password,
      },
      {
        createUser: async (newUser) => {
          const { data, error } = await admin.auth.admin.createUser(newUser);
          return { user: data.user, error };
        },
        moveProfile: async (oldId, newId) => {
          const { data, error } = await admin
            .from("app_user")
            .update({ auth_user_id: newId })
            .eq("auth_user_id", oldId)
            .ilike("approval_status", "approved")
            .select("auth_user_id")
            .maybeSingle();
          return { moved: Boolean(data), error };
        },
        deleteAuthUser: async (id) => {
          const { error } = await admin.auth.admin.deleteUser(id);
          return { error };
        },
        logError: (event, details) => {
          console.error(event, {
            authUserId: authData.user.id,
            ...details,
          });
        },
      }
    );
    if (!activation.ok) {
      return NextResponse.json(
        { error: activation.error },
        { status: activation.status }
      );
    }
  } else {
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      return NextResponse.json(
        { error: "Unable to update your password. Check the password and try again." },
        { status: 400 }
      );
    }

    const { error: markerError } = await admin.auth.admin.updateUserById(
      authData.user.id,
      {
        app_metadata: {
          ...adminUser.user.app_metadata,
          [MUST_CHANGE_PASSWORD_KEY]: false,
        },
      }
    );

    if (markerError) {
      console.error("Password changed but first-login marker could not be cleared:", {
        authUserId: authData.user.id,
        code: markerError.status ?? "marker_update_failed",
      });
      return NextResponse.json(
        {
          error:
            "Your password was changed, but account setup could not be completed. Retry password setup or contact the administrator.",
        },
        { status: 503 }
      );
    }
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("Password changed but the first-login session could not be cleared:", {
      authUserId: authData.user.id,
      code: signOutError.status ?? "session_sign_out_failed",
    });
    return NextResponse.json(
      {
        error:
          "Your password was changed, but your session could not be cleared. Sign out and sign in again with your new password.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ redirect: "/login?notice=password_set" });
}
