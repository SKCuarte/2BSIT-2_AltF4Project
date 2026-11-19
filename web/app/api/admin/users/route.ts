import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAdminProvisioningAccess,
  provisionRegularUser,
  validateProvisioningInput,
} from "@/lib/admin-provisioning.mjs";
import { listManagedUsers } from "@/lib/user-management.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Admin user management configuration is incomplete.");
    return NextResponse.json(
      { error: "User management is temporarily unavailable." },
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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Sign in with an approved Admin or Superadmin account." },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  const access = await getAdminProvisioningAccess(admin, authData.user.id);
  if (access.status === "unavailable") {
    return NextResponse.json(
      { error: "Unable to verify administrator access. Please try again." },
      { status: 503 }
    );
  }
  if (access.status !== "allowed") {
    return NextResponse.json(
      { error: "Only an approved, active Admin or Superadmin may view users." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const result = await listManagedUsers(admin, access.roleName, {
    search: url.searchParams.get("search") ?? "",
    role: url.searchParams.get("role") ?? "",
    status: url.searchParams.get("status") ?? "",
    page: url.searchParams.get("page") ?? "1",
    pageSize: url.searchParams.get("pageSize") ?? "25",
  });
  if (result.status === "invalid") {
    return NextResponse.json(
      { error: "Invalid user search or filter." },
      { status: 400 }
    );
  }
  if (result.status === "forbidden") {
    return NextResponse.json(
      { error: "You cannot view users in that role." },
      { status: 403 }
    );
  }
  if (result.status === "unavailable") {
    console.error("Admin user list query failed:", { code: result.code });
    return NextResponse.json(
      { error: "Unable to load users. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}

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
      { error: "Sign in with an approved administrator account to create users." },
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
      { error: "Only an approved, active administrator may create user accounts." },
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
