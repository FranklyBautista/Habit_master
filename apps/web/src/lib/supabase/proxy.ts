import type { Database } from "@habit-tracker/database";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnvironment } from "./env";

const authPaths = ["/login", "/registro", "/recuperar"];
// Reachable without a session: the offline fallback must render even when a
// visitor has no cookies yet (first load with no connection, or before login).
const publicPaths = ["/offline"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnvironment();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims.sub);
  const pathname = request.nextUrl.pathname;
  const isAuthPage = authPaths.includes(pathname);
  const isPublicPage = publicPaths.includes(pathname);

  if (isPublicPage) return response;

  if (!authenticated && !isAuthPage && !pathname.startsWith("/auth/")) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (authenticated && isAuthPage) {
    // `getClaims()` only verifies the JWT signature; it can still be true
    // for a session the auth server no longer honors (revoked, user
    // deleted, signed out elsewhere). Confirm with `getUser()` before
    // bouncing away from the login page — otherwise a stale-but-valid-
    // looking cookie sends the visitor to /hoy, the dashboard layout's own
    // getUser() check rejects it and redirects back to /login, and this
    // branch sends them to /hoy again: an infinite redirect loop the
    // visitor cannot break out of on their own. If the session turns out
    // to be invalid, sign out to clear the stale cookie instead of looping.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      await supabase.auth.signOut();
      return response;
    }

    const destination = request.nextUrl.clone();
    destination.pathname = "/hoy";
    destination.search = "";
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
