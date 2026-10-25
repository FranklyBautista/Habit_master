import type { HabitTrackerState } from "@habit-tracker/domain";
import NetInfo from "@react-native-community/netinfo";
import { Tabs } from "expo-router";
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  type LucideIcon,
  Settings,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, type ColorValue, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { ConnectionBanner } from "@/components/connection-banner";
import { AppProviders } from "@/components/groups/app-providers";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session-provider";
import { initialLoadErrorDetail, loadWithRetry } from "@/lib/initial-load";
import { loadCachedState, saveCachedState } from "@/lib/offline/state-cache";
import { PetReminderSync } from "@/lib/pet-reminder-sync";
import { supabase } from "@/lib/supabase/client";
import { SupabaseHabitRepository } from "@/lib/supabase-habit-repository";

export default function AppLayout() {
  const { session, loading } = useSession();
  const [initialState, setInitialState] = useState<{
    state: HabitTrackerState;
    stale: boolean;
  } | null>(null);
  const [failure, setFailure] = useState<{ detail?: string } | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    const repository = new SupabaseHabitRepository(supabase, userId);
    // Sin conexión (o si el servidor no responde) se abre con la última copia
    // guardada en el dispositivo (ADR 0003); el store la sustituye al volver
    // la red. Sin red no se espera a los reintentos: se va directo a la caché.
    const openFromCache = async (reason: unknown) => {
      const cached = await loadCachedState(userId);
      if (cancelled) return;
      if (cached) {
        setInitialState({ state: cached, stale: true });
        return;
      }
      console.warn("Initial habit state load failed", reason);
      setFailure({ detail: initialLoadErrorDetail(reason) });
    };
    void NetInfo.fetch()
      .then((network) => network.isConnected === false)
      .catch(() => false)
      .then(async (offline) => {
        if (offline) return openFromCache(new Error("Sin conexión."));
        try {
          const state = await loadWithRetry(() => repository.getState());
          if (cancelled) return;
          void saveCachedState(userId, state);
          setInitialState({ state, stale: false });
        } catch (reason) {
          if (!cancelled) await openFromCache(reason);
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
  if (failure) {
    return (
      <ThemedView
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}
      >
        <ThemedText style={{ textAlign: "center", paddingHorizontal: 24 }}>
          No se pudo cargar tu información. Revisa tu conexión e inténtalo de nuevo.
        </ThemedText>
        {failure.detail ? (
          <ThemedText
            type="small"
            style={{ textAlign: "center", paddingHorizontal: 24, opacity: 0.7 }}
          >
            Detalle: {failure.detail}
          </ThemedText>
        ) : null}
        <Button
          label="Reintentar"
          onPress={() => {
            setFailure(null);
            setLoadAttempt((attempt) => attempt + 1);
          }}
        />
      </ThemedView>
    );
  }

  if (!initialState) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  return (
    <AppProviders
      initialState={initialState.state}
      stale={initialState.stale}
      userId={session.user.id}
    >
      <ThemedView style={{ flex: 1 }}>
        <ConnectionBanner />
        <PetReminderSync />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.tint,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Hoy",
              tabBarIcon: (props) => <TabIcon icon={Sparkles} {...props} />,
            }}
          />
          <Tabs.Screen
            name="habitos"
            options={{
              title: "Hábitos",
              tabBarIcon: (props) => <TabIcon icon={ListChecks} {...props} />,
            }}
          />
          <Tabs.Screen
            name="calendario"
            options={{
              title: "Calendario",
              tabBarIcon: (props) => <TabIcon icon={CalendarDays} {...props} />,
            }}
          />
          <Tabs.Screen
            name="estadisticas"
            options={{
              title: "Estadísticas",
              tabBarIcon: (props) => <TabIcon icon={BarChart3} {...props} />,
            }}
          />
          <Tabs.Screen
            name="ajustes"
            options={{
              title: "Ajustes",
              tabBarIcon: (props) => <TabIcon icon={Settings} {...props} />,
            }}
          />
          {/* Sin pestaña propia: se entra desde Hoy y Ajustes. */}
          <Tabs.Screen name="grupos" options={{ href: null, title: "Grupos" }} />
        </Tabs>
      </ThemedView>
    </AppProviders>
  );
}

// La pestaña activa lleva el icono sobre una píldora de acento suave, para que
// se distinga por algo más que el color.
function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.tabIcon, focused && { backgroundColor: theme.accentSoft }]}>
      <Icon color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 11, fontWeight: 600 },
  tabIcon: {
    width: 52,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
