import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SetPasswordForm } from "@/components/set-password-form";
import { getProfileAccessIssue } from "@/lib/auth-policy.mjs";
import {
  REGISTRATION_CLAIM_COOKIE,
  verifyRegistrationClaim,
} from "@/lib/registration-claim.mjs";
import {
  createSupabaseAdminClient,
  getSupabaseServerConfig,
} from "@/lib/supabase-admin";

export const instant = false;

export default async function SetPasswordPage() {
  await connection();
  const config = getSupabaseServerConfig();
  if (!config) redirect("/login?error=configuration");

  const cookieStore = await cookies();
  const registrationClaim = verifyRegistrationClaim(
    cookieStore.get(REGISTRATION_CLAIM_COOKIE)?.value,
    config.serviceRoleKey
  );

  if (registrationClaim) {
    const admin = createSupabaseAdminClient();
    const { data: profile, error } = await admin
      .from("app_user")
      .select("auth_user_id, is_blocked, approval_status")
      .eq("auth_user_id", registrationClaim)
      .maybeSingle();
    if (error) {
      console.error("Set-password registration lookup failed:", {
        code: error.code,
      });
      throw new Error("Unable to verify your registration. Please try again.");
    }
    if (getProfileAccessIssue(profile)) redirect("/register");
  } else {
    const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect("/register");
  }

  return (
    <main className="registration-page">
      <section className="registration-card" aria-labelledby="set-password-title">
        <h1 id="set-password-title">Set your password</h1>
        <p className="sub">
          Choose a new password to finish setting up your account.
        </p>
        <SetPasswordForm />
      </section>
    </main>
  );
}
