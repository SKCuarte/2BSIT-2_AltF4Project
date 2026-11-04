"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const errorMessages: Record<string, string> = {
  blocked: "This account is blocked. Contact the administrator for help.",
  inactive: "This account is inactive. Contact the administrator for help.",
  pending: "Your account is pending approval.",
  rejected: "Your account was not approved. Contact the administrator for help.",
  profile_missing:
    "An application profile is not linked to this account. Contact the administrator.",
  configuration: "Sign-in is temporarily unavailable.",
};

const noticeMessages: Record<string, string> = {
  pending: "Password set. Your account is pending administrator approval.",
  password_set: "Password set successfully. Sign in with your new password.",
  password_reset: "Password reset successfully. Sign in with your new password.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = errorMessages[searchParams.get("error") ?? ""];
  const initialNotice = noticeMessages[searchParams.get("notice") ?? ""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialError ?? initialNotice ?? "");
  const [messageType, setMessageType] = useState<"error" | "success">(
    initialError ? "error" : "success"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error ?? "Sign-in could not be completed.");
        return;
      }

      setPassword("");
      router.replace(
        result?.redirect === "/set-password" ? "/set-password" : "/dashboard"
      );
      router.refresh();
    } catch {
      setMessage("Sign-in service is unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="login-email">Email address</label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        maxLength={254}
        disabled={isSubmitting}
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        maxLength={1024}
        disabled={isSubmitting}
      />

      <p className="auth-alternate auth-forgot-password">
        <Link href="/forgot-password">Forgot Password?</Link>
      </p>

      <button className="pri full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p
        className={`msg${messageType === "success" ? " ok" : ""}`}
        role={messageType === "success" ? "status" : "alert"}
        aria-live={messageType === "success" ? "polite" : "assertive"}
      >
        {message}
      </p>
      <p className="auth-alternate">
        Need an account? <Link href="/register">Register</Link>
      </p>
    </form>
  );
}
