import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { z } from "zod";

import { compareTimes, MAX_REMINDERS, type ReminderTime } from "./reminder-time";

// Registrado al importar este módulo (ver app/_layout.tsx) para que, si llega
// una notificación con la app en primer plano, se muestre igual — sin esto el
// comportamiento por defecto varía entre plataformas.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEY = "habit-tracker:reminder";
// Todas las notificaciones de la app llevan este prefijo, así que reprogramar
// cancela exactamente las nuestras. Incluye el identificador único de la
// versión con un solo recordatorio ("habit-tracker-daily-reminder").
const NOTIFICATION_PREFIX = "habit-tracker-";
const ANDROID_CHANNEL_ID = "reminders";

// expo-notifications no programa notificaciones locales en web (Expo web se usa
// solo como banco de pruebas), así que la sección se oculta ahí.
export const remindersSupported = Platform.OS !== "web";

export type Reminder = ReminderTime & { id: string };

export type ReminderSettings = {
  enabled: boolean;
  reminders: Reminder[];
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  reminders: [{ id: "default", hour: 20, minute: 0 }],
};

const timeFields = {
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
};
const settingsSchema = z.object({
  enabled: z.boolean(),
  reminders: z
    .array(z.object({ id: z.string().min(1), ...timeFields }))
    .min(1)
    .max(MAX_REMINDERS),
});
// Formato guardado por la versión con un solo recordatorio.
const legacySchema = z.object({ enabled: z.boolean(), ...timeFields });

export function parseStoredSettings(raw: string | null): ReminderSettings {
  if (!raw) return DEFAULT_SETTINGS;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  const current = settingsSchema.safeParse(json);
  if (current.success) return current.data;
  const legacy = legacySchema.safeParse(json);
  if (legacy.success) {
    const { enabled, hour, minute } = legacy.data;
    return { enabled, reminders: [{ id: "default", hour, minute }] };
  }
  return DEFAULT_SETTINGS;
}

export function newReminderId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Preferencia solo del dispositivo (no viaja por Supabase): un recordatorio
// programado en el sistema operativo no tiene sentido sincronizarlo entre
// dispositivos, cada instalación necesita el suyo.
export async function getReminderSettings(): Promise<ReminderSettings> {
  return parseStoredSettings(await AsyncStorage.getItem(STORAGE_KEY));
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Recordatorios de hábitos",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function hasReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

// false si el usuario niega el permiso — quien llama debe revertir el toggle.
export async function requestReminderPermission(): Promise<boolean> {
  // En Android 13+ el diálogo de permiso solo aparece si ya existe al menos un
  // canal, así que se crea antes de pedirlo.
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Cada cambio cancela y reprograma; si dos cambios seguidos (p. ej. pulsar
// "+" varias veces) se ejecutaran a la vez, el último en terminar podría no ser
// el último pedido. La cola los aplica en orden.
let pending: Promise<void> = Promise.resolve();

export function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  const run = pending.then(() => applyReminderSettings(settings));
  pending = run.catch(() => undefined);
  return run;
}

async function applyReminderSettings(settings: ReminderSettings): Promise<void> {
  const valid = settingsSchema.parse(settings);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const { identifier } of scheduled) {
    if (identifier.startsWith(NOTIFICATION_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  }
  if (!valid.enabled) return;

  await ensureAndroidChannel();
  for (const reminder of [...valid.reminders].sort(compareTimes)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_PREFIX}reminder-${reminder.id}`,
      content: {
        title: "Constancia",
        body: "No olvides marcar tus hábitos de hoy.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: ANDROID_CHANNEL_ID,
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });
  }

  if (__DEV__) {
    // Diagnóstico en desarrollo: lo que el sistema tiene programado de verdad,
    // visible en los logs de Metro.
    const now = await Notifications.getAllScheduledNotificationsAsync();
    console.log(
      "[recordatorios] programados:",
      now.map((n) => n.identifier),
    );
  }
}
