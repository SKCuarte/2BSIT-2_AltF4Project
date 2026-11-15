import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { LogoutButton } from "@/components/logout-button";
import { getAdminProvisioningAccess } from "@/lib/admin-provisioning.mjs";
import { createSupabaseAdminClient, getSupabaseServerConfig } from "@/lib/supabase-admin";

type ModuleSection = {
  title: string;
  table: string;
  columns: string;
};

type ModuleDefinition = {
  code: string;
  title: string;
  sections: ModuleSection[];
};

export const instant = false;

const MODULES: Record<string, ModuleDefinition> = {
  customers: {
    code: "CUSTOMER",
    title: "Customer",
    sections: [
      {
        title: "Customers",
        table: "CUSTOMER",
        columns: "customer_id, customer_name, customer_address, terms, status",
      },
    ],
  },
  products: {
    code: "PRODUCT",
    title: "Product",
    sections: [
      {
        title: "Products",
        table: "PRODUCT",
        columns: "product_id, product_name, unit, status",
      },
      {
        title: "Price history",
        table: "PRICEHIST",
        columns: "product_id, effective_date, unit_price, status",
      },
    ],
  },
  hr: {
    code: "HR",
    title: "Human Resources",
    sections: [
      {
        title: "Employees",
        table: "EMPLOYEE",
        columns: "employee_id, first_name, last_name, gender, hire_date, sep_date, status",
      },
      {
        title: "Departments",
        table: "DEPARTMENT",
        columns: "department_id, department_name, status",
      },
      {
        title: "Jobs",
        table: "JOB",
        columns: "job_id, job_title, status",
      },
      {
        title: "Job history",
        table: "JOBHISTORY",
        columns: "employee_id, job_id, effective_date, salary, department_id, status",
      },
    ],
  },
  sales: {
    code: "SALES",
    title: "Sales",
    sections: [
      {
        title: "Sales",
        table: "SALES",
        columns: "sale_id, sale_date, customer_id, employee_id, status",
      },
      {
        title: "Sale details",
        table: "SALESDETAIL",
        columns: "sale_id, product_id, quantity, status",
      },
      {
        title: "Payments",
        table: "PAYMENT",
        columns: "payment_id, sale_id, payment_date, payment_amount, status",
      },
    ],
  },
  reports: {
    code: "REPORTS",
    title: "Reports",
    sections: [
      {
        title: "Customer source data",
        table: "CUSTOMER",
        columns: "customer_id, customer_name, status",
      },
      {
        title: "Product source data",
        table: "PRODUCT",
        columns: "product_id, product_name, unit, status",
      },
      {
        title: "Employee source data",
        table: "EMPLOYEE",
        columns: "employee_id, first_name, last_name, hire_date, status",
      },
      {
        title: "Sales source data",
        table: "SALES",
        columns: "sale_id, sale_date, customer_id, employee_id, status",
      },
    ],
  },
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default async function BusinessModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  await connection();
  const { module: slug } = await params;
  const definition = MODULES[slug];
  if (!definition) notFound();

  const config = getSupabaseServerConfig();
  if (!config) {
    return (
      <main className="registration-page">
        <section className="registration-card" role="alert">
          <h1>{definition.title} unavailable</h1>
          <p className="sub">Server configuration is incomplete. Contact your administrator.</p>
        </section>
      </main>
    );
  }

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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const adminAccess = await getAdminProvisioningAccess(admin, authData.user.id);
  const { data: account, error: accountError } = await admin
    .from("app_user")
    .select("id, first_name, last_name")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (accountError) {
    console.error("Business module account lookup failed:", {
      code: accountError.code ?? "account_lookup_failed",
    });
    return (
      <main className="registration-page">
        <section className="registration-card" role="alert">
          <h1>{definition.title} unavailable</h1>
          <p className="sub">Unable to verify your module access. Try again later.</p>
        </section>
      </main>
    );
  }
  if (!account) redirect("/login");

  const { data: rights, error: rightsError } = await admin
    .from("v_user_effective_rights")
    .select("module_code")
    .eq("user_id", account.id)
    .eq("granted", true);

  if (rightsError) {
    console.error("Business module permission lookup failed:", {
      code: rightsError.code ?? "permission_lookup_failed",
      module: definition.code,
    });
    return (
      <main className="registration-page">
        <section className="registration-card" role="alert">
          <h1>{definition.title} unavailable</h1>
          <p className="sub">Unable to load your permissions. Try again later.</p>
        </section>
      </main>
    );
  }
  const visibleModules = new Set((rights ?? []).map((row) => row.module_code));
  if (!visibleModules.has(definition.code)) redirect("/dashboard");

  const results = await Promise.all(
    definition.sections.map(async (section) => {
      const { data, error } = await admin
        .from(section.table)
        .select(section.columns)
        .limit(50);
      if (error) {
        console.error("Business module data lookup failed:", {
          code: error.code ?? "module_data_lookup_failed",
          module: definition.code,
          table: section.table,
        });
      }
      return { section, rows: data ?? [], error };
    })
  );
  const hasDataError = results.some((result) => result.error);

  return (
    <main className="um-page">
      <aside className="um-sidebar">
        <Link className="um-brand" href="/dashboard">
          <span aria-hidden="true" className="um-brand-mark">H</span>
          <span>Hope, Inc. ERP</span>
        </Link>
        <nav aria-label="Main navigation" className="um-side-nav">
          <Link className="um-side-link" href="/dashboard">
            Dashboard
          </Link>
          {Object.entries(MODULES)
            .filter(([, item]) => visibleModules.has(item.code))
            .map(([moduleSlug, item]) => (
              <Link
                aria-current={moduleSlug === slug ? "page" : undefined}
                className={`um-side-link${moduleSlug === slug ? " um-side-link-active" : ""}`}
                href={`/dashboard/modules/${moduleSlug}`}
                key={item.code}
              >
                {item.title}
              </Link>
            ))}
          {adminAccess.status === "allowed" && (
            <Link className="um-side-link" href="/dashboard/users">
              User Management
            </Link>
          )}
        </nav>
        <div className="um-sidebar-account">
          <span aria-hidden="true" className="um-avatar">H</span>
          <span className="um-account-label">
            <strong>{[account.first_name, account.last_name].filter(Boolean).join(" ") || "Account"}</strong>
            <small>{definition.title}</small>
          </span>
        </div>
      </aside>
      <div className="um-main">
        <header className="um-topbar">
          <h1>{definition.title}</h1>
          <Link className="um-role-badge" href="/dashboard">Back to dashboard</Link>
        </header>
        <div className="um-content um-dashboard-content">
          <p className="um-access-note">
            Module records are read-only here. Changes to business records are not enabled yet.
          </p>
          {definition.code === "REPORTS" && (
            <p className="um-access-note">
              These are report source records; calculated report summaries are not available yet.
            </p>
          )}
          {hasDataError && (
            <p className="msg" role="alert">
              Some module data could not be loaded. Contact your database administrator.
            </p>
          )}
          {results.map(({ section, rows, error }) => (
            <section aria-label={section.title} className="module-data-section" key={section.title}>
              <div className="module-data-heading">
                <h2>{section.title}</h2>
                <span>{error ? "Unavailable" : `${rows.length}${rows.length === 50 ? "+" : ""} records`}</span>
              </div>
              {error ? (
                <p className="um-access-note">This data source is unavailable right now.</p>
              ) : rows.length === 0 ? (
                <p className="um-access-note">No records yet.</p>
              ) : (
                <div className="um-table-wrap">
                  <table className="um-table">
                    <thead>
                      <tr>
                        {Object.keys(rows[0]).map((column) => (
                          <th key={column} scope="col">{column.replaceAll("_", " ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex}>{displayValue(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
