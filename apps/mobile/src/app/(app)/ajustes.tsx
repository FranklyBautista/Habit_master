import { userSettingsSchema } from "@habit-tracker/domain";
import {
  Bell,
  Cloud,
  ExternalLink,
  LogOut,
  Moon,
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { UserCodeSection } from "@/components/groups/user-code-section";
import { ReminderTimeModal } from "@/components/reminder-time-modal";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Toast } from "@/components/toast";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session-provider";
import { saveColorSchemePreference } from "@/lib/color-scheme-preference";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";
import {
  compareTimes,
  formatReminderDate,
  formatReminderTime,
  isSameTime,
  MAX_REMINDERS,
  type ReminderTime,
} from "@/lib/notifications/reminder-time";
import {
  getNextReminderDate,
  getReminderSettings,
  hasReminderPermission,
  newReminderId,
  type Reminder,
  type ReminderSettings,
  remindersSupported,
  requestReminderPermission,
  saveReminderSettings,
  scheduleTestReminder,
} from "@/lib/notifications/reminders";
import { supabase } from "@/lib/supabase/client";

// La política vive en la web de producción (`/privacidad`, pública). Es la
// misma URL que se declara en las fichas de Play Store/App Store.
const PRIVACY_URL = "https://habit-master-web.vercel.app/privacidad";

export default function AjustesScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const { session } = useSession();
  const theme = useTheme();
  const darkMode = useColorScheme() === "dark";
  const [appearanceError, setAppearanceError] = useState<string | null>(null);

  const [name, setName] = useState(snapshot.settings.displayName);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const [reminders, setReminders] = useState<ReminderSettings>({
    enabled: false,
    reminders: [],
  });
  const [reminderError, setReminderError] = useState<string | null>(null);
  // Diagnóstico: `undefined` mientras se consulta al sistema.
  const [nextReminder, setNextReminder] = useState<Date | null | undefined>();
  const [testReminderAt, setTestReminderAt] = useState<Date | null>(null);
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
        refreshNextReminder();
      })
      .catch(() => {
        if (!cancelled) setReminderError("No se pudieron leer los recordatorios.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleDarkMode(nextDark: boolean) {
    setAppearanceError(null);
    try {
      await saveColorSchemePreference(nextDark ? "dark" : "light");
    } catch {
      setAppearanceError(
        "No se pudo guardar el modo. Se aplicará solo en esta sesión.",
      );
    }
  }

  function refreshNextReminder() {
    getNextReminderDate()
      .then(setNextReminder)
      .catch(() => setNextReminder(null));
  }

  async function sendTestReminder() {
    setReminderError(null);
    try {
      setTestReminderAt(await scheduleTestReminder());
    } catch {
      setReminderError("No se pudo programar el aviso de prueba.");
    }
  }

  // Guarda y reprograma; si falla, la pantalla vuelve al estado anterior.
  async function persistReminders(next: ReminderSettings): Promise<boolean> {
    const previous = reminders;
    setReminders(next);
    setReminderError(null);
    try {
      await saveReminderSettings(next);
      refreshNextReminder();
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

  async function save() {
    const result = userSettingsSchema.safeParse({
      displayName: name,
      // Solo se edita el nombre: la zona la mantiene sincronizada el store con
      // la del teléfono.
      timezone: snapshot.settings.timezone,
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
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <ThemedText type="subtitle" style={{ color: theme.onAccent }}>
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
              <TextField
                accessibilityLabel="Nombre"
                value={name}
                onChangeText={setName}
                maxLength={60}
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
              <ThemedText>{snapshot.settings.timezone}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Se toma automáticamente del reloj del teléfono y sirve para asignar cada
                check-in al día correcto.
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                La semana inicia
              </ThemedText>
              <ThemedText>Lunes</ThemedText>
            </View>

            {error ? (
              <ThemedText
                type="small"
                style={{ color: theme.danger }}
                accessibilityRole="alert"
              >
                {error}
              </ThemedText>
            ) : null}

            <Button
              label={snapshot.syncing ? "Guardando…" : "Guardar cambios"}
              accessibilityLabel="Guardar cambios"
              disabled={snapshot.syncing}
              onPress={() => void save()}
            />
          </Card>

          <Card style={styles.card}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <ThemedText type="small" themeColor="textSecondary">
                  APARIENCIA
                </ThemedText>
                <ThemedText type="smallBold">Modo oscuro</ThemedText>
              </View>
              <Moon size={20} color={theme.textSecondary} />
            </View>

            <View style={styles.reminderToggleRow}>
              <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                Usa colores oscuros en toda la aplicación.
              </ThemedText>
              <Switch
                accessibilityLabel="Modo oscuro"
                value={darkMode}
                onValueChange={(value) => void toggleDarkMode(value)}
                trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                thumbColor={
                  Platform.OS === "android"
                    ? darkMode
                      ? theme.onAccent
                      : theme.textSecondary
                    : undefined
                }
                ios_backgroundColor={theme.backgroundSelected}
              />
            </View>

            {appearanceError ? (
              <ThemedText
                type="small"
                style={{ color: theme.danger }}
                accessibilityRole="alert"
              >
                {appearanceError}
              </ThemedText>
            ) : null}
          </Card>

          <UserCodeSection />

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
                  trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                  thumbColor={
                    Platform.OS === "android"
                      ? reminders.enabled
                        ? theme.onAccent
                        : theme.textSecondary
                      : undefined
                  }
                  ios_backgroundColor={theme.backgroundSelected}
                />
              </View>

              {reminderError ? (
                <ThemedText
                  type="small"
                  style={{ color: theme.danger }}
                  accessibilityRole="alert"
                >
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
                    <Button
                      label="Añadir recordatorio"
                      variant="outline"
                      icon={(color) => <Plus size={18} color={color} />}
                      onPress={() => setEditing(null)}
                    />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Puedes tener hasta {MAX_REMINDERS} recordatorios.
                    </ThemedText>
                  )}

                  <View style={styles.exactAlarmNote}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {nextReminder === undefined
                        ? "Comprobando los avisos programados…"
                        : nextReminder
                          ? `Próximo aviso: ${formatReminderDate(nextReminder)}.`
                          : "El sistema no tiene ningún aviso programado. Desactiva y vuelve a activar los recordatorios."}
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Probar recordatorio"
                      hitSlop={8}
                      onPress={() => void sendTestReminder()}
                    >
                      <ThemedText type="smallBold" style={{ color: theme.tint }}>
                        Probar recordatorio
                      </ThemedText>
                    </Pressable>
                    {testReminderAt ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Te llegará un aviso de prueba{" "}
                        {formatReminderDate(testReminderAt)}. Sal de la app o bloquea el
                        teléfono para comprobar que llega a su hora.
                      </ThemedText>
                    ) : null}
                  </View>

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

          <Button
            label="Política de privacidad"
            accessibilityRole="link"
            variant="secondary"
            icon={(color) => <ExternalLink size={18} color={color} />}
            onPress={() => void Linking.openURL(PRIVACY_URL)}
          />

          <Button
            label="Cerrar sesión"
            variant="outline"
            icon={() => <LogOut size={18} color={theme.danger} />}
            onPress={() => void supabase.auth.signOut()}
          />
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
          <Toast
            message="Tus preferencias se guardaron."
            onDismiss={() => setToast(false)}
          />
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
    borderRadius: Radius.md,
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
  buttonDisabled: { opacity: 0.6 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.three },
  noteCopy: { flex: 1, gap: 2 },
});
