
"use client";

import { useState, type FormEvent } from "react";

export default function Home() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          result?.error ??
            "Registration could not be completed. Please try again later."
        );
        return;
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setIsSuccess(true);
      setMessage(
        "Registration submitted. Your account is pending approval."
      );
    } catch {
      setMessage(
        "Registration service is unavailable. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="registration-page">
      <a className="logo" href="/" aria-label="Hope, Inc.">
        <svg
          viewBox="0 0 32 32"
          width="28"
          height="28"
          aria-hidden="true"
        >
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
      </a>

      <section
        className="registration-card"
        aria-labelledby="registration-title"
      >
        <h1 id="registration-title">Create your account</h1>

        <p className="sub">
          Register to get started with Hope, Inc. ERP.
        </p>

        <p className="approval-note">
          New accounts are assigned the User role and remain pending approval.
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />

          <button
            className="pri full"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit registration"}
          </button>

          <div className="oauth-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <button
            className="google-sign-in"
            type="button"
            disabled
            aria-describedby="google-sign-in-status"
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>

          <p id="google-sign-in-status" className="oauth-status">
            Google sign-in is not available yet.
          </p>

          <p
            className={`msg${isSuccess ? " ok" : ""}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}
