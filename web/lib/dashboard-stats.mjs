import { hasRight, MODULES } from "./dashboard-policy.mjs";

export async function loadDashboardStats(admin, access) {
  return Promise.all(MODULES.map(async (entry) => {
    if (!entry.table || !hasRight(access, entry.code)) return null;

    const { count, error, status } = await admin.from(entry.table)
      .select("*", { count: "exact" })
      .eq("is_deleted", false)
      .limit(0);

    if (error || count === null) {
      console.error(
        `Dashboard count failed: module=${entry.code} status=${status} code=${error?.code || "none"} count=${count}`
      );
      return "Unavailable";
    }

    return count.toLocaleString();
  }));
}