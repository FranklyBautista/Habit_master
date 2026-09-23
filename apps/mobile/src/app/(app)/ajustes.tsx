import { userSettingsSchema } from "@habit-tracker/domain";
import {
  Bell,
  Check,
  Cloud,
  ExternalLink,
  LogOut,
  SlidersHorizontal,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session-provider";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";
import {
  getReminderPreference,
  hasReminderPermission,
  remindersSupported,
  requestReminderPermission,
  setReminderPreference,
} from "@/lib/notifications/reminders";
import { supabase } from "@/lib/supabase/client";

// Horas preestablecidas en vez de un selector libre: cubre los momentos
// típicos para revisar hábitos sin necesitar un componente de reloj nuevo.
const REMINDER_TIME_OPTIONS = [
  { hour: 8, minute: 0, label: "8:00 a. m." },
  { hour: 13, minute: 0, label: "1:00 p. m." },
  { hour: 20, minute: 0, label: "8:00 p. m." },
  { hour: 21, minute: 30, label: "9:30 p. m." },
] as const;

// La política vive en la web de producción (`/privacidad`, pública). Es la
// misma URL que se declara en las fichas de Play Store/App Store.
const PRIVACY_URL = "https://habit-master-web.vercel.app/privacidad";

// Same fixed shortlist the web Ajustes screen offers; the profile's current
// timezone is prepended when it isn't already one of these so it never
// disappears from the list.
const BASE_TIMEZONES = [
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "Europe/Madrid",
];

export default function AjustesScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const { session } = useSession();
  const theme = useTheme();

  const [name, setName] = useState(snapshot.settings.displayName);
  const [timezone, setTimezone] = useState(snapshot.settings.timezone);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<{ hour: number; minute: number }>(
    REMINDER_TIME_OPTIONS[2],
  );
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    if (!remindersSupported) return;
    let cancelled = false;
    void Promise.all([getReminderPreference(), hasReminderPermission()])
      .then(([preference, granted]) => {
        if (cancelled) return;
        // Si el permiso se revocó desde el sistema, el recordatorio ya no llega:
        // el toggle debe reflejarlo en vez de mostrarse activo.
        setReminderEnabled(preference.enabled && granted);
        setReminderTime({ hour: preference.hour, minute: preference.minute });
      })
      .catch(() => {
        if (!cancelled) setReminderError("No se pudo leer el recordatorio.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleReminder(nextEnabled: boolean) {
    setReminderError(null);
    try {
      if (nextEnabled && !(await requestReminderPermission())) {
        setReminderError(
          "Activa las notificaciones para Constancia en los ajustes del sistema.",
        );
        return;
      }
      await setReminderPreference({ enabled: nextEnabled, ...reminderTime });
      setReminderEnabled(nextEnabled);
    } catch {
      setReminderError("No se pudo actualizar el recordatorio. Inténtalo de nuevo.");
    }
  }

  async function selectReminderTime(time: { hour: number; minute: number }) {
    setReminderError(null);
    const previous = reminderTime;
    setReminderTime(time);
    try {
      await setReminderPreference({ enabled: reminderEnabled, ...time });
    } catch {
      setReminderTime(previous);
      setReminderError("No se pudo cambiar la hora del recordatorio.");
    }
  }

  const timezoneOptions = BASE_TIMEZONES.includes(snapshot.settings.timezone)
    ? BASE_TIMEZONES
    : [snapshot.settings.timezone, ...BASE_TIMEZONES];

  async function save() {
    const result = userSettingsSchema.safeParse({
      displayName: name,
      timezone,
      locale: "es",
      weekStartsOn: 1,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa las preferencias.");
      return;
    }
    setError(null);
    const saved = await actions.updateSettings(result.data);
    if (saved) setToast(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Ajustes</ThemedText>
        <ThemedText themeColor="textSecondary">
          Adapta la experiencia a tu forma de organizarte.
        </ThemedText>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <View style={styles.accountRow}>
              <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: "white" }}>
                  {name.slice(0, 1).toUpperCase() || "?"}
                </ThemedText>
              </View>
              <View style={styles.accountCopy}>
                <ThemedText type="smallBold">Cuenta sincronizada</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {session?.user.email ?? "Tu sesión está protegida por Supabase."}
                </ThemedText>
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <ThemedText type="small" themeColor="textSecondary">
                  TU CONTEXTO
                </ThemedText>
                <ThemedText type="smallBold">Preferencias regionales</ThemedText>
              </View>
              <SlidersHorizontal size={20} color={theme.textSecondary} />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Nombre
              </ThemedText>
              <TextInput
                accessibilityLabel="Nombre"
                value={name}
                onChangeText={setName}
                maxLength={60}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Idioma
              </ThemedText>
              <ThemedText>Español</ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Zona horaria
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Se usa para asignar cada check-in al día correcto.
              </ThemedText>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Zona horaria"
                style={styles.timezoneList}
              >
                {timezoneOptions.map((option) => {
                  const selected = option === timezone;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option}
                      onPress={() => setTimezone(option)}
                      style={[
                        styles.timezoneOption,
                        {
                          borderColor: selected ? theme.tint : theme.border,
                          backgroundColor: selected
                            ? theme.tint + "1A"
                            : theme.background,
                        },
                      ]}
                    >
                      <ThemedText type="small">{option}</ThemedText>
                      {selected ? <Check size={16} color={theme.tint} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                La semana inicia
              </ThemedText>
              <ThemedText>Lunes</ThemedText>
            </View>

            {error ? (
              <ThemedText type="small" style={styles.error} accessibilityRole="alert">
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
              accessibilityState={{ disabled: snapshot.syncing }}
              disabled={snapshot.syncing}
              onPress={() => void save()}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.tint },
                snapshot.syncing && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: "white" }}>
                {snapshot.syncing ? "Guardando…" : "Guardar cambios"}
              </ThemedText>
            </Pressable>
          </Card>

          {remindersSupported ? (
            <Card style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionCopy}>
                  <ThemedText type="small" themeColor="textSecondary">
                    MANTENTE AL DÍA
                  </ThemedText>
                  <ThemedText type="smallBold">Recordatorio diario</ThemedText>
                </View>
                <Bell size={20} color={theme.textSecondary} />
              </View>

              <View style={styles.reminderToggleRow}>
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  Recibir una notificación para marcar tus hábitos.
                </ThemedText>
                <Switch
                  accessibilityLabel="Recordatorio diario"
                  value={reminderEnabled}
                  onValueChange={(value) => void toggleReminder(value)}
                  trackColor={{ true: theme.tint }}
                />
              </View>

              {reminderError ? (
                <ThemedText type="small" style={styles.error} accessibilityRole="alert">
                  {reminderError}
                </ThemedText>
              ) : null}

              {reminderEnabled ? (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Hora del recordatorio"
                  style={styles.timezoneList}
                >
                  {REMINDER_TIME_OPTIONS.map((option) => {
                    const selected =
                      option.hour === reminderTime.hour &&
                      option.minute === reminderTime.minute;
                    return (
                      <Pressable
                        key={option.label}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}
                        onPress={() => void selectReminderTime(option)}
                        style={[
                          styles.timezoneOption,
                          {
                            borderColor: selected ? theme.tint : theme.border,
                            backgroundColor: selected
                              ? theme.tint + "1A"
                              : theme.background,
                          },
                        ]}
                      >
                        <ThemedText type="small">{option.label}</ThemedText>
                        {selected ? <Check size={16} color={theme.tint} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          ) : null}

          <Card style={[styles.card, styles.noteCard]}>
            <Cloud size={20} color={theme.textSecondary} />
            <View style={styles.noteCopy}>
              <ThemedText type="smallBold">Servidor como fuente de verdad</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Los cambios se refrescan después de cada mutación y al volver a enfocar
                la aplicación.
              </ThemedText>
            </View>
          </Card>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Política de privacidad"
            onPress={() => void Linking.openURL(PRIVACY_URL)}
            style={[
              styles.signOutButton,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
          >
            <ExternalLink size={18} color={theme.text} />
            <ThemedText type="smallBold">Política de privacidad</ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={() => void supabase.auth.signOut()}
            style={[
              styles.signOutButton,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
          >
            <LogOut size={18} color={theme.text} />
            <ThemedText type="smallBold">Cerrar sesión</ThemedText>
          </Pressable>
        </ScrollView>

        {toast ? (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setToast(false)}
            style={styles.toast}
          >
            <ThemedText style={{ color: "white" }}>
              Tus preferencias se guardaron.
            </ThemedText>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    gap: Spacing.two,
    padding: Spacing.four,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  scrollContent: { gap: Spacing.three, paddingVertical: Spacing.three },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  accountRow: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  accountCopy: { flex: 1, gap: 2 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCopy: { gap: 2 },
  reminderToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
  },
  timezoneList: { gap: Spacing.two, marginTop: Spacing.one },
  timezoneOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  error: { color: "#DC2626" },
  primaryButton: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.three },
  noteCopy: { flex: 1, gap: 2 },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
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
