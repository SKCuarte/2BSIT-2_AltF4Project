import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { UserManagement } from "@/components/user-management";
import { hasRight, MODULES } from "@/lib/dashboard-policy.mjs";
import { loadDashboardStats } from "@/lib/dashboard-stats.mjs";
import { getDashboardAccess } from "@/lib/require-right";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const access = await getDashboardAccess();
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "password") redirect("/set-password");
  if (access.status === "forbidden") redirect("/no-access");
  if (access.status !== "ok") {
    return <main className="registration-page"><section className="registration-card" role="alert">
      <h1>Dashboard unavailable</h1><p>Unable to verify your access. Please try again later.</p>
    </section></main>;
  }

  const stats = await loadDashboardStats(access.admin, access);
  return (
    <main className="um-page">
      <DashboardSidebar access={access} active="/dashboard" />
      <div className="um-main">
        <header className="um-topbar"><h1>Dashboard</h1><span className="um-role-badge">{access.role}</span></header>
        <div className="um-content um-dashboard-content">
          <section aria-labelledby="dashboard-welcome" className="um-welcome">
            <p className="um-eyebrow">HOPE, INC. ERP</p>
            <h2 id="dashboard-welcome">Welcome to your dashboard</h2>
            <p>Your workspace for managing Hope, Inc. ERP.</p>
          </section>
          <section aria-labelledby="quick-actions">
            <h2 id="quick-actions">Quick Actions</h2>
            <div className="dashboard-tiles">
              {MODULES.map((module, index) => {
                const allowed = hasRight(access, module.code);
                const content = <><strong>{module.name}</strong>
                  {allowed && module.stat && <span>{module.stat}: {stats[index]}</span>}
                  <small>{allowed ? "Open module" : "No access"}</small></>;
                return allowed
                  ? <Link className="dashboard-tile" key={module.code} href={`/dashboard/${module.slug}`}>{content}</Link>
                  : <div className="dashboard-tile dashboard-tile-disabled" key={module.code} aria-disabled="true">{content}</div>;
              })}
            </div>
          </section>
          {(access.role === "Admin" || access.role === "Superadmin") && <UserManagement actorRole={access.role} />}
        </div>
      </div>
    </main>
  );
}
