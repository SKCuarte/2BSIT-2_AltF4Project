"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type CompletionState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function AuthCallbackPage() {
  const callbackPromise = useRef<Promise<CompletionState> | null>(null);
  const [completion, setCompletion] = useState<CompletionState>({
    status: "loading",
    message: "Completing Google registration...",
  });

  useEffect(() => {
    let active = true;

    async function completeRegistration(): Promise<CompletionState> {
      try {
        const supabase = getSupabaseClient();
        const params = new URLSearchParams(window.location.search);
        const providerError =
          params.get("error_description") ??
          params.get("error") ??
          params.get("error_code");

        if (providerError) {
          throw new Error("Google authorization was cancelled or failed.");
        }

        const code = params.get("code");
        if (!code) {
          throw new Error("The Google authorization code is missing.");
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          throw new Error(error.message);
        }
        if (!data.session) {
          throw new Error("Google authorization did not return a session.");
        }

        const response = await fetch("/api/register/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            intent: params.get("intent") === "register" ? "register" : "sign_in",
          }),
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ?? "Could not finish creating your account."
          );
        }

        return {
          status: "success",
          message:
            result?.approvalStatus === "Pending"
              ? result.created
                ? "Google registration submitted. Your account is pending approval."
                : "Your account is pending approval."
              : result?.approvalStatus === "Rejected"
                ? "Your account was not approved. Contact the administrator for help."
                : result?.created
                  ? "Google registration is complete. Your account is approved."
                  : "Google sign-in is complete.",
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "";

        return {
          status: "error",
          message: errorMessage.toLowerCase().includes("code verifier")
            ? "Google sign-in could not be verified. Start again from the same browser where you opened registration; do not switch between the VS Code preview and Edge/Chrome or clear browser data during sign-in."
            : errorMessage ||
              "Google registration could not be completed.",
        };
      }
    }

    callbackPromise.current ??= completeRegistration();
    void callbackPromise.current.then((result) => {
      if (active) setCompletion(result);
    });

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
