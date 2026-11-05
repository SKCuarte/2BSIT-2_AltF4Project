import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function requireSuperadmin() {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Superadmin route configuration is incomplete.");
    return {
      ok: false as const,
      status: 503,
      error: "Superadmin actions are temporarily unavailable.",
    };
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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false as const,
      status: 401,
      error: "Sign in with an approved Superadmin account.",
    };
  }

  const admin = createSupabaseAdminClient();
  const access = await getAdminProvisioningAccess(admin, data.user.id);
  if (access.status === "unavailable") {
    return {
      ok: false as const,
      status: 503,
      error: "Unable to verify Superadmin access. Please try again.",
    };
  }
  if (access.status !== "allowed" || access.roleName !== "Superadmin") {
    return {
      ok: false as const,
      status: 403,
      error: "Only an approved, active Superadmin may perform this action.",
    };
  }

  return { ok: true as const, admin };
}
