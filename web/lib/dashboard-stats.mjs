import { hasRight, MODULES } from "./dashboard-policy.mjs";

export async function loadDashboardStats(admin, access) {
  return Promise.all(MODULES.map(async (entry) => {
    if (!entry.table || !hasRight(access, entry.code)) return null;
    const { count, error } = await admin.from(entry.table)
      .select("*", { count: "exact", head: true }).eq("status", "Active");
    if (error || count === null) {
      console.error("Dashboard count failed:", { module: entry.code, code: error?.code });
      return "Unavailable";
    }
    return count.toLocaleString();
  }));
}
