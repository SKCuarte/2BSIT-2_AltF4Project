import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { loadDashboardAccess } from "@/lib/dashboard-access.mjs";
import { hasRight } from "@/lib/dashboard-policy.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function getDashboardAccess() {
  const config = getSupabaseServerConfig();
  if (!config) {
    console.error("Dashboard configuration is incomplete.");
    return { status: "unavailable" as const };
  }
  const store = await cookies();
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "unauthenticated" as const };
  if (data.user.app_metadata?.must_change_password === true) return { status: "password" as const };
  const admin = createSupabaseAdminClient();
  const access = await loadDashboardAccess(admin, data.user.id);
  if (access.status !== "ok") return access;
  return { ...access, admin };
}

export async function requireRight(module: string, action?: string) {
  const access = await getDashboardAccess();
  if (access.status !== "ok") return access;
  return hasRight(access, module, action) ? access : { status: "forbidden" as const };
}
