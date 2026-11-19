import Link from "next/link";
import { hasRight, MODULES } from "@/lib/dashboard-policy.mjs";

type Access = {
  role: string;
  catalogue: { module: string; action: string }[];
  grants: { module: string; action: string }[];
};

export function DashboardSidebar({ access, active }: { access: Access; active: string }) {
  const links = [
    { name: "Dashboard", href: "/dashboard" },
    ...MODULES.filter((module) => hasRight(access, module.code)).map((module) => ({
      name: module.name, href: `/dashboard/${module.slug}`,
    })),
    ...(access.role !== "User" ? [{ name: "User Management", href: "/dashboard/users" }] : []),
    ...(access.role === "Superadmin" ? [{ name: "System Settings", href: "/dashboard/system-settings" }] : []),
  ];
  return (
    <aside className="um-sidebar">
      <Link className="um-brand" href="/dashboard">
        <span aria-hidden="true" className="um-brand-mark">H</span>
        <span>Hope, Inc. ERP</span>
      </Link>
      <nav aria-label="Main navigation" className="um-side-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href}
            className={`um-side-link${active === link.href ? " um-side-link-active" : ""}`}
            aria-current={active === link.href ? "page" : undefined}>
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="um-sidebar-account">
        <span aria-hidden="true" className="um-avatar">H</span>
        <span className="um-account-label"><strong>Hope, Inc. Account</strong><small>{access.role}</small></span>
      </div>
    </aside>
  );
}
