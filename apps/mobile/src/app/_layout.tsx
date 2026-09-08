import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AuthGate } from "@/lib/auth/auth-gate";
import { SessionProvider } from "@/lib/auth/session-provider";

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
