import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRedirect } from "@/lib/auth-policy.mjs";
import {
  createSupabaseAdminClient,
  getSupabaseServerConfig,
} from "@/lib/supabase-admin";

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });
  return destination;
}

function redirectWithCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string
) {
  return copyCookies(
    source,
    NextResponse.redirect(new URL(pathname, request.url))
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isPublicRegistrationPage = pathname === "/register";
  const config = getSupabaseServerConfig();

  if (!config) {
    if (isLoginPage || isPublicRegistrationPage) return NextResponse.next();
    return NextResponse.redirect(
      new URL("/login?error=configuration", request.url)
    );
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (!data.user || error) {
    if (
      isLoginPage ||
      isPublicRegistrationPage ||
      pathname === "/set-password" ||
      pathname === "/reset-password" ||
      pathname === "/auth/callback" ||
      pathname === "/auth/recovery-callback"
    ) {
      return response;
    }
    return redirectWithCookies(request, response, "/login");
  }

  if (pathname === "/auth/callback") {
    return response;
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("app_user")
    .select("auth_user_id, is_blocked, approval_status")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Authentication profile lookup failed:", {
      code: profileError.code,
    });
    if (isLoginPage) return response;
    return new NextResponse("Unable to verify your account. Please try again.", {
      status: 503,
    });
  }

  if (!profile && isPublicRegistrationPage && data.user.is_anonymous) {
    return response;
  }

  const decision = getAuthenticatedRedirect(
    pathname,
    profile,
    data.user.app_metadata
  );

  if ("redirect" in decision && typeof decision.redirect === "string") {
    if (decision.redirect.startsWith("/login?")) {
      await supabase.auth.signOut({ scope: "local" });
      return redirectWithCookies(request, response, decision.redirect);
    }

    return redirectWithCookies(request, response, decision.redirect);
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/auth/callback",
    "/auth/recovery-callback",
    "/approval-pending",
    "/dashboard/:path*",
    "/set-password",
    "/reset-password",
  ],
};
