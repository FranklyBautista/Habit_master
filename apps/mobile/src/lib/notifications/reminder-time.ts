export type ReminderTime = { hour: number; minute: number };

// Paso de los minutos en el selector: suficiente precisión para un
// recordatorio diario sin obligar a pulsar 59 veces.
export const MINUTE_STEP = 5;

// Horas y minutos dan la vuelta (23 → 0, 55 → 0) para que el selector nunca
// quede bloqueado en un extremo.
export function stepHour(time: ReminderTime, delta: 1 | -1): ReminderTime {
  return { ...time, hour: (time.hour + delta + 24) % 24 };
}

export function stepMinute(time: ReminderTime, delta: 1 | -1): ReminderTime {
  // Alinea al múltiplo de MINUTE_STEP antes de moverse, por si la preferencia
  // guardada trae un minuto fuera de la rejilla.
  const aligned =
    delta > 0
      ? Math.floor(time.minute / MINUTE_STEP) * MINUTE_STEP
      : Math.ceil(time.minute / MINUTE_STEP) * MINUTE_STEP;
  return { ...time, minute: (aligned + delta * MINUTE_STEP + 60) % 60 };
}

// Formato de 12 horas en español, igual que los atajos: "8:00 a. m.".
export function formatReminderTime({ hour, minute }: ReminderTime): string {
  const period = hour < 12 ? "a. m." : "p. m.";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

export function isSameTime(a: ReminderTime, b: ReminderTime): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

// Límite de recordatorios diarios: suficiente para mañana/tarde/noche sin
// convertir la app en una fuente de ruido.
export const MAX_REMINDERS = 5;

export type Period = "am" | "pm";

export function to12Hour(hour: number): { hour12: number; period: Period } {
  return { hour12: hour % 12 === 0 ? 12 : hour % 12, period: hour < 12 ? "am" : "pm" };
}

export function from12Hour(hour12: number, period: Period): number {
  return (hour12 % 12) + (period === "pm" ? 12 : 0);
}

export type ManualTimeResult =
  { ok: true; time: ReminderTime } | { ok: false; error: string };

// Valida lo escrito a mano en el modal (formato de 12 horas, como el resto de
// la pantalla). Solo dígitos: "8" y "08" valen, "8a" o "" no.
export function parseManualTime(
  hourText: string,
  minuteText: string,
  period: Period,
): ManualTimeResult {
  const hour12 = /^\d{1,2}$/.test(hourText.trim()) ? Number(hourText) : NaN;
  if (!(hour12 >= 1 && hour12 <= 12)) {
    return { ok: false, error: "La hora debe ser un número del 1 al 12." };
  }
  const minute = /^\d{1,2}$/.test(minuteText.trim()) ? Number(minuteText) : NaN;
  if (!(minute >= 0 && minute <= 59)) {
    return { ok: false, error: "Los minutos deben ser un número del 0 al 59." };
  }
  return { ok: true, time: { hour: from12Hour(hour12, period), minute } };
}

export function compareTimes(a: ReminderTime, b: ReminderTime): number {
  return a.hour * 60 + a.minute - (b.hour * 60 + b.minute);
}
