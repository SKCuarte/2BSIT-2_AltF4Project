import Link from "next/link";

const modules = [
  { name: "Customer", rights: 3, text: "Customer records and account handling." },
  { name: "Product", rights: 6, text: "Product catalogue and inventory details." },
  { name: "Human Resources", rights: 13, text: "Employee records, roles, and HR workflows." },
  { name: "Sales", rights: 7, text: "Orders, transactions, and sales tracking." },
  { name: "Reports", rights: 7, text: "Summaries and exports across modules." },
];

const roles = [
  { name: "Superadmin", text: "Approves new accounts, promotes or demotes Admins, and holds every right." },
  { name: "Admin", text: "Manages User accounts and assigns module rights." },
  { name: "User", text: "Works inside the modules they have been granted." },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="landing-brand" href="/">
          <span aria-hidden="true" className="um-brand-mark">H</span>
          <span>Hope, Inc. ERP</span>
        </Link>
        <nav aria-label="Primary" className="landing-nav">
          <a href="#modules">Modules</a>
          <a href="#roles">Roles</a>
          <Link className="landing-btn landing-btn-ghost" href="/login">Log in</Link>
          <Link className="landing-btn" href="/register">Register</Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <p className="um-eyebrow">HOPE, INC. ERP</p>
          <h1 id="landing-title">One workspace for your whole business</h1>
          <p>
            Manage customers, products, people, sales, and reports in one place,
            with access controlled by role and approved by a Superadmin.
          </p>
          <div className="landing-actions">
            <Link className="landing-btn landing-btn-lg" href="/register">Create an account</Link>
            <Link className="landing-btn landing-btn-lg landing-btn-ghost" href="/login">Log in</Link>
          </div>
        </section>

        <section className="landing-section" id="modules" aria-labelledby="modules-title">
          <h2 id="modules-title">Modules</h2>
          <ul className="landing-grid">
            {modules.map((item) => (
              <li className="landing-card" key={item.name}>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
                <small>{item.rights} rights</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" id="roles" aria-labelledby="roles-title">
          <h2 id="roles-title">Roles and access</h2>
          <ul className="landing-grid">
            {roles.map((item) => (
              <li className="landing-card" key={item.name}>
                <h3>{item.name}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="landing-footer">
        <span>&copy; Hope, Inc. ERP</span>
        <Link href="/login">Log in</Link>
      </footer>
    </div>
  );
}
