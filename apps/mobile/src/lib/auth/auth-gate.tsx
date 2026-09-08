import { useRouter, useSegments } from "expo-router";
import { type PropsWithChildren, useEffect } from "react";

import { useSession } from "./session-provider";

// Mirrors apps/web/src/lib/supabase/proxy.ts's redirect rules client-side.
// "actualizar-contrasena" is deliberately excluded from this set — like on
// web, it must stay reachable while authenticated (a password-recovery deep
// link signs the user in with a temporary session before landing there).
const AUTH_REDIRECT_PATHS = new Set(["login", "registro", "recuperar"]);

export function AuthGate({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  // Widened to a plain string array: this reads route segments generically
  // to decide redirects, it doesn't need expo-router's typed-route safety.
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const currentAuthPath = inAuthGroup ? segments[1] : undefined;
    const isAuthRedirectPage = currentAuthPath
      ? AUTH_REDIRECT_PATHS.has(currentAuthPath)
      : false;
    const isConfirmRoute = segments[0] === "auth" && segments[1] === "confirm";

    if (!session && !isAuthRedirectPage && !isConfirmRoute) {
      router.replace("/(auth)/login");
      return;
    }
    if (session && isAuthRedirectPage) {
      router.replace("/(app)");
    }
  }, [session, loading, segments, router]);

  if (loading) return null;
  return <>{children}</>;
}
