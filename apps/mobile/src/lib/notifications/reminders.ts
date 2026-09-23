import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
// Fijo a propósito: solo existe un recordatorio diario, así que reprogramar
// con el mismo identificador reemplaza el anterior en vez de acumular.
const NOTIFICATION_ID = "habit-tracker-daily-reminder";

export type ReminderPreference = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_PREFERENCE: ReminderPreference = { enabled: false, hour: 20, minute: 0 };

// Preferencia solo del dispositivo (no viaja por Supabase): un recordatorio
// programado en el sistema operativo no tiene sentido sincronizarlo entre
// dispositivos, cada instalación necesita el suyo.
export async function getReminderPreference(): Promise<ReminderPreference> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCE;
  try {
    return { ...DEFAULT_PREFERENCE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Recordatorios de hábitos",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// false si el usuario niega el permiso — quien llama debe revertir el toggle.
export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function setReminderPreference(
  preference: ReminderPreference,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  if (!preference.enabled) return;

  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: "Constancia",
      body: "No olvides marcar tus hábitos de hoy.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: preference.hour,
      minute: preference.minute,
    },
  });
}
