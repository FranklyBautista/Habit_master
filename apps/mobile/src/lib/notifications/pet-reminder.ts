import * as Notifications from "expo-notifications";

import {
  ANDROID_CHANNEL_ID,
  ensureAndroidChannel,
  getReminderSettings,
  hasReminderPermission,
  PET_REMINDER_ID,
  remindersSupported,
} from "./reminders";

// Aviso "Tu pulpito tiene hambre" (C6, docs/product/MASCOTA_GRUPO.md). Un solo
// aviso local para hoy a las 20:00 si la mascota de algún grupo no ha comido.
// Se recalcula cada vez que se cargan los grupos o cambian los check-ins: si
// ya comió (o pasó la hora) se cancela. Solo se programa si el usuario activó
// los recordatorios en Ajustes y concedió el permiso; nunca lo pide.

export const PET_REMINDER_HOUR = 20;

export type HungryGroup = { name: string };

export type PetReminderPlan = { date: Date; body: string };

/**
 * Cuándo y qué avisar. La hora es la del reloj del dispositivo (el aviso lo
 * dispara el sistema operativo), no una fecha de calendario de hábitos.
 */
export function petReminderPlan(
  hungry: HungryGroup[],
  now: Date = new Date(),
): PetReminderPlan | null {
  if (hungry.length === 0) return null;
  const date = new Date(now);
  date.setHours(PET_REMINDER_HOUR, 0, 0, 0);
  if (date.getTime() <= now.getTime()) return null;
  const body =
    hungry.length === 1
      ? `El pulpito de ${hungry[0].name} tiene hambre: marca tus hábitos compartidos.`
      : `Los pulpitos de ${hungry.length} grupos tienen hambre: marca tus hábitos compartidos.`;
  return { date, body };
}

// Cada sincronización cancela y vuelve a programar; la cola evita que dos
// seguidas se crucen y gane la que empezó antes.
let pending: Promise<void> = Promise.resolve();

export function syncPetReminder(
  hungry: HungryGroup[],
  now: Date = new Date(),
): Promise<void> {
  if (!remindersSupported) return Promise.resolve();
  const run = pending.then(async () => {
    await Notifications.cancelScheduledNotificationAsync(PET_REMINDER_ID);
    const plan = petReminderPlan(hungry, now);
    if (!plan) return;
    const settings = await getReminderSettings();
    if (!settings.enabled || !(await hasReminderPermission())) return;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: PET_REMINDER_ID,
      content: { title: "Constancia", body: plan.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  });
  pending = run.catch(() => undefined);
  return run;
}
