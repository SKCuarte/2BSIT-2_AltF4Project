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
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid Google registration request." },
      { status: 400 }
    );
  }

  if (
    typeof requestBody !== "object" ||
    requestBody === null ||
    Array.isArray(requestBody) ||
    !("intent" in requestBody) ||
    (requestBody.intent !== "register" && requestBody.intent !== "sign_in")
  ) {
    return NextResponse.json(
      { error: "A valid Google authentication intent is required." },
      { status: 400 }
    );
  }

  const intent = requestBody.intent;
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existingProfile, error: lookupError } = await adminClient
    .from("app_user")
    .select("approval_status")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Google app_user profile lookup failed:", {
      code: lookupError.code,
      message: lookupError.message,
      hint: lookupError.hint,
    });
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
      },
      { status: 200 }
    );
  }

  if (intent !== "register") {
    return NextResponse.json(
      {
        error:
          "No application profile is linked to this Google account. Start registration or contact the administrator.",
      },
      { status: 404 }
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

  const { data: newProfile, error: insertError } = await adminClient
    .from("app_user")
    .insert({
      auth_user_id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      approval_status: "Pending",
    })
    .select("approval_status")
    .single();

  if (insertError) {
    console.error("Google app_user profile creation failed:", {
      code: insertError.code,
      message: insertError.message,
      hint: insertError.hint,
    });

    if (insertError.code === "23505") {
      const { data: concurrentProfile, error: concurrentLookupError } =
        await adminClient
          .from("app_user")
          .select("approval_status")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

      if (concurrentLookupError) {
        console.error("Google app_user conflict lookup failed:", {
          code: concurrentLookupError.code,
          message: concurrentLookupError.message,
          hint: concurrentLookupError.hint,
        });
        return NextResponse.json(
          { error: "Unable to check the registration profile." },
          { status: 500 }
        );
      }

      if (concurrentProfile) {
        return NextResponse.json(
          {
            created: false,
            approvalStatus: concurrentProfile.approval_status,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          error:
            "This email is already linked to another account. Contact the administrator for help.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to save the Google registration profile. Please retry." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      created: true,
      approvalStatus: newProfile.approval_status,
    },
    { status: 201 }
  );
}
