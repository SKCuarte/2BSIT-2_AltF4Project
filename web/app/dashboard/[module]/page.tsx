import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { MODULES } from "@/lib/dashboard-policy.mjs";
import { getDashboardAccess, requireRight } from "@/lib/require-right";

export const instant = false;

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  await connection();
  const { module: slug } = await params;
  const entry = MODULES.find((item) => item.slug === slug);
  if (!entry && slug !== "system-settings") notFound();
  const access = entry ? await requireRight(entry.code) : await getDashboardAccess();
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "password") redirect("/set-password");
  if (access.status === "forbidden" || (access.status === "ok" && !entry && access.role !== "Superadmin")) redirect("/no-access");
  if (access.status !== "ok") {
    return <main className="registration-page"><section className="registration-card" role="alert">
      <h1>Module unavailable</h1><p>Unable to verify your access. Please try again later.</p>
    </section></main>;
  }
  const title = entry?.name ?? "System Settings";
  return <main className="um-page">
    <DashboardSidebar access={access} active={`/dashboard/${slug}`} />
    <div className="um-main">
      <header className="um-topbar"><h1>{title}</h1><span className="um-role-badge">{access.role}</span></header>
      <div className="um-content"><p>This module is not yet available.</p></div>
    </div>
  </main>;
}
