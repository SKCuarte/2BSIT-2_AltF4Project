import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SuperadminApprovalPanel } from "@/components/superadmin-approval-panel";
import { UserManagement } from "@/components/user-management";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export const instant = false;

export default async function UserManagementPage() {
  await connection();

  const config = getSupabaseServerConfig();
  if (!config) {
    return (
      <main className="registration-page">
        <section className="registration-card" role="alert">
          <h1>User Management unavailable</h1>
          <p className="sub">Server configuration is incomplete. Contact your administrator.</p>
        </section>
      </main>
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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const access = await getAdminProvisioningAccess(
    createSupabaseAdminClient(),
    data.user.id
  );
  if (access.status === "unavailable") {
    return (
      <main className="registration-page">
        <section className="registration-card" role="alert">
          <h1>User Management unavailable</h1>
          <p className="sub">Unable to verify administrator access. Try again later.</p>
        </section>
      </main>
    );
  }
  if (access.status !== "allowed") redirect("/dashboard");

  return (
    <main className="um-page">
      <aside className="um-sidebar">
        <Link className="um-brand" href="/dashboard">
          <span aria-hidden="true" className="um-brand-mark">H</span>
          <span>Hope, Inc. ERP</span>
        </Link>
        <nav aria-label="Main navigation" className="um-side-nav">
          <Link className="um-side-link" href="/dashboard">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" />
            </svg>
            Dashboard
          </Link>
          <Link
            aria-current="page"
            className="um-side-link um-side-link-active"
            href="/dashboard/users"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6" />
            </svg>
            User Management
          </Link>
        </nav>
        <div className="um-sidebar-account">
          <span aria-hidden="true" className="um-avatar">H</span>
          <span className="um-account-label">
            <strong>Administrator</strong>
            <small>{access.roleName}</small>
          </span>
        </div>
      </aside>
      <div className="um-main">
        <header className="um-topbar">
          <h1>User Management</h1>
          <span className="um-role-badge">{access.roleName}</span>
        </header>
        <div className="um-content">
          {access.roleName === "Superadmin" && <SuperadminApprovalPanel />}
          <UserManagement actorRole={access.roleName} />
        </div>
      </div>
    </main>
  );
}
