import { userSettingsSchema } from "@habit-tracker/domain";
import {
  Bell,
  Check,
  Cloud,
  ExternalLink,
  LogOut,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/card";
import { ReminderTimeModal } from "@/components/reminder-time-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session-provider";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";
import {
  compareTimes,
  formatReminderTime,
  isSameTime,
  MAX_REMINDERS,
  type ReminderTime,
} from "@/lib/notifications/reminder-time";
import {
  getReminderSettings,
  hasReminderPermission,
  newReminderId,
  type Reminder,
  type ReminderSettings,
  remindersSupported,
  requestReminderPermission,
  saveReminderSettings,
} from "@/lib/notifications/reminders";
import { supabase } from "@/lib/supabase/client";

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

  const [reminders, setReminders] = useState<ReminderSettings>({
    enabled: false,
    reminders: [],
  });
  const [reminderError, setReminderError] = useState<string | null>(null);
  // undefined = modal cerrado; null = creando uno nuevo; Reminder = editando.
  const [editing, setEditing] = useState<Reminder | null | undefined>(undefined);

  useEffect(() => {
    if (!remindersSupported) return;
    let cancelled = false;
    void Promise.all([getReminderSettings(), hasReminderPermission()])
      .then(([stored, granted]) => {
        if (cancelled) return;
        // Si el permiso se revocó desde el sistema, los recordatorios ya no
        // llegan: el toggle debe reflejarlo en vez de mostrarse activo.
        setReminders({ ...stored, enabled: stored.enabled && granted });
      })
      .catch(() => {
        if (!cancelled) setReminderError("No se pudieron leer los recordatorios.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Guarda y reprograma; si falla, la pantalla vuelve al estado anterior.
  async function persistReminders(next: ReminderSettings): Promise<boolean> {
    const previous = reminders;
    setReminders(next);
    setReminderError(null);
    try {
      await saveReminderSettings(next);
      return true;
    } catch {
      setReminders(previous);
      setReminderError("No se pudieron guardar los recordatorios. Inténtalo de nuevo.");
      return false;
    }
  }

  async function toggleReminders(nextEnabled: boolean) {
    setReminderError(null);
    try {
      if (nextEnabled && !(await requestReminderPermission())) {
        setReminderError(
          "Activa las notificaciones para Constancia en los ajustes del sistema.",
        );
        return;
      }
    } catch {
      setReminderError("No se pudo pedir el permiso de notificaciones.");
      return;
    }
    await persistReminders({ ...reminders, enabled: nextEnabled });
  }

  async function saveReminderTime(time: ReminderTime): Promise<string | null> {
    const others = reminders.reminders.filter((r) => r.id !== editing?.id);
    if (others.some((r) => isSameTime(r, time))) {
      return "Ya tienes un recordatorio a esa hora.";
    }
    const updated = editing
      ? { ...editing, ...time }
      : { id: newReminderId(), ...time };
    const saved = await persistReminders({
      ...reminders,
      reminders: [...others, updated].sort(compareTimes),
    });
    if (!saved) return "No se pudo guardar. Inténtalo de nuevo.";
    setEditing(undefined);
    return null;
  }

  function removeReminder(id: string) {
    void persistReminders({
      ...reminders,
      reminders: reminders.reminders.filter((r) => r.id !== id),
    });
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
                  <ThemedText type="smallBold">Recordatorios diarios</ThemedText>
                </View>
                <Bell size={20} color={theme.textSecondary} />
              </View>

              <View style={styles.reminderToggleRow}>
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  Recibir notificaciones para marcar tus hábitos.
                </ThemedText>
                <Switch
                  accessibilityLabel="Recordatorios diarios"
                  value={reminders.enabled}
                  onValueChange={(value) => void toggleReminders(value)}
                  trackColor={{ true: theme.tint }}
                />
              </View>

              {reminderError ? (
                <ThemedText type="small" style={styles.error} accessibilityRole="alert">
                  {reminderError}
                </ThemedText>
              ) : null}

              {reminders.enabled ? (
                <View style={styles.reminderList}>
                  {reminders.reminders.map((reminder) => {
                    const label = formatReminderTime(reminder);
                    const onlyOne = reminders.reminders.length === 1;
                    return (
                      <View
                        key={reminder.id}
                        style={[styles.reminderRow, { borderColor: theme.border }]}
                      >
                        <ThemedText type="subtitle" style={styles.reminderTime}>
                          {label}
                        </ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Editar recordatorio de las ${label}`}
                          hitSlop={10}
                          onPress={() => setEditing(reminder)}
                          style={styles.iconButton}
                        >
                          <Pencil size={18} color={theme.text} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar recordatorio de las ${label}`}
                          accessibilityState={{ disabled: onlyOne }}
                          disabled={onlyOne}
                          hitSlop={10}
                          onPress={() => removeReminder(reminder.id)}
                          style={[styles.iconButton, onlyOne && styles.buttonDisabled]}
                        >
                          <Trash2 size={18} color={theme.text} />
                        </Pressable>
                      </View>
                    );
                  })}

                  {reminders.reminders.length < MAX_REMINDERS ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Añadir recordatorio"
                      onPress={() => setEditing(null)}
                      style={[
                        styles.signOutButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    >
                      <Plus size={18} color={theme.text} />
                      <ThemedText type="smallBold">Añadir recordatorio</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Puedes tener hasta {MAX_REMINDERS} recordatorios.
                    </ThemedText>
                  )}

                  {Platform.OS === "android" ? (
                    <View style={styles.exactAlarmNote}>
                      <ThemedText type="small" themeColor="textSecondary">
                        ¿Los avisos llegan tarde? Permite «Alarmas y recordatorios» para
                        Constancia en los ajustes de la app.
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir ajustes de la app"
                        hitSlop={8}
                        onPress={() => void Linking.openSettings()}
                      >
                        <ThemedText type="smallBold" style={{ color: theme.tint }}>
                          Abrir ajustes
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
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

        {editing !== undefined ? (
          <ReminderTimeModal
            key={editing?.id ?? "new"}
            open
            initialTime={editing}
            onClose={() => setEditing(undefined)}
            onSave={saveReminderTime}
          />
        ) : null}

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
  reminderList: { gap: Spacing.two },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  reminderTime: { flex: 1 },
  iconButton: { padding: Spacing.one },
  exactAlarmNote: { gap: Spacing.one, marginTop: Spacing.one },
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
