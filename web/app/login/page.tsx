import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="registration-page">
      <section className="registration-card" aria-labelledby="login-title">
        <h1 id="login-title">Sign in</h1>
        <p className="sub">Sign in to your Hope, Inc. ERP account.</p>
        <Suspense fallback={<p className="oauth-status">Loading sign-in...</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
