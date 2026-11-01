"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type CompletionState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function AuthCallbackPage() {
  const [completion, setCompletion] = useState<CompletionState>({
    status: "loading",
    message: "Completing Google registration...",
  });

  useEffect(() => {
    let active = true;

    async function completeRegistration() {
      try {
        const supabase = getSupabaseClient();
        const params = new URLSearchParams(window.location.search);
        const providerError = params.get("error_description");

        if (providerError) {
          throw new Error("Google authorization was cancelled or failed.");
        }

        const code = params.get("code");
        if (!code) {
          throw new Error("The Google authorization code is missing.");
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          throw new Error("Could not complete Google authorization.");
        }

        const response = await fetch("/api/register/google", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ?? "Could not finish creating your account."
          );
        }

        if (active) {
          setCompletion({
            status: "success",
            message: result?.created
              ? "Google registration submitted. Your account is pending approval."
              : "Your Google account is connected. Existing profile details were not changed.",
          });
        }
      } catch (error) {
        if (active) {
          setCompletion({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Google registration could not be completed.",
          });
        }
      }
    }

    void completeRegistration();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="registration-page">
      <section
        className="registration-card"
        aria-labelledby="callback-title"
        aria-live="polite"
      >
        <h1 id="callback-title">
          {completion.status === "success"
            ? "Registration complete"
            : completion.status === "error"
              ? "Registration could not be completed"
              : "Connecting your Google account"}
        </h1>
        <p className={completion.status === "error" ? "msg" : "oauth-status"}>
          {completion.message}
        </p>
        {completion.status !== "loading" && (
          <Link className="callback-link" href="/">
            Return to registration
          </Link>
        )}
      </section>
    </main>
  );
}
