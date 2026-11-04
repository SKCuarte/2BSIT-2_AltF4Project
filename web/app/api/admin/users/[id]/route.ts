import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { updateManagedUser } from "@/lib/user-management.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Admin user management configuration is incomplete.");
    return NextResponse.json(
      { error: "User management is temporarily unavailable." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid user changes." }, { status: 400 });
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
      { error: "Only an approved, active Admin or Superadmin may manage users." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const result = await updateManagedUser(admin, access.roleName, id, body);
  if (result.status === "invalid") {
    return NextResponse.json(
      { error: "Only valid name changes or a block-status change are allowed." },
      { status: 400 }
    );
  }
  if (result.status === "forbidden") {
    return NextResponse.json(
      { error: "You are not allowed to manage that account." },
      { status: 403 }
    );
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (result.status === "unavailable") {
    console.error("Admin user update failed:", {
      code: "code" in result ? result.code : "user_update_failed",
    });
    return NextResponse.json(
      { error: "Unable to update the user. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
