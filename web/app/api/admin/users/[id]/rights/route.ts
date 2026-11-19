import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { loadManagedUserRights } from "@/lib/rights-management.mjs";
import { getRightsWritePolicyDecision } from "@/lib/rights-management-policy.mjs";
import {
  saveManagedUserRights,
  validateRightsSelection,
} from "@/lib/rights-management-write.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Rights management configuration is incomplete.");
    return NextResponse.json({ error: "Rights management is temporarily unavailable." }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Sign in with an approved Admin or Superadmin account." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const access = await getAdminProvisioningAccess(admin, authData.user);
  if (access.status === "unavailable") {
    return NextResponse.json({ error: "Unable to verify administrator access." }, { status: 503 });
  }
  if (access.status !== "allowed") {
    return NextResponse.json({ error: "You are not allowed to view rights." }, { status: 403 });
  }

  const { id } = await params;
  const result = await loadManagedUserRights(admin, access.roleName, id);
  if (result.status === "invalid") {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (result.status === "forbidden" || result.status === "protected") {
    return NextResponse.json({ error: "You are not allowed to manage that account." }, { status: 403 });
  }
  if (result.status !== "ok" || !("modules" in result)) {
    console.error("Rights management query failed:", {
      code: ("code" in result && result.code) || "rights_query_failed",
    });
    return NextResponse.json({ error: "Unable to load permissions. Please try again." }, { status: 503 });
  }

  return NextResponse.json({ modules: result.modules }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Rights management configuration is incomplete.");
    return NextResponse.json({ error: "Rights management is temporarily unavailable." }, { status: 503 });
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
    return NextResponse.json({ error: "Sign in with an approved Admin or Superadmin account." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const access = await getAdminProvisioningAccess(admin, authData.user);
  if (access.status === "unavailable") {
    return NextResponse.json({ error: "Unable to verify administrator access." }, { status: 503 });
  }
  if (access.status !== "allowed") {
    return NextResponse.json({ error: "You are not allowed to manage rights." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid rights selection." }, { status: 400 });
  }
  const selection = validateRightsSelection(body);
  if (selection.status !== "ok") {
    return NextResponse.json({ error: "Invalid rights selection." }, { status: 400 });
  }

  const { id: targetId } = await params;
  const policy = getRightsWritePolicyDecision({
    actorRole: access.roleName,
    targetId,
    rightIds: selection.rightIds,
  });
  if (!policy.allowed) {
    return NextResponse.json(
      {
        error: "Rights changes are disabled pending Project Owner authorization-policy approval.",
        code: policy.code,
      },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: actor, error: actorError } = await admin
    .from("app_user")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (actorError || !actor) {
    console.error("Rights change actor lookup failed:", {
      code: actorError?.code ?? "actor_not_found",
    });
    return NextResponse.json({ error: "Unable to verify the rights change actor." }, { status: 503 });
  }

  const result = await saveManagedUserRights(
    admin,
    String(actor.id),
    targetId,
    selection.rightIds
  );
  if (result.status !== "ok") {
    console.error("Rights change transaction failed:", { code: result.code });
    return NextResponse.json({ error: "Unable to save permissions. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, changedCount: result.changedCount });
}
