
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase-admin";

export async function POST() {
  const config = getSupabaseServerConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Sign-out service is unavailable." },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();

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

  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    return NextResponse.json(
      { error: "Unable to sign out. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
