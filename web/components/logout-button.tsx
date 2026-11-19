"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function LogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setMessage("");
    setIsSigningOut(true);

    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) {
        setMessage("Unable to sign out. Please try again.");
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
    <div>
      <button className="google-sign-in" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? "Signing out..." : "Log out"}
      </button>
      <p className="msg" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
