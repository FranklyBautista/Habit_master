import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase/client";

import { getMobileOAuthRedirect } from "./redirect";

// Mismo texto que GOOGLE_SIGN_IN_ERROR en apps/web/src/lib/auth/google.ts.
export const GOOGLE_SIGN_IN_ERROR =
  "No se pudo iniciar sesión con Google. Inténtalo de nuevo.";

export type GoogleSignInResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

type CallbackParams = { code?: unknown; error?: unknown };

// Login con Google en el navegador del sistema (Custom Tab en Android,
// ASWebAuthenticationSession en iOS) con PKCE, en vez del módulo nativo
// @react-native-google-signin: su versión gratuita usa el SDK de Android ya
// obsoleto y exige un cliente OAuth por cada huella SHA-1 (debug, preview,
// Play). Así solo hace falta el cliente Web de Google que ya usa la web.
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = getMobileOAuthRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // Sin esto supabase-js intentaría abrir la URL con window.location.
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { status: "error", message: GOOGLE_SIGN_IN_ERROR };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { status: "cancelled" };
  // Linking.parse y no `new URL`: el URL de React Native no implementa
  // searchParams de forma fiable.
  return completeGoogleSignIn(Linking.parse(result.url).queryParams ?? {});
}

const exchanges = new Map<string, Promise<GoogleSignInResult>>();

// En Android la vuelta llega dos veces: como resultado de openAuthSessionAsync
// y como deep link que Expo Router abre en app/auth/callback.tsx. Un código
// PKCE solo se puede canjear una vez, así que ambos comparten la misma promesa.
export function completeGoogleSignIn({
  code,
  error,
}: CallbackParams): Promise<GoogleSignInResult> {
  // Sin código: el usuario canceló en Google o Supabase devolvió ?error=…
  if (typeof code !== "string" || !code) {
    return Promise.resolve(
      error === "access_denied"
        ? { status: "cancelled" }
        : { status: "error", message: GOOGLE_SIGN_IN_ERROR },
    );
  }

  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }): GoogleSignInResult =>
        exchangeError
          ? { status: "error", message: GOOGLE_SIGN_IN_ERROR }
          : { status: "success" },
      );
    exchanges.set(code, exchange);
  }
  return exchange;
}
