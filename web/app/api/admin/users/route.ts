import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAdminProvisioningAccess,
  provisionRegularUser,
  validateProvisioningInput,
} from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Admin user provisioning configuration is incomplete.");
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
  }

  const input = validateProvisioningInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Enter a valid first name, last name, and email address." },
      { status: 400 }
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

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Sign in with an approved Admin account to create users." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  const access = await getAdminProvisioningAccess(admin, authData.user.id);
  if (access.status === "unavailable") {
    return NextResponse.json(
      { error: "Unable to verify Admin access. Please try again." },
      { status: 503 }
    );
  }
  if (access.status !== "allowed") {
    return NextResponse.json(
      { error: "Only an approved, active Admin may create user accounts." },
      { status: 403 }
    );
  }

  const result = await provisionRegularUser(admin, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      approvalStatus: "Pending",
      temporaryPassword: result.temporaryPassword,
    },
    { status: 201 }
  );
}
