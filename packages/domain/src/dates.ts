import type { Habit } from "./entities";

import { addDays, addMonths } from "date-fns";

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// Un hábito cuenta en un día si ya había empezado, no está archivado desde
// ese día o antes, y el día no cae dentro de un archivado anterior ya
// restaurado. Cada ventana es [día local de archivado, día local de
// restauración): el día en que se archiva deja de contar y el día en que se
// restaura vuelve a contar (se puede marcar ese mismo día).
export function isHabitActiveOnDate(
  habit: Habit,
  dateKey: string,
  timezone: string,
): boolean {
  if (habit.startDate > dateKey) return false;
  if (
    habit.archivedAt &&
    getLocalDateKey(new Date(habit.archivedAt), timezone) <= dateKey
  ) {
    return false;
  }
  return !habit.archivePeriods.some(
    (period) =>
      getLocalDateKey(new Date(period.archivedAt), timezone) <= dateKey &&
      dateKey < getLocalDateKey(new Date(period.restoredAt), timezone),
  );
}

export function addDaysToDateKey(dateKey: string, amount: number): string {
  return formatDateKey(addDays(parseDateKey(dateKey), amount));
}

export function addMonthsToDateKey(dateKey: string, amount: number): string {
  const [year, month] = dateKey.split("-").map(Number);
  return formatDateKey(addMonths(new Date(Date.UTC(year, month - 1, 1, 12)), amount));
}

export function getMonthDateKeys(monthKey: string): string[] {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    formatDateKey(new Date(Date.UTC(year, month - 1, index + 1, 12))),
  );
}

export function getMondayFirstWeekday(dateKey: string): number {
  return (parseDateKey(dateKey).getUTCDay() + 6) % 7;
}

export function getDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDaysToDateKey(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function formatLocalDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
  locale = "es-ES",
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(parseDateKey(dateKey));
}
