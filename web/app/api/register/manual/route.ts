import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPendingManualRegistration } from "@/lib/manual-registration.mjs";
import {
  createRegistrationClaim,
  REGISTRATION_CLAIM_COOKIE,
  REGISTRATION_CLAIM_MAX_AGE,
} from "@/lib/registration-claim.mjs";

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
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase server configuration is missing.");
    return NextResponse.json(
      { error: "Registration service is not configured." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await createPendingManualRegistration(input, {
    findProfileByEmail: async (email) => {
      const { data, error } = await admin
        .from("app_user")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();
      return { profile: data, error };
    },
    createAuthUser: async (newUser) => {
      const { data, error } = await admin.auth.admin.createUser(newUser);
      return { user: data.user, error };
    },
    insertProfile: async (profile) => {
      const { data, error } = await admin
        .from("app_user")
        .insert(profile)
        .select("auth_user_id, approval_status")
        .single();
      return { profile: data, error };
    },
    deleteAuthUser: async (id) => {
      const { error } = await admin.auth.admin.deleteUser(id);
      return { error };
    },
    logError: (event, details) => console.error(event, details),
  });

  if (
    result.status !== 201 ||
    !("authUserId" in result.body) ||
    typeof result.body.authUserId !== "string"
  ) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const response = NextResponse.json(
    { approvalStatus: result.body.approvalStatus },
    { status: result.status }
  );
  response.cookies.set(
    REGISTRATION_CLAIM_COOKIE,
    createRegistrationClaim(result.body.authUserId, serviceRoleKey),
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
