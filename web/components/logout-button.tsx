
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setMessage("");
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setMessage(result?.error ?? "Unable to sign out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("Sign-out service is unavailable. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="um-sidebar-logout">
      <button
        type="button"
        className="um-logout-button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "Signing out..." : "Log out"}
      </button>

      {message && (
        <p className="um-logout-message" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
