"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getPasswordResetRequestErrorMessage } from "@/lib/password-reset-errors.mjs";
import { getSupabaseClient } from "@/lib/supabase";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const redirectTo = new URL(
        "/auth/recovery-callback",
        window.location.origin
      ).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setMessage(getPasswordResetRequestErrorMessage(error.status));
        return;
      }

      setIsSuccess(true);
      setMessage(
        "If an account exists with this email, a reset link will be sent. Check your spam folder. If it does not arrive, contact the administrator to configure email delivery."
      );
    } catch {
      setMessage("Unable to process your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="recovery-email">Email address</label>
      <input
        id="recovery-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        maxLength={254}
        disabled={isSubmitting}
      />

      <button className="pri full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending request..." : "Send reset link"}
      </button>

      <p
        className={isSuccess ? "msg ok" : "msg"}
        role={isSuccess ? "status" : "alert"}
        aria-live="polite"
      >
        {message}
      </p>
      <p className="auth-alternate">
        Remember your password? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
