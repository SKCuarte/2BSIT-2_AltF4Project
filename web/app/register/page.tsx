"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success" | "neutral"
  >("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const checkApprovalStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/approval-status", {
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 404) return;

      if (!response.ok) {
        const error =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to check approval status. Please try again.";
        setMessage(
          requestSubmitted
            ? `Registration was received, but approval status could not be checked: ${error}`
            : error
        );
        setMessageType(requestSubmitted ? "neutral" : "error");
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("status" in result) ||
        (result.status !== "pending" && result.status !== "approved") ||
        !("needsPassword" in result) ||
        typeof result.needsPassword !== "boolean"
      ) {
        setMessage(
          "Registration was received, but approval status could not be read. Please try again."
        );
        setMessageType("neutral");
        return;
      }

      setRequestSubmitted(true);
      if (result.status === "approved") {
        router.replace(result.needsPassword ? "/set-password" : "/dashboard");
        router.refresh();
        return;
      }
      setMessage(
        "Registration successful. Your account is Pending and awaits Super Admin approval."
      );
      setMessageType("success");
    } catch {
      setMessage(
        requestSubmitted
          ? "Registration was received, but approval status could not be checked. Please try again."
          : "Unable to check approval status. Please try again."
      );
      setMessageType(requestSubmitted ? "neutral" : "error");
    }
  }, [requestSubmitted, router]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => {
      void checkApprovalStatus();
    }, 0);
    return () => window.clearTimeout(initialCheck);
  }, [checkApprovalStatus]);

  useEffect(() => {
    if (!requestSubmitted) return;
    const timer = window.setInterval(() => {
      void checkApprovalStatus();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [checkApprovalStatus, requestSubmitted]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          result?.error ??
            "Registration could not be completed. Please try again later."
        );
        return;
      }

      setRequestSubmitted(true);
      setMessage(
        "Registration successful. Your account is Pending and awaits Super Admin approval."
      );
      setMessageType("success");
    } catch {
      setMessage("Registration service is unavailable. Please try again later.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="registration-page">
      <Link className="logo" href="/register" aria-label="Hope, Inc.">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <circle cx="16" cy="16" r="16" className="mk-bg" />
          <path d="M6 22a10 10 0 0 1 20 0z" className="mk-sun" />
          <rect
            x="6"
            y="23.5"
            width="20"
            height="2.5"
            rx="1.25"
            className="mk-line"
          />
        </svg>
        <span>Hope, Inc.</span>
      </Link>

      <section
        className="registration-card"
        aria-labelledby="registration-title"
      >
        <h1 id="registration-title">Create your account</h1>
        <p className="sub">Register to get started with Hope, Inc. ERP.</p>
        <p className="approval-note">
          After administrator approval, you can set your password and sign in.
          No email or OTP is sent.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="first-name">First Name</label>
          <input
            id="first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            maxLength={80}
            disabled={isSubmitting || requestSubmitted}
          />

          <label htmlFor="last-name">Last Name</label>
          <input
            id="last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            maxLength={80}
            disabled={isSubmitting || requestSubmitted}
          />

          <label htmlFor="email">Gmail address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            pattern="^[A-Za-z0-9._%+-]+@gmail\.com$"
            title="Enter a valid Gmail address ending in @gmail.com."
            disabled={isSubmitting || requestSubmitted}
          />

          <button
            className="pri full"
            type="submit"
            disabled={isSubmitting || requestSubmitted}
          >
            {isSubmitting
              ? "Submitting..."
              : requestSubmitted
                ? "Registration submitted"
                : "Submit registration"}
          </button>

          <p className={`msg ${messageType}`} role="status" aria-live="polite">
            {message}
          </p>
          <p className="auth-alternate">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
