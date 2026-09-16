import type { HabitTrackerState } from "@habit-tracker/domain";
import { Tabs } from "expo-router";
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";

import { ConnectionBanner } from "@/components/connection-banner";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session-provider";
import { HabitStoreProvider } from "@/lib/habit-store";
import { supabase } from "@/lib/supabase/client";
import { SupabaseHabitRepository } from "@/lib/supabase-habit-repository";

export default function AppLayout() {
  const { session, loading } = useSession();
  const [initialState, setInitialState] = useState<HabitTrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    new SupabaseHabitRepository(supabase, session.user.id)
      .getState()
      .then((state) => {
        if (!cancelled) setInitialState(state);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar tu información.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, loadAttempt]);

  // AuthGate (see src/lib/auth/auth-gate.tsx) redirects away when there is
  // no session — this just needs to avoid rendering the tabs prematurely.
  if (loading || !session) return null;

  // Sin esto, abrir la app sin conexión (o que la primera carga falle por
  // cualquier otro motivo) dejaba una pantalla de error sin salida: no había
  // forma de reintentar sin forzar el cierre de la app.
  if (error) {
    return (
      <ThemedView
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}
      >
        <ThemedText style={{ textAlign: "center", paddingHorizontal: 24 }}>
          {error}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          onPress={() => {
            setError(null);
            setLoadAttempt((attempt) => attempt + 1);
          }}
          style={{
            borderRadius: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: theme.tint,
          }}
        >
          <ThemedText type="smallBold" style={{ color: "white" }}>
            Reintentar
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!initialState) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <HabitStoreProvider initialState={initialState} userId={session.user.id}>
      <ThemedView style={{ flex: 1 }}>
        <ConnectionBanner />
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen
            name="index"
            options={{
              title: "Hoy",
              tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="habitos"
            options={{
              title: "Hábitos",
              tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="calendario"
            options={{
              title: "Calendario",
              tabBarIcon: ({ color, size }) => (
                <CalendarDays color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="estadisticas"
            options={{
              title: "Estadísticas",
              tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="ajustes"
            options={{
              title: "Ajustes",
              tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
            }}
          />
        </Tabs>
      </ThemedView>
    </HabitStoreProvider>
  );
}
