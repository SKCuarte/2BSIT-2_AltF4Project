"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PASSWORD_RECOVERY_STORAGE_KEY } from "@/lib/password-recovery.mjs";
import { getSupabaseClient } from "@/lib/supabase";

type CallbackState =
  | { status: "loading"; message: string }
  | { status: "error"; message: string };

export default function PasswordRecoveryCallbackPage() {
  const callbackPromise = useRef<Promise<CallbackState> | null>(null);
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: "loading",
    message: "Verifying your reset link...",
  });

  useEffect(() => {
    let active = true;

    async function verifyRecoveryLink(): Promise<CallbackState> {
      try {
        const supabase = getSupabaseClient();
        const params = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );
        const providerError =
          params.get("error_description") ??
          params.get("error") ??
          params.get("error_code") ??
          fragment.get("error_description") ??
          fragment.get("error") ??
          fragment.get("error_code");

        if (providerError) {
          throw new Error(
            "This password reset link is invalid or has expired. Request a new link."
          );
        }

        const tokenHash =
          params.get("token_hash") ?? fragment.get("token_hash");
        const recoveryType = params.get("type") ?? fragment.get("type");
        const code = params.get("code");
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");

        if (tokenHash) {
          if (recoveryType !== "recovery") {
            throw new Error(
              "This password reset link is invalid or has expired. Request a new link."
            );
          }
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) {
            throw new Error(
              "This password reset link is invalid or has expired. Request a new link."
            );
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw new Error(
              "This password reset link is invalid or has expired. Request a new link."
            );
          }
        } else if (
          recoveryType === "recovery" &&
          accessToken &&
          refreshToken
        ) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw new Error(
              "This password reset link is invalid or has expired. Request a new link."
            );
          }
        } else {
          throw new Error(
            "Password reset verification data is missing. Request a new reset link."
          );
        }

        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error(
            "This password reset link is invalid or has expired. Request a new link."
          );
        }

        window.sessionStorage.setItem(
          PASSWORD_RECOVERY_STORAGE_KEY,
          data.user.id
        );
        window.location.replace("/reset-password");
        return { status: "loading", message: "Reset link verified. Redirecting..." };
      } catch (error) {
        return {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Password reset could not be verified. Request a new link.",
        };
      }
    }

    callbackPromise.current ??= verifyRecoveryLink();
    void callbackPromise.current.then((result) => {
      if (active) setCallbackState(result);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="registration-page">
      <section
        className="registration-card"
        aria-labelledby="recovery-callback-title"
        aria-live="polite"
      >
        <h1 id="recovery-callback-title">
          {callbackState.status === "error"
            ? "Password reset could not be verified"
            : "Verifying your reset link"}
        </h1>
        <p className={callbackState.status === "error" ? "msg" : "oauth-status"}>
          {callbackState.message}
        </p>
        {callbackState.status === "error" && (
          <Link className="callback-link" href="/forgot-password">
            Request another reset link
          </Link>
        )}
      </section>
    </main>
  );
}
