import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { completeGoogleSignIn } from "@/lib/auth/google";

// Deep link de vuelta del login con Google (habittracker://auth/callback).
// En Android Expo Router abre esta pantalla además de resolver
// openAuthSessionAsync; completeGoogleSignIn evita canjear el código dos
// veces. En iOS no se llega aquí: la sesión de auth devuelve la URL sin abrirla.
export default function GoogleCallbackScreen() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    completeGoogleSignIn({ code, error }).then((result) => {
      // AuthGate no saca de esta ruta al tener sesión (igual que auth/confirm),
      // así que se navega a mano.
      if (result.status === "success") router.replace("/(app)");
      else if (result.status === "cancelled") router.replace("/(auth)/login");
      else setFailed(true);
    });
  }, [code, error, router]);

  return (
    <ThemedView
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}
    >
      <ThemedText>
        {failed ? "No se pudo iniciar sesión con Google." : "Conectando con Google…"}
      </ThemedText>
      {failed ? (
        <Link href="/(auth)/login" replace>
          <ThemedText type="link">Volver a iniciar sesión</ThemedText>
        </Link>
      ) : null}
    </ThemedView>
  );
}
