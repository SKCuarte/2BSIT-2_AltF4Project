import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { LogoutButton } from "@/components/logout-button";
import { UserManagement } from "@/components/user-management";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export const instant = false;

export default async function DashboardPage() {
  await connection();

  let canCreateUsers = false;
  let adminCheckUnavailable = false;
  let actorRole: "User" | "Admin" | "Superadmin" | "Account" = "Account";
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
      if (access.roleName) actorRole = access.roleName;
      adminCheckUnavailable = access.status === "unavailable";
    }
  } else {
    console.error("Dashboard Admin check configuration is incomplete.");
    adminCheckUnavailable = true;
  }

  return (
    <main className="um-page">
      <aside className="um-sidebar">
        <Link className="um-brand" href="/dashboard">
          <span aria-hidden="true" className="um-brand-mark">H</span>
          <span>Hope, Inc. ERP</span>
        </Link>
        <nav aria-label="Main navigation" className="um-side-nav">
          <Link
            aria-current="page"
            className="um-side-link um-side-link-active"
            href="/dashboard"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" />
            </svg>
            Dashboard
          </Link>
          {canCreateUsers && (
            <Link className="um-side-link" href="/dashboard/users">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6" />
              </svg>
              User Management
            </Link>
          )}
        </nav>
        <div className="um-sidebar-account">
          <span aria-hidden="true" className="um-avatar">H</span>
          <span className="um-account-label">
            <strong>Hope, Inc. Account</strong>
            <small>{actorRole}</small>
          </span>
        </div>
      </aside>
      <div className="um-main">
        <header className="um-topbar">
          <h1 id="dashboard-title">Dashboard</h1>
          <span className="um-role-badge">{actorRole}</span>
        </header>
        <div className="um-content um-dashboard-content">
          <section aria-labelledby="dashboard-welcome" className="um-welcome">
            <p className="um-eyebrow">HOPE, INC. ERP</p>
            <h2 id="dashboard-welcome">Welcome to your dashboard</h2>
            <p>Your workspace for managing Hope, Inc. ERP.</p>
          </section>
          {adminCheckUnavailable && (
            <p className="msg" role="alert">
              Admin tools are temporarily unavailable. Refresh the page to try again.
            </p>
          )}
          {!canCreateUsers && !adminCheckUnavailable && (
            <p className="um-access-note">
              Your verified role is {actorRole}. User Management is available only to
              approved Admins and Superadmins. If you believe your role is incorrect,
              contact an authorized Superadmin.
            </p>
          )}
          {canCreateUsers &&
            (actorRole === "Admin" || actorRole === "Superadmin") && (
              <UserManagement actorRole={actorRole} />
          )}
          <div className="um-dashboard-logout">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
