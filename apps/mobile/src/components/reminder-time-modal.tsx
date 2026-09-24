import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  formatReminderTime,
  isSameTime,
  MINUTE_STEP,
  parseManualTime,
  type Period,
  type ReminderTime,
  stepHour,
  stepMinute,
  to12Hour,
} from "@/lib/notifications/reminder-time";

// Atajos para los momentos típicos de revisar hábitos.
const PRESETS: readonly ReminderTime[] = [
  { hour: 8, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 30 },
];

type ReminderTimeModalProps = {
  open: boolean;
  // null = crear un recordatorio nuevo.
  initialTime: ReminderTime | null;
  onClose: () => void;
  // Devuelve un mensaje de error para mostrarlo en el modal, o null si se guardó.
  onSave: (time: ReminderTime) => Promise<string | null>;
};

// Se monta de nuevo cada vez que se abre (ver `key` en Ajustes), así que el
// borrador siempre parte de `initialTime`.
export function ReminderTimeModal({
  open,
  initialTime,
  onClose,
  onSave,
}: ReminderTimeModalProps) {
  const theme = useTheme();
  const start = initialTime ?? { hour: 20, minute: 0 };
  const [hourText, setHourText] = useState(String(to12Hour(start.hour).hour12));
  const [minuteText, setMinuteText] = useState(String(start.minute).padStart(2, "0"));
  const [period, setPeriod] = useState<Period>(to12Hour(start.hour).period);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = parseManualTime(hourText, minuteText, period);

  // Los botones −/+ y los atajos escriben en los mismos campos que el teclado.
  function showTime(time: ReminderTime) {
    const { hour12, period: nextPeriod } = to12Hour(time.hour);
    setHourText(String(hour12));
    setMinuteText(String(time.minute).padStart(2, "0"));
    setPeriod(nextPeriod);
    setError(null);
  }

  function step(change: (time: ReminderTime) => ReminderTime) {
    showTime(change(parsed.ok ? parsed.time : start));
  }

  async function save() {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    const saveError = await onSave(parsed.time);
    setSaving(false);
    if (saveError) setError(saveError);
  }

  const inputStyle = [
    styles.timeInput,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
  ];

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">
            {initialTime ? "Editar recordatorio" : "Nuevo recordatorio"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Escribe la hora o ajústala con los botones.
          </ThemedText>

          <View style={styles.timeRow}>
            <TextInput
              accessibilityLabel="Hora, del 1 al 12"
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              value={hourText}
              onChangeText={(text) => {
                setHourText(text);
                setError(null);
              }}
              style={inputStyle}
            />
            <ThemedText type="subtitle">:</ThemedText>
            <TextInput
              accessibilityLabel="Minutos, del 0 al 59"
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              value={minuteText}
              onChangeText={(text) => {
                setMinuteText(text);
                setError(null);
              }}
              style={inputStyle}
            />
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Mañana o tarde"
              style={styles.periodGroup}
            >
              {(["am", "pm"] as const).map((value) => {
                const selected = period === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={value === "am" ? "a. m." : "p. m."}
                    onPress={() => {
                      setPeriod(value);
                      setError(null);
                    }}
                    style={[
                      styles.periodOption,
                      {
                        borderColor: selected ? theme.tint : theme.border,
                        backgroundColor: selected
                          ? theme.tint + "1A"
                          : theme.background,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold">
                      {value === "am" ? "a. m." : "p. m."}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.stepperRow}>
            <TimeStepper
              label="Hora"
              unit="una hora"
              onStep={(delta) => step((time) => stepHour(time, delta))}
            />
            <TimeStepper
              label="Minutos"
              unit={`${MINUTE_STEP} minutos`}
              onStep={(delta) => step((time) => stepMinute(time, delta))}
            />
          </View>

          <ThemedText type="smallBold">Atajos</ThemedText>
          <View style={styles.presetRow}>
            {PRESETS.map((preset) => {
              const selected = parsed.ok && isSameTime(preset, parsed.time);
              const label = formatReminderTime(preset);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Usar ${label}`}
                  onPress={() => showTime(preset)}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: selected ? theme.tint : theme.border,
                      backgroundColor: selected ? theme.tint + "1A" : theme.background,
                    },
                  ]}
                >
                  <ThemedText type="small">{label}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <ThemedText style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="smallBold">Cancelar</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar recordatorio"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void save()}
              style={[
                styles.button,
                { backgroundColor: theme.tint },
                saving && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: "white" }}>
                {saving ? "Guardando…" : "Guardar"}
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function TimeStepper({
  label,
  unit,
  onStep,
}: {
  label: string;
  unit: string;
  onStep: (delta: 1 | -1) => void;
}) {
  const theme = useTheme();
  const buttonStyle = [
    styles.stepperButton,
    { borderColor: theme.border, backgroundColor: theme.background },
  ];
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Restar ${unit}`}
        hitSlop={6}
        onPress={() => onStep(-1)}
        style={buttonStyle}
      >
        <Minus size={18} color={theme.text} />
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sumar ${unit}`}
        hitSlop={6}
        onPress={() => onStep(1)}
        style={buttonStyle}
      >
        <Plus size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.three, padding: Spacing.four },
  timeRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  timeInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 28,
    textAlign: "center",
  },
  periodGroup: { flexDirection: "row", gap: Spacing.one, marginLeft: "auto" },
  periodOption: {
    minWidth: 48,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  stepperRow: { flexDirection: "row", gap: Spacing.four },
  stepper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  presetChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  error: { color: "#DC2626" },
  actions: { flexDirection: "row", gap: Spacing.two, marginTop: "auto" },
  button: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
});
