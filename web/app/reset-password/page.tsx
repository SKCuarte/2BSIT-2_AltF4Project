import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="registration-page">
      <section
        className="registration-card"
        aria-labelledby="reset-password-title"
      >
        <h1 id="reset-password-title">Choose a new password</h1>
        <p className="sub">Enter and confirm your new password below.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
