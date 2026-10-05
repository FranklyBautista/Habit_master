import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";

import { AuthGate } from "@/lib/auth/auth-gate";
import { SessionProvider } from "@/lib/auth/session-provider";
// Importarlo aquí también registra el manejador de notificaciones en cuanto
// arranca la app, sin esperar a que se monte la pantalla de Ajustes.
import { reapplyReminderSettings } from "@/lib/notifications/reminders";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Reprograma los recordatorios al abrir la app y al volver a ella: corrige
  // los que quedaron como alarmas inexactas antes de conceder el permiso.
  useEffect(() => {
    const reapply = () => void reapplyReminderSettings().catch(() => undefined);
    reapply();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reapply();
    });
    return () => subscription.remove();
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthGate>
          <Slot />
        </AuthGate>
      </ThemeProvider>
    </SessionProvider>
  );
}
