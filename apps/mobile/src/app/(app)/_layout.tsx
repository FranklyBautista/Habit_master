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
import { ActivityIndicator } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSession } from "@/lib/auth/session-provider";
import { HabitStoreProvider } from "@/lib/habit-store";
import { supabase } from "@/lib/supabase/client";
import { SupabaseHabitRepository } from "@/lib/supabase-habit-repository";

export default function AppLayout() {
  const { session, loading } = useSession();
  const [initialState, setInitialState] = useState<HabitTrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [session]);

  // AuthGate (see src/lib/auth/auth-gate.tsx) redirects away when there is
  // no session — this just needs to avoid rendering the tabs prematurely.
  if (loading || !session) return null;

  if (error) {
    return (
      <ThemedView
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}
      >
        <ThemedText style={{ textAlign: "center", paddingHorizontal: 24 }}>
          {error}
        </ThemedText>
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
            tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
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
    </HabitStoreProvider>
  );
}
