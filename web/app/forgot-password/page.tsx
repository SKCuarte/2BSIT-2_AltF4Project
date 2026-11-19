import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="registration-page">
      <section
        className="registration-card"
        aria-labelledby="forgot-password-title"
      >
        <h1 id="forgot-password-title">Reset your password</h1>
        <p className="sub">
          Enter your registered email address and we&apos;ll send a reset link
          if an account exists.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
