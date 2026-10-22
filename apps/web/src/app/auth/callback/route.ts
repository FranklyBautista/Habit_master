import { type NextRequest, NextResponse } from "next/server";

import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

// Vuelta del login con Google (signInWithGoogle en app/(auth)/actions.ts).
// Mismo canje PKCE que auth/confirm; si Google o Supabase devuelven un error
// (p. ej. el usuario canceló) no llega `code` y se vuelve al login con aviso.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url),
      );
  }
  return NextResponse.redirect(new URL("/login?error=google", request.url));
}
