import {
  createHabitInputSchema,
  type Habit,
  habitColors,
  habitIcons,
} from "@habit-tracker/domain";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useHabitActions } from "@/lib/habit-store";

import { habitIconComponents } from "./habit-icons";

type HabitFormModalProps = {
  open: boolean;
  habit?: Habit | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

// Mirrors apps/web/src/components/habit-form-dialog.tsx: same schema
// (createHabitInputSchema for both create and update), same fields.
export function HabitFormModal({ open, habit, onClose, onSaved }: HabitFormModalProps) {
  const actions = useHabitActions();
  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [color, setColor] = useState(habit?.color ?? habitColors[0]);
  const [icon, setIcon] = useState(habit?.icon ?? "sparkles");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetAndClose() {
    setError(null);
    onClose();
  }

  async function submit() {
    const result = createHabitInputSchema.safeParse({
      name,
      description: description.trim() || null,
      color,
      icon,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos del hábito.");
      return;
    }
    setSubmitting(true);
    const saved = habit
      ? await actions.updateHabit(habit.id, result.data)
      : await actions.createHabit(result.data);
    setSubmitting(false);
    if (!saved) {
      setError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    onSaved(habit ? "Hábito actualizado." : "Hábito creado y añadido a Hoy.");
    resetAndClose();
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={resetAndClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">
            {habit ? "Editar hábito" : "Crear hábito"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Los cambios se guardan en tu cuenta.
          </ThemedText>

          <ThemedText type="smallBold">Nombre</ThemedText>
          <TextInput
            accessibilityLabel="Nombre"
            maxLength={60}
            placeholder="Por ejemplo, beber agua"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <ThemedText type="smallBold">Descripción (opcional)</ThemedText>
          <TextInput
            accessibilityLabel="Descripción"
            maxLength={160}
            multiline
            numberOfLines={3}
            placeholder="Cuándo o cómo quieres hacerlo"
            style={[styles.input, styles.multiline]}
            value={description ?? ""}
            onChangeText={setDescription}
          />

          <ThemedText type="smallBold">Color</ThemedText>
          <View style={styles.swatchRow}>
            {habitColors.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: color === value }}
                accessibilityLabel={`Color ${value}`}
                onPress={() => setColor(value)}
                style={[
                  styles.swatch,
                  { backgroundColor: value },
                  color === value && styles.swatchSelected,
                ]}
              />
            ))}
          </View>

          <ThemedText type="smallBold">Icono</ThemedText>
          <View style={styles.swatchRow}>
            {habitIcons.map((value) => {
              const Icon = habitIconComponents[value];
              const selected = icon === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Icono ${value}`}
                  onPress={() => setIcon(value)}
                  style={[styles.iconOption, selected && styles.iconOptionSelected]}
                >
                  <Icon size={20} />
                </Pressable>
              );
            })}
          </View>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={resetAndClose}
            >
              <ThemedText type="smallBold">Cancelar</ThemedText>
            </Pressable>
            <Pressable
              disabled={submitting}
              style={[
                styles.button,
                styles.buttonPrimary,
                submitting && styles.buttonDisabled,
              ]}
              onPress={submit}
            >
              <ThemedText type="smallBold" style={{ color: "white" }}>
                {submitting ? "Guardando…" : habit ? "Guardar" : "Crear hábito"}
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.two, padding: Spacing.four },
  input: {
    borderWidth: 1,
    borderColor: "#8888",
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: "#111827" },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F3",
  },
  iconOptionSelected: { backgroundColor: "#E0E1E6" },
  error: { color: "#DC2626" },
  actions: { flexDirection: "row", gap: Spacing.two, marginTop: "auto" },
  button: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#F0F0F3" },
  buttonPrimary: { backgroundColor: "#047857" },
  buttonDisabled: { opacity: 0.6 },
});
