import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getNameParts(user: {
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  const firstName =
    typeof metadata.given_name === "string"
      ? metadata.given_name.trim()
      : nameParts[0] ?? "";
  const lastName =
    typeof metadata.family_name === "string"
      ? metadata.family_name.trim()
      : nameParts.slice(1).join(" ");

  return { firstName, lastName };
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !anonKey || !secretKey) {
    console.error("Supabase server configuration is missing.");
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } =
    await authClient.auth.getUser(accessToken);

  if (authError || !authData.user || authData.user.is_anonymous) {
    return NextResponse.json(
      { error: "Google authorization could not be verified." },
      { status: 401 }
    );
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existingProfile, error: lookupError } = await adminClient
    .from("app_user")
    .select("id, approval_status, is_blocked")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Profile lookup failed:", lookupError.message);
    return NextResponse.json(
      { error: "Unable to check the registration profile." },
      { status: 500 }
    );
  }

  if (existingProfile) {
    return NextResponse.json(
      {
        created: false,
        approvalStatus: existingProfile.approval_status,
        blocked: existingProfile.is_blocked,
      },
      { status: 200 }
    );
  }

  const email = authData.user.email?.trim().toLowerCase();
  const { firstName, lastName } = getNameParts(authData.user);

  if (!email || !firstName || !lastName) {
    return NextResponse.json(
      {
        error:
          "Google did not provide your first name, last name, and email. Allow profile sharing and try again.",
      },
      { status: 400 }
    );
  }

  const { error: insertError } = await adminClient.from("app_user").upsert(
    {
      auth_user_id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      approval_status: "Pending",
    },
    { onConflict: "auth_user_id", ignoreDuplicates: true }
  );

  if (insertError) {
    console.error("Google registration app_user creation failed:", insertError.message);
    const { error: cleanupError } =
      await adminClient.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      console.error("Unlinked Google Auth user cleanup failed:", cleanupError.message);
    }
    return NextResponse.json(
      { error: "Unable to save the Google registration profile. Please retry." },
      { status: 500 }
    );
  }

  const { data: appUser, error: profileError } = await adminClient
    .from("app_user")
    .select("approval_status, is_blocked")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profileError || !appUser) {
    console.error("Google registration app_user lookup failed:", profileError?.message);
    const { error: cleanupError } =
      await adminClient.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      console.error("Unlinked Google Auth user cleanup failed:", cleanupError.message);
    }
    return NextResponse.json(
      { error: "Registration profile is not ready. Please retry." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      created: true,
      approvalStatus: appUser.approval_status,
      blocked: appUser.is_blocked,
    },
    { status: 201 }
  );
}
