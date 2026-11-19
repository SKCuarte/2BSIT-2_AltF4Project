export const MODULES = [
  { code: "CUSTOMER", name: "Customers", slug: "customers", table: "CUSTOMER", stat: "Active customers" },
  { code: "PRODUCT", name: "Products", slug: "products", table: "PRODUCT", stat: "Active products" },
  { code: "HR", name: "Human Resources", slug: "human-resources", table: "EMPLOYEE", stat: "Active employee records" },
  { code: "SALES", name: "Sales", slug: "sales", table: "SALES", stat: "Active sales" },
  { code: "REPORTS", name: "Reports", slug: "reports" },
];

export function hasRight(access, module, action) {
  if (!MODULES.some((item) => item.code === module)) return false;
  if (!access.catalogue.some((right) =>
    right.module === module && (!action || right.action === action)
  )) return false;
  if (access.role === "Admin" || access.role === "Superadmin") return true;
  return access.grants.some((right) =>
    right.module === module && (!action || right.action === action)
  );
}

export function routeRequirement(pathname, method) {
  const match = pathname.match(/^\/(?:dashboard|api)\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;
  const entry = MODULES.find((item) => item.slug === match[1]);
  if (!entry) return null;
  return {
    module: entry.code,
    // Future nested routes and mutations must be explicitly mapped to an action.
    unsupported: Boolean(match[2]) || !["GET", "HEAD"].includes(method),
  };
}
