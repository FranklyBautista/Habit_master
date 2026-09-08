import { Link } from "expo-router";
import { Inbox, Plus } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function HoyScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const theme = useTheme();
  const { activeHabits, completedIds } = getTodaySnapshot(snapshot);
  const completed = activeHabits.filter((habit) => completedIds.has(habit.id)).length;
  const percentage = activeHabits.length
    ? Math.round((completed / activeHabits.length) * 100)
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Hoy</ThemedText>
          <ThemedText themeColor="textSecondary">
            Buenos días, {snapshot.settings.displayName}
          </ThemedText>

          {activeHabits.length ? (
            <>
              <Card style={styles.progressCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  PROGRESO DE HOY
                </ThemedText>
                <View style={styles.progressRow}>
                  <ThemedText type="subtitle">
                    {completed} de {activeHabits.length}
                  </ThemedText>
                  {percentage !== null ? (
                    <ThemedText type="subtitle" style={{ color: theme.tint }}>
                      {percentage}%
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText themeColor="textSecondary">
                  {completed === activeHabits.length
                    ? "Todo listo por hoy."
                    : `Te ${
                        activeHabits.length - completed === 1
                          ? "falta uno"
                          : `faltan ${activeHabits.length - completed}`
                      }. Sin prisa.`}
                </ThemedText>
              </Card>

              <View style={styles.list}>
                {activeHabits.map((habit) => {
                  const checked = completedIds.has(habit.id);
                  return (
                    <Pressable
                      key={habit.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={habit.name}
                      style={[
                        styles.habitRow,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: checked ? habit.color : theme.border,
                        },
                      ]}
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
            </>
          ) : (
            <View style={styles.empty}>
              <Inbox size={28} color={theme.textSecondary} />
              <ThemedText type="subtitle">Sin hábitos para este día</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: "center" }}>
                Crea tu primer hábito para empezar una rutina sencilla.
              </ThemedText>
              <Link href="/(app)/habitos" asChild>
                <Pressable
                  style={[styles.emptyButton, { backgroundColor: theme.tint }]}
                >
                  <Plus size={18} color="white" />
                  <ThemedText type="smallBold" style={{ color: "white" }}>
                    Crear un hábito
                  </ThemedText>
                </Pressable>
              </Link>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  progressCard: { padding: Spacing.four },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  list: { gap: Spacing.two },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2 },
  habitCopy: { flex: 1, gap: 2 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
});
