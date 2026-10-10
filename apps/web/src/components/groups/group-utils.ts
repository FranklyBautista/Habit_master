import type { Habit, InviteResult } from "@habit-tracker/domain";

const dayInMs = 24 * 60 * 60 * 1000;

/**
 * "caduca en 6 días" a partir de un instante. No es lógica de calendario (no
 * depende del día local): es la cuenta atrás de los 7 días de una invitación.
 */
export function expiresInLabel(expiresAt: string, now: Date = new Date()): string {
  const days = Math.ceil((Date.parse(expiresAt) - now.getTime()) / dayInMs);
  if (days <= 0) return "caduca hoy";
  return days === 1 ? "caduca en 1 día" : `caduca en ${days} días`;
}

export const inviteResultMessages: Record<InviteResult, string> = {
  sent: "Invitación enviada.",
  already_member: "Ya es miembro.",
  already_invited: "Ya tiene una invitación pendiente.",
};

export function membersLabel(count: number): string {
  return count === 1 ? "1 miembro" : `${count} miembros`;
}

/** Hábitos activos (no archivados) en el orden de la lista personal. */
export function activeHabitsOf(habits: Habit[]): Habit[] {
  return habits
    .filter((habit) => !habit.archivedAt)
    .sort((left, right) => left.position - right.position);
}
