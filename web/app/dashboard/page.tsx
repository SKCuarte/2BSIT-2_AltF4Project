import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AdminUserProvisioningForm } from "@/components/admin-user-provisioning-form";
import { LogoutButton } from "@/components/logout-button";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export const instant = false;

export default async function DashboardPage() {
  let canCreateUsers = false;
  let adminCheckUnavailable = false;
  const config = getSupabaseServerConfig();

  if (config) {
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
      console.error("Dashboard Admin check could not verify the current user.");
      adminCheckUnavailable = true;
    } else {
      const access = await getAdminProvisioningAccess(
        createSupabaseAdminClient(),
        data.user.id
      );
      canCreateUsers = access.status === "allowed";
      adminCheckUnavailable = access.status === "unavailable";
    }
  } else {
    console.error("Dashboard Admin check configuration is incomplete.");
    adminCheckUnavailable = true;
  }

  return (
    <main className="registration-page">
      <section className="registration-card dashboard-card" aria-labelledby="dashboard-title">
        <h1 id="dashboard-title">Dashboard</h1>
        <p className="sub">You are signed in to Hope, Inc. ERP.</p>
        {adminCheckUnavailable && (
          <p className="msg" role="alert">
            Admin tools are temporarily unavailable. Refresh the page to try again.
          </p>
        )}
        {canCreateUsers && <AdminUserProvisioningForm />}
        <LogoutButton />
      </section>
    </main>
  );
}
