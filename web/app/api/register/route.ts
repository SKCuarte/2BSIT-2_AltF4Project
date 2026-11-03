
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (inviteError || !inviteData.user) {
    console.error(
      "Registration invitation failed:",
      inviteError?.message
    );

    const errorMessage = inviteError?.message.toLowerCase() ?? "";

    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests")
    ) {
      return NextResponse.json(
        {
          error:
            "Too many registration emails were requested. Please wait before trying again, or ask the administrator to configure custom SMTP in Supabase.",
        },
        { status: 429 }
      );
    }

    if (errorMessage.includes("already been registered")) {
      return NextResponse.json(
        {
          error:
            "This email already has an account. Try Continue with Google or contact the administrator for help.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to send the registration email. Check the email address and Supabase invitation settings.",
      },
      { status: 400 }
    );
  }

  const authUserId = inviteData.user.id;

  const { error: profileError } = await supabase
    .from("app_user")
    .upsert({
      auth_user_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      approval_status: "Pending",
    }, {
      onConflict: "auth_user_id",
      ignoreDuplicates: true,
    });

  if (profileError) {
    console.error("Registration app_user profile creation failed:", {
      code: profileError.code,
      message: profileError.message,
      hint: profileError.hint,
    });

    return NextResponse.json(
      {
        error:
          "The invitation was created, but the account profile could not be saved. Contact the administrator before trying again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message:
        "Registration submitted. Check your email for the invitation. Your account is pending approval.",
    },
    { status: 201 }
  );
}
