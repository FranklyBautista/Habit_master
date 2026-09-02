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
    const destination = request.nextUrl.clone();
    destination.pathname = "/hoy";
    destination.search = "";
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
