import type { Href } from "expo-router";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase/client";

// Mirrors apps/web/src/app/auth/confirm/route.ts. `next` comes from a URL
// query param, so it can't be a statically-known typed route — same widening
// pattern as src/lib/auth/auth-gate.tsx's `segments` cast.
function safeNext(value: string | string[] | undefined): Href {
  const next = Array.isArray(value) ? value[0] : value;
  return (
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/(app)"
  ) as Href;
}

export default function ConfirmScreen() {
  const { code, next } = useLocalSearchParams<{ code?: string; next?: string }>();
  const router = useRouter();
  const [error, setError] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function confirm() {
      if (!code) {
        setError(true);
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(true);
        return;
      }
      router.replace(safeNext(next));
    }

    confirm();
  }, [code, next, router]);

  return (
    <ThemedView
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}
    >
      <ThemedText>
        {error ? "No se pudo confirmar el enlace." : "Confirmando…"}
      </ThemedText>
      {error ? (
        <Link href="/(auth)/login">
          <ThemedText type="link">Volver a iniciar sesión</ThemedText>
        </Link>
      ) : null}
    </ThemedView>
  );
}
