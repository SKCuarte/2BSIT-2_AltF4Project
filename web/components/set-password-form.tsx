"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error ?? "Password setup could not be completed.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      router.replace(
        typeof result?.redirect === "string" &&
          result.redirect.startsWith("/login")
          ? result.redirect
          : "/login?notice=password_set"
      );
      router.refresh();
    } catch {
      setMessage("Password setup service is unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
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

      <label htmlFor="confirm-password">Confirm new password</label>
      <input
        id="confirm-password"
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
        {isSubmitting ? "Updating password..." : "Set password"}
      </button>

      <p className="msg" role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
