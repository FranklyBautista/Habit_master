import {
  createHabitInputSchema,
  type Habit,
  habitColors,
  habitIcons,
} from "@habit-tracker/domain";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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
  const theme = useTheme();
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
          <TextField
            accessibilityLabel="Nombre"
            maxLength={60}
            placeholder="Por ejemplo, beber agua"
            value={name}
            onChangeText={setName}
          />

          <ThemedText type="smallBold">Descripción (opcional)</ThemedText>
          <TextField
            accessibilityLabel="Descripción"
            maxLength={160}
            multiline
            numberOfLines={3}
            placeholder="Cuándo o cómo quieres hacerlo"
            style={styles.multiline}
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
                  styles.swatchRing,
                  { borderColor: color === value ? theme.text : "transparent" },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: value }]} />
              </Pressable>
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
                  style={[
                    styles.iconOption,
                    selected
                      ? { backgroundColor: theme.accentSoft, borderColor: theme.tint }
                      : {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.border,
                        },
                  ]}
                >
                  <Icon size={20} color={selected ? theme.tint : theme.text} />
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Cancelar"
              variant="secondary"
              style={styles.actionButton}
              onPress={resetAndClose}
            />
            <Button
              label={submitting ? "Guardando…" : habit ? "Guardar" : "Crear hábito"}
              accessibilityLabel={habit ? "Guardar" : "Crear hábito"}
              disabled={submitting}
              style={styles.actionButton}
              onPress={submit}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.two, padding: Spacing.four },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", gap: Spacing.two, marginTop: "auto" },
  actionButton: { flex: 1 },
});
