
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPendingManualRegistration } from "@/lib/manual-registration.mjs";
import { REGISTRATION_CLAIM_COOKIE } from "@/lib/registration-claim.mjs";
import { findActiveRoleId } from "@/lib/role-lookup.mjs";
import { registrationEmailRedirect } from "@/lib/email-verification.mjs";

function parseRegistration(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("firstName" in value) ||
    !("lastName" in value) ||
    !("email" in value) ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string"
  ) {
    return null;
  }

  const firstName = value.firstName.trim();
  const lastName = value.lastName.trim();
  const email = value.email.trim().toLowerCase();
  const hasControlCharacters = /[\u0000-\u001f\u007f]/;

  if (
    !firstName ||
    firstName.length > 80 ||
    hasControlCharacters.test(firstName) ||
    !lastName ||
    lastName.length > 80 ||
    hasControlCharacters.test(lastName) ||
    email.length > 254 ||
    !/^[a-z0-9._%+-]+@gmail\.com$/.test(email)
  ) {
    return null;
  }

  return { firstName, lastName, email };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid registration request." },
      { status: 400 }
    );
  }

  const input = parseRegistration(body);

  if (!input) {
    return NextResponse.json(
      { error: "Enter a valid first name, last name, and email address." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !appBaseUrl) {
    console.error("Supabase server configuration is missing.");

    return NextResponse.json(
      { error: "Registration service is not configured." },
      { status: 503 }
    );
  }

  const redirectTo = registrationEmailRedirect(appBaseUrl);

  if (!redirectTo) {
    console.error(
      "APP_BASE_URL must be an HTTPS origin or a local HTTP origin."
    );

    return NextResponse.json(
      { error: "Registration service is not configured." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await createPendingManualRegistration(input, {
    findUserRoleId: () => findActiveRoleId(admin, "User"),

    findProfileByEmail: async (email: string) => {
      const { data, error } = await admin
        .from("app_user")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      return { profile: data, error };
    },

    inviteAuthUser: async (
      email: string,
      metadata: { first_name: string; last_name: string }
    ) => {
      try {
        const { data, error } =
          await admin.auth.admin.inviteUserByEmail(email, {
            data: metadata,
            redirectTo,
          });

        if (error) {
  const errorObject = error as unknown as Record<string, unknown>;

  console.error(
    "SUPABASE INVITATION ERROR: " +
      JSON.stringify({
        name: errorObject?.name,
        message: errorObject?.message,
        status: errorObject?.status,
        code: errorObject?.code,
        details: errorObject?.details,
        hint: errorObject?.hint,
        raw: String(error),
        properties:
          error && typeof error === "object"
            ? Object.getOwnPropertyNames(error)
            : [],
        stack: error instanceof Error ? error.stack : undefined,
      })
  );
}

        return { user: data.user, error };
      } catch (error) {
        console.error("SUPABASE INVITATION THREW:", error);
        throw error;
      }
    },

    updateAuthUser: async (
      id: string,
      attributes: { app_metadata: Record<string, boolean> }
    ) => {
      const { data, error } =
        await admin.auth.admin.updateUserById(id, attributes);

      return { user: data.user, error };
    },

    insertProfile: async (profile: {
      auth_user_id: string;
      first_name: string;
      last_name: string;
      email: string;
      role_id: string | number;
      approval_status: "Pending";
      is_blocked: boolean;
    }) => {
      const { data, error } = await admin
        .from("app_user")
        .insert(profile)
        .select("auth_user_id, approval_status")
        .single();

      return { profile: data, error };
    },

    deleteAuthUser: async (id: string) => {
      const { error } = await admin.auth.admin.deleteUser(id);

      return { error };
    },

    logError: (event: string, details: unknown) =>
      console.error(event, details),
  });

  if (
    result.status !== 201 ||
    !("authUserId" in result.body) ||
    typeof result.body.authUserId !== "string"
  ) {
    return NextResponse.json(result.body, {
      status: result.status,
    });
  }

  const response = NextResponse.json(
    { approvalStatus: result.body.approvalStatus },
    { status: result.status }
  );

  response.cookies.set(REGISTRATION_CLAIM_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
