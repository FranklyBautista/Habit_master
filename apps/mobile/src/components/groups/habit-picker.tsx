import { groupLimits, type Habit } from "@habit-tracker/domain";
import { Check, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { HabitFormModal } from "@/components/habit-form-modal";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHabitStore } from "@/lib/habit-store";

import { FieldError } from "./group-ui";

/** Hábitos que se pueden compartir: propios y activos (ADR 0002 §3). */
export function useShareableHabits(): Habit[] {
  const { habits } = useHabitStore();
  return habits
    .filter((habit) => !habit.archivedAt)
    .sort((a, b) => a.position - b.position);
}

// Casillas para elegir qué hábitos se comparten en un grupo (0–10). Con
// `allowCreate`, "Crear un hábito nuevo" abre el formulario de siempre y deja el
// hábito recién creado ya marcado.
export function HabitPicker({
  selected,
  onChange,
  allowCreate = false,
}: {
  selected: string[];
  onChange: (habitIds: string[]) => void;
  allowCreate?: boolean;
}) {
  const theme = useTheme();
  const habits = useShareableHabits();
  const [formOpen, setFormOpen] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);

  // Al cerrar el formulario, el hábito nuevo es el que no estaba antes. Ya
  // está en el store: createHabit espera a la re-consulta antes de resolver.
  useEffect(() => {
    const known = knownIdsRef.current;
    if (formOpen || !known) return;
    knownIdsRef.current = null;
    const created = habits.filter((habit) => !known.has(habit.id)).map((h) => h.id);
    if (created.length && selected.length < groupLimits.maxSharedHabitsPerGroup) {
      onChange([...selected, ...created].slice(0, groupLimits.maxSharedHabitsPerGroup));
    }
  }, [formOpen, habits, onChange, selected]);

  function toggle(habitId: string) {
    setLimitError(null);
    if (selected.includes(habitId)) {
      onChange(selected.filter((id) => id !== habitId));
      return;
    }
    if (selected.length >= groupLimits.maxSharedHabitsPerGroup) {
      setLimitError(
        `Puedes compartir como máximo ${groupLimits.maxSharedHabitsPerGroup} hábitos por grupo.`,
      );
      return;
    }
    onChange([...selected, habitId]);
  }

  return (
    <View style={styles.list}>
      {habits.length ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Aún no tienes hábitos activos.
        </ThemedText>
      )}
      {habits.map((habit) => {
        const checked = selected.includes(habit.id);
        return (
          <Pressable
            key={habit.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={habit.name}
            onPress={() => toggle(habit.id)}
            style={[
              styles.row,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: checked ? habit.color : theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: habit.color },
                checked && { backgroundColor: habit.color },
              ]}
            >
              {checked ? <Check size={16} color="#FFFFFF" /> : null}
            </View>
            <ThemedText style={styles.name}>{habit.name}</ThemedText>
          </Pressable>
        );
      })}
      <FieldError message={limitError} />
      {allowCreate ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear un hábito nuevo"
            onPress={() => {
              knownIdsRef.current = new Set(habits.map((habit) => habit.id));
              setFormOpen(true);
            }}
            style={[styles.row, { borderColor: theme.border, borderStyle: "dashed" }]}
          >
            <Plus size={20} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Crear un hábito nuevo
            </ThemedText>
          </Pressable>
          {formOpen ? (
            <HabitFormModal
              open
              onClose={() => setFormOpen(false)}
              onSaved={() => undefined}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    minHeight: 48,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1 },
});
