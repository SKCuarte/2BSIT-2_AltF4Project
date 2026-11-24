
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getProfileAccessIssue,
  MUST_CHANGE_PASSWORD_KEY,
} from "@/lib/auth-policy.mjs";
import { withPasswordSetupReservation } from "@/lib/password-setup-reservation.mjs";
import {
  createSupabaseAdminClient,
  getSupabaseServerConfig,
} from "@/lib/supabase-admin";
import {
  REGISTRATION_CLAIM_COOKIE,
  verifyRegistrationClaim,
} from "@/lib/registration-claim.mjs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid password update request." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("password" in body) ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "Enter a new password." },
      { status: 400 }
    );
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

  // Registration claim password setup
  if (registrationClaim) {
    const { data: registrationProfile, error: registrationProfileError } =
      await admin
        .from("app_user")
        .select("auth_user_id, is_blocked, approval_status, status")
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
        {
          error:
            "This account cannot set a password. Contact the administrator.",
        },
        { status: 409 }
      );
    }

    const registrationPasswordResult = await withPasswordSetupReservation(
      admin,
      registrationClaim,
      () =>
        admin.auth.admin.updateUserById(registrationClaim, {
          password,
          app_metadata: {
            ...registrationAuth.user.app_metadata,
            [MUST_CHANGE_PASSWORD_KEY]: false,
          },
        })
    );

    if (registrationPasswordResult !== "ok") {
      return NextResponse.json(
        {
          error:
            "Unable to complete password setup. Contact the administrator.",
        },
        {
          status:
            registrationPasswordResult === "ineligible" ? 403 : 503,
        }
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

  // Normal authenticated password setup
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Your session expired. Sign in again to continue." },
      { status: 401 }
    );
  }

  if (authData.user.is_anonymous === true) {
    return NextResponse.json(
      {
        error:
          "This older registration requires email verification. Contact the administrator.",
      },
      { status: 403 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .select(
      "auth_user_id, first_name, last_name, email, is_blocked, approval_status, status"
    )
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Password setup profile lookup failed:", {
      code: profileError.code,
    });

    return NextResponse.json(
      { error: "Unable to verify your account. Please try again." },
      { status: 503 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "This account is not eligible to set a password." },
      { status: 403 }
    );
  }

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

  if (!hasFirstLoginMarker) {
    return NextResponse.json(
      { error: "Password setup is not required for this account." },
      { status: 409 }
    );
  }

  // Keep both Auth updates inside the same reservation.
  const passwordResult = await withPasswordSetupReservation(
    admin,
    authData.user.id,
    async () => {
      const passwordUpdate = await supabase.auth.updateUser({ password });

      if (
        passwordUpdate.error ||
        passwordUpdate.data?.user?.id !== authData.user.id
      ) {
        return {
          error:
            passwordUpdate.error ??
            new Error("Unexpected password update response"),
        };
      }

      const markerUpdate = await admin.auth.admin.updateUserById(
        authData.user.id,
        {
          app_metadata: {
            ...adminUser.user.app_metadata,
            [MUST_CHANGE_PASSWORD_KEY]: false,
          },
        }
      );

      if (
        markerUpdate.error ||
        markerUpdate.data?.user?.id !== authData.user.id
      ) {
        return {
          error:
            markerUpdate.error ??
            new Error("Unexpected marker update response"),
        };
      }

      return {
        data: { user: { id: authData.user.id } },
        error: null,
      };
    }
  );

  if (passwordResult !== "ok") {
    return NextResponse.json(
      {
        error:
          "Unable to complete password setup. Contact the administrator.",
      },
      {
        status: passwordResult === "ineligible" ? 403 : 503,
      }
    );
  }

  // Clear the local session after successful password setup.
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "local",
  });

  if (signOutError) {
    console.error(
      "Password changed but the first-login session could not be cleared:",
      {
        authUserId: authData.user.id,
        code: signOutError.status ?? "session_sign_out_failed",
      }
    );

    return NextResponse.json(
      {
        error:
          "Your password was changed, but your session could not be cleared. Sign out and sign in again with your new password.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    redirect: "/login?notice=password_set",
  });
}
