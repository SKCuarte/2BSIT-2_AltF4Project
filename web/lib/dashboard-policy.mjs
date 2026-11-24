export const MODULES = [
  { code: "CUSTOMER", name: "Customers", slug: "customers", table: "customer", stat: "Active customers" },
  { code: "PRODUCT", name: "Products", slug: "products", table: "product", stat: "Active products" },
  { code: "HR", name: "Human Resources", slug: "human-resources", table: "employee", stat: "Active employee records" },
  { code: "SALES", name: "Sales", slug: "sales", table: "sales", stat: "Active sales" },
  { code: "REPORTS", name: "Reports", slug: "reports" },
];

export function hasRight(access, module, action) {
  if (!MODULES.some((item) => item.code === module)) return false;

  if (
    action !== undefined &&
    (typeof action !== "string" || action.length === 0)
  ) {
    return false;
  }

  if (
    !access.catalogue.some((right) =>
      right.module === module &&
      (action === undefined || right.action === action)
    )
  ) {
    return false;
  }

  if (access.role === "Admin" || access.role === "Superadmin") {
    return true;
  }

  return access.grants.some((right) =>
    right.module === module &&
    (action === undefined || right.action === action)
  );
}

export function routeRequirement(pathname, method) {
  const match = pathname.match(
    /^\/(?:dashboard|api)\/([^/]+)(?:\/(.*))?$/
  );

  if (!match) return null;

  const entry = MODULES.find((item) => item.slug === match[1]);

  if (!entry) return null;

  return {
    module: entry.code,
    // Future nested routes and mutations must be explicitly mapped to an action.
    unsupported: Boolean(match[2]) || !["GET", "HEAD"].includes(method),
  };
}