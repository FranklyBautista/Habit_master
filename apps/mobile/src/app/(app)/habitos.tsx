import type { Habit } from "@habit-tracker/domain";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HabitFormModal } from "@/components/habit-form-modal";
import { habitIconComponents } from "@/components/habit-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function HabitsScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeHabits = snapshot.habits
    .filter((habit) => !habit.archivedAt)
    .sort((a, b) => a.position - b.position);
  const archivedHabits = snapshot.habits
    .filter((habit) => habit.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  function openCreate() {
    setEditingHabit(null);
    setFormOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setFormOpen(true);
  }
  async function archive(habit: Habit) {
    if (await actions.archiveHabit(habit.id)) {
      setToast(`${habit.name} se archivó sin perder su historial.`);
    }
  }
  async function restore(habit: Habit) {
    if (await actions.restoreHabit(habit.id)) {
      setToast(`${habit.name} vuelve a estar activo.`);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Hábitos</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear hábito"
            style={styles.createButton}
            onPress={openCreate}
          >
            <Plus size={18} color="white" />
          </Pressable>
        </View>
        <ThemedText themeColor="textSecondary">
          Crea, ordena y cuida lo que quieres repetir cada día.
        </ThemedText>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ACTIVOS ({activeHabits.length})
          </ThemedText>
          {activeHabits.length ? (
            activeHabits.map((habit, index) => {
              const Icon = habitIconComponents[habit.icon];
              return (
                <View key={habit.id} style={styles.row}>
                  <View style={styles.orderActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Subir ${habit.name}`}
                      disabled={index === 0}
                      onPress={() => void actions.moveHabit(habit.id, -1)}
                      style={styles.iconButton}
                    >
                      <ArrowUp size={16} opacity={index === 0 ? 0.3 : 1} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Bajar ${habit.name}`}
                      disabled={index === activeHabits.length - 1}
                      onPress={() => void actions.moveHabit(habit.id, 1)}
                      style={styles.iconButton}
                    >
                      <ArrowDown
                        size={16}
                        opacity={index === activeHabits.length - 1 ? 0.3 : 1}
                      />
                    </Pressable>
                  </View>
                  <View
                    style={[styles.habitIcon, { backgroundColor: `${habit.color}30` }]}
                  >
                    <Icon size={20} color={habit.color} />
                  </View>
                  <View style={styles.habitCopy}>
                    <ThemedText>{habit.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {habit.description ?? "Hábito diario"}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${habit.name}`}
                    style={styles.iconButton}
                    onPress={() => openEdit(habit)}
                  >
                    <Pencil size={18} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Archivar ${habit.name}`}
                    style={styles.iconButton}
                    onPress={() => void archive(habit)}
                  >
                    <Archive size={18} />
                  </Pressable>
                </View>
              );
            })
          ) : (
            <ThemedText themeColor="textSecondary">
              No tienes hábitos activos.
            </ThemedText>
          )}

          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.sectionSpacing}
          >
            ARCHIVADOS ({archivedHabits.length})
          </ThemedText>
          {archivedHabits.length ? (
            archivedHabits.map((habit) => {
              const Icon = habitIconComponents[habit.icon];
              return (
                <View key={habit.id} style={styles.row}>
                  <View style={styles.habitIcon}>
                    <Icon size={19} color={habit.color} opacity={0.6} />
                  </View>
                  <View style={styles.habitCopy}>
                    <ThemedText themeColor="textSecondary">{habit.name}</ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Restaurar ${habit.name}`}
                    style={styles.iconButton}
                    onPress={() => void restore(habit)}
                  >
                    <RotateCcw size={18} />
                  </Pressable>
                </View>
              );
            })
          ) : (
            <ThemedText themeColor="textSecondary">Sin hábitos archivados.</ThemedText>
          )}
        </ScrollView>

        {toast ? (
          <View accessibilityRole="alert" style={styles.toast}>
            <ThemedText style={{ color: "white" }}>{toast}</ThemedText>
          </View>
        ) : null}
      </SafeAreaView>

      <HabitFormModal
        key={editingHabit?.id ?? "create"}
        open={formOpen}
        habit={editingHabit}
        onClose={() => setFormOpen(false)}
        onSaved={setToast}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.two, padding: Spacing.four },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  createButton: {
    backgroundColor: "#047857",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { gap: Spacing.two, paddingBottom: Spacing.four },
  sectionSpacing: { marginTop: Spacing.four },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: "#F0F0F3",
  },
  orderActions: { gap: 2 },
  iconButton: { padding: Spacing.one },
  habitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCopy: { flex: 1, gap: 2 },
  toast: {
    position: "absolute",
    bottom: Spacing.four,
    left: Spacing.four,
    right: Spacing.four,
    backgroundColor: "#111827",
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
});
