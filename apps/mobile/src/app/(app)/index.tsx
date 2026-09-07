import { Link } from "expo-router";
import { Inbox, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";
import { supabase } from "@/lib/supabase/client";

export default function HoyScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const { activeHabits, completedIds } = getTodaySnapshot(snapshot);
  const completed = activeHabits.filter((habit) => completedIds.has(habit.id)).length;
  const percentage = activeHabits.length
    ? Math.round((completed / activeHabits.length) * 100)
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Hoy</ThemedText>
        <ThemedText themeColor="textSecondary">
          Buenos días, {snapshot.settings.displayName}
        </ThemedText>

        {activeHabits.length ? (
          <View style={styles.content}>
            <View style={styles.progressCard}>
              <ThemedText type="small" themeColor="textSecondary">
                PROGRESO DE HOY
              </ThemedText>
              <ThemedText type="subtitle">
                {completed} de {activeHabits.length}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {completed === activeHabits.length
                  ? "Todo listo por hoy."
                  : `Te ${
                      activeHabits.length - completed === 1
                        ? "falta uno"
                        : `faltan ${activeHabits.length - completed}`
                    }. Sin prisa.`}
              </ThemedText>
              {percentage !== null ? (
                <ThemedText type="title" style={styles.percentage}>
                  {percentage}%
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.list}>
              {activeHabits.map((habit) => {
                const checked = completedIds.has(habit.id);
                return (
                  <Pressable
                    key={habit.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={habit.name}
                    style={styles.habitRow}
                    onPress={() => void actions.toggleToday(habit.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: habit.color },
                        checked && { backgroundColor: habit.color },
                      ]}
                    />
                    <View style={styles.habitCopy}>
                      <ThemedText>{habit.name}</ThemedText>
                      {habit.description ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {habit.description}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Inbox size={28} />
            <ThemedText type="subtitle">Sin hábitos para este día</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ textAlign: "center" }}>
              Crea tu primer hábito para empezar una rutina sencilla.
            </ThemedText>
            <Link href="/(app)/habitos" asChild>
              <Pressable style={styles.emptyButton}>
                <Plus size={18} color="white" />
                <ThemedText type="smallBold" style={{ color: "white" }}>
                  Crear un hábito
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        )}

        {/* Provisional hasta la pantalla de Ajustes (siguiente bloque de la
            Fase 8) — necesario para poder probar con varias cuentas mientras
            tanto. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          style={styles.signOut}
          onPress={() => void supabase.auth.signOut()}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Cerrar sesión
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.three, padding: Spacing.four },
  signOut: { marginTop: "auto", alignSelf: "center", padding: Spacing.two },
  content: { gap: Spacing.four },
  progressCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: "#F0F0F3",
  },
  percentage: { marginTop: Spacing.two },
  list: { gap: Spacing.two },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: "#F0F0F3",
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2 },
  habitCopy: { flex: 1, gap: 2 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    backgroundColor: "#047857",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
});
