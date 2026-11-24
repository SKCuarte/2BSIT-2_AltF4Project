
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-header">
        <Link href="/" className="home-brand">
          <span className="home-brand-mark">H</span>
          <span>Hope, Inc. ERP</span>
        </Link>

        <nav className="home-nav">
          <Link href="/login" className="home-login">
            Sign in
          </Link>
          <Link href="/register" className="home-register">
            Get Started
          </Link>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-eyebrow">HOPE, INC. MANAGEMENT SYSTEM</p>

          <h1>
            Manage your work.
            <br />
            <span>Grow together.</span>
          </h1>

          <p className="home-description">
            Welcome to Hope, Inc. ERP, your centralized workspace
            for managing company operations, employees, products,
            customers, and sales.
          </p>

          <div className="home-actions">
            <Link href="/login" className="home-primary">
              Sign in to your account
            </Link>

            <Link href="/register" className="home-secondary">
              Create an account
            </Link>
          </div>
        </div>

        <div className="home-hero-card">
          <div className="home-card-mark">H</div>
          <p className="home-card-label">HOPE, INC.</p>
          <h2>One workspace.</h2>
          <h2>Connected operations.</h2>
          <p>
            A centralized system for your organization&apos;s daily
            management needs.
          </p>
        </div>
      </section>

      <footer className="home-footer">
        Â© 2026 Hope, Inc. All rights reserved.
      </footer>
    </main>
  );
}

