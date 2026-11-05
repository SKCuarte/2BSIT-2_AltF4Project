import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { LogoutButton } from "@/components/logout-button";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

export const instant = false;

const MODULE_TILES = [
  { code: "CUSTOMER", title: "Customer", blurb: "Customer records and account activity" },
  { code: "PRODUCT", title: "Product", blurb: "Catalog, inventory and pricing" },
  { code: "HR", title: "Human Resources", blurb: "Jobs, departments, employees and job history" },
  { code: "SALES", title: "Sales", blurb: "Sales records and transaction details" },
  { code: "REPORTS", title: "Reports", blurb: "Operational summaries and performance reports" },
];

const SAMPLE_STATS = [
  { label: "Total Customers", value: "4", note: "1 inactive" },
  { label: "Products", value: "386", note: "5 new this week" },
  { label: "Open Orders", value: "94", note: "8% vs last week" },
  { label: "Revenue (MTD)", value: "$84.2k", note: "18% vs last month" },
];

export default async function DashboardPage() {
  await connection();

  let canCreateUsers = false;
  let adminCheckUnavailable = false;
  let grantedModules = new Set<string>();
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

      const admin = createSupabaseAdminClient();
      const { data: account } = await admin
        .from("app_user")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();
      if (account) {
        const { data: rights } = await admin
          .from("v_user_effective_rights")
          .select("module_code")
          .eq("user_id", account.id)
          .eq("granted", true);
        grantedModules = new Set(
          (rights ?? []).map((row: { module_code: string }) => row.module_code)
        );
      }
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
          <section aria-label="Key figures" className="dash-stats">
            {SAMPLE_STATS.map((stat) => (
              <div className="dash-stat" key={stat.label}>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
                <small>{stat.note}</small>
              </div>
            ))}
          </section>
          <p className="um-access-note">These are sample figures.</p>
          <section aria-labelledby="dash-modules-title" className="dash-modules">
            <div className="dash-modules-heading">
              <h3 id="dash-modules-title">Modules</h3>
              <span>Available with your current rights</span>
            </div>
            <div className="dash-tiles">
              {canCreateUsers && (
                <Link className="dash-tile" href="/dashboard/users">
                  <span>
                    <strong>User Management</strong>
                    <small>Accounts, roles, approvals, and access</small>
                  </span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              )}
              {MODULE_TILES.filter((tile) => grantedModules.has(tile.code)).map(
                (tile) => (
                  <div className="dash-tile" key={tile.code}>
                    <span>
                      <strong>{tile.title}</strong>
                      <small>{tile.blurb}</small>
                    </span>
                  </div>
                )
              )}
            </div>
            {!canCreateUsers && grantedModules.size === 0 && (
              <p className="um-access-note">
                No modules are assigned to your account yet. Ask an administrator for access.
              </p>
            )}
          </section>
          <div className="um-dashboard-logout">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
