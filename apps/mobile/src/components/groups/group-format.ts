import {
  displayNameSchema,
  formatUserCode,
  type InviteResult,
  isPlaceholderDisplayName,
} from "@habit-tracker/domain";

// Textos derivados para las pantallas de grupos. Son solo de presentación: la
// caducidad real la decide el servidor (`expires_at`).

const DAY_MS = 24 * 60 * 60 * 1000;

export function expiresInLabel(expiresAt: string, now: Date = new Date()): string {
  const days = Math.ceil((Date.parse(expiresAt) - now.getTime()) / DAY_MS);
  if (days <= 1) return "caduca hoy";
  return `caduca en ${days} d`;
}

export function memberCountLabel(count: number): string {
  return count === 1 ? "1 miembro" : `${count} miembros`;
}

export function inviteResultMessage(result: InviteResult, userCode: string): string {
  switch (result) {
    case "sent":
      return `Invitación enviada a ${formatUserCode(userCode)}.`;
    case "already_member":
      return "Esa persona ya es miembro del grupo.";
    case "already_invited":
      return "Esa persona ya tiene una invitación pendiente.";
  }
}

export function streakLabel(days: number): string {
  return days === 1 ? "racha de 1 día" : `racha de ${days} días`;
}

/** Mensaje para el campo "Tu nombre en el grupo", o null si el nombre vale. */
export function groupDisplayNameProblem(name: string): string | null {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (isPlaceholderDisplayName(parsed.data)) {
    return "Elige un nombre que te identifique: «Tú» no se muestra en los grupos.";
  }
  return null;
}
