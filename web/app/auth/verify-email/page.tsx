
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { verifyRegistrationEmail } from "@/lib/email-verification.mjs";

export default function VerifyEmailPage() {
  const started = useRef(false);
  const [message, setMessage] = useState("Verifying your email...");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fragment = window.location.hash;

    // Remove verification tokens from the visible browser URL.
    window.history.replaceState(null, "", window.location.pathname);

    void verifyRegistrationEmail(fragment, (accessToken: string) =>
      fetch("/api/register/verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })
    )
      .then((result) => {
        setMessage(
          result.ok
            ? "Your email is verified. Your registration is pending administrator approval."
            : result.error ??
                "Email verification could not be completed. Contact the administrator."
        );
        setComplete(true);
      })
      .catch(() => {
        setMessage(
          "Email verification is unavailable. Contact the administrator."
        );
        setComplete(true);
      });
  }, []);

  return (
    <main className="registration-page">
      <section className="registration-card" aria-live="polite">
        <h1>Email verification</h1>
        <p className="msg">{message}</p>
        {complete && (
          <Link className="callback-link" href="/register">
            Return to registration
          </Link>
        )}
      </section>
    </main>
  );
}
