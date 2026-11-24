import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SuperadminApprovalPanel } from "@/components/superadmin-approval-panel";
import { UserManagement } from "@/components/user-management";
import { getDashboardAccess } from "@/lib/require-right";

export const instant = false;

export default async function UserManagementPage() {
  await connection();
  const access = await getDashboardAccess();
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "password") redirect("/set-password");
  if (access.status === "forbidden") redirect("/no-access");
  if (access.status !== "ok") {
    return <main className="registration-page"><section className="registration-card" role="alert">
      <h1>User Management unavailable</h1><p>Unable to verify administrator access. Try again later.</p>
    </section></main>;
  }
  if (access.role === "User") redirect("/no-access");
  return (
    <main className="um-page">
      <DashboardSidebar access={access} active="/dashboard/users" />
      <div className="um-main">
        <header className="um-topbar"><h1>User Management</h1><span className="um-role-badge">{access.role}</span></header>
        <div className="um-content">
          {access.role === "Superadmin" && <SuperadminApprovalPanel />}
          <UserManagement actorRole={access.role} />
        </div>
      </div>
    </main>
  );
}
