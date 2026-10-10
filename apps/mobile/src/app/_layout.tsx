import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { AuthGate } from "@/lib/auth/auth-gate";
import { SessionProvider } from "@/lib/auth/session-provider";
// Importarlo aquí también registra el manejador de notificaciones en cuanto
// arranca la app, sin esperar a que se monte la pantalla de Ajustes.
import { reapplyReminderSettings } from "@/lib/notifications/reminders";

// Los colores de React Navigation (fondo entre pantallas, barra de pestañas por
// defecto) salen de los mismos tokens que el resto de la app.
function navigationTheme(scheme: "light" | "dark") {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";

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
      <ThemeProvider value={navigationTheme(colorScheme)}>
        <StatusBar style="auto" />
        <AuthGate>
          <Slot />
        </AuthGate>
      </ThemeProvider>
    </SessionProvider>
  );
}
