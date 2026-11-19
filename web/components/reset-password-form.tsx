"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  getPasswordValidationError,
  PASSWORD_RECOVERY_STORAGE_KEY,
} from "@/lib/password-recovery.mjs";
import { getSupabaseClient } from "@/lib/supabase";

type RecoveryStatus = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyRecoverySession() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getUser();
        const recoveryUserId = window.sessionStorage.getItem(
          PASSWORD_RECOVERY_STORAGE_KEY
        );

        if (active) {
          setRecoveryStatus(
            !error && data.user && recoveryUserId === data.user.id
              ? "ready"
              : "invalid"
          );
        }
      } catch {
        if (active) setRecoveryStatus("invalid");
      }
    }

    void verifyRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validationError = getPasswordValidationError(
      password,
      confirmPassword
    );
    if (validationError) {
      setMessage(validationError);
      return;
    }
    if (recoveryStatus !== "ready") {
      setMessage("Open a valid password reset link before setting a new password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(
          "Unable to update your password. Check the password and try again."
        );
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        setMessage(
          "Your password was changed, but the recovery session could not be closed. Sign out and sign in again."
        );
        return;
      }

      window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      setPassword("");
      setConfirmPassword("");
      router.replace("/login?notice=password_reset");
      router.refresh();
    } catch {
      setMessage("Password reset is temporarily unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (recoveryStatus === "checking") {
    return <p className="oauth-status">Verifying your reset link...</p>;
  }

  if (recoveryStatus === "invalid") {
    return (
      <>
        <p className="msg" role="alert">
          This password reset link is invalid or has expired. Request a new link
          to continue.
        </p>
        <p className="auth-alternate">
          <Link href="/forgot-password">Request another reset link</Link>
        </p>
      </>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="reset-new-password">New password</label>
      <input
        id="reset-new-password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        maxLength={128}
        disabled={isSubmitting}
      />

      <label htmlFor="reset-confirm-password">Confirm new password</label>
      <input
        id="reset-confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        minLength={8}
        maxLength={128}
        disabled={isSubmitting}
      />

      <button className="pri full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating password..." : "Update password"}
      </button>

      <p className="msg" role="alert" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
