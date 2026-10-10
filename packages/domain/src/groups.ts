import { z } from "zod";

import { habitColors, habitIcons } from "./entities";

// Grupos de hábitos compartidos (ADR 0002). Estos esquemas describen lo que
// devuelven las RPC de grupos ya pasado a camelCase; los repositorios de web y
// móvil los aplican en el límite, igual que `habitTrackerStateSchema`.

const localDateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });

export const groupLimits = {
  maxMembers: 10,
  maxGroupsPerUser: 10,
  maxSharedHabitsPerGroup: 10,
} as const;

export const groupRoleSchema = z.enum(["owner", "member"]);

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe un nombre.")
  .max(60, "Usa 60 caracteres o menos.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu nombre.")
  .max(60, "Usa 60 caracteres o menos.");

// Código de usuario: 8 caracteres en base32 de Crockford, guardado sin guion.
const userCodeAlphabet = /^[0-9A-HJKMNP-TV-Z]{8}$/;
export const userCodeSchema = z.string().regex(userCodeAlphabet);

/** Igual que `private.normalize_user_code` en la base de datos. */
export function normalizeUserCode(raw: string): string {
  return raw
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/I|L/g, "1")
    .replace(/O/g, "0");
}

export function isValidUserCode(raw: string): boolean {
  return userCodeAlphabet.test(normalizeUserCode(raw));
}

/** `ABCD1234` → `ABCD-1234`. */
export function formatUserCode(code: string): string {
  const normalized = normalizeUserCode(code);
  return normalized.length === 8
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

export const groupSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: groupRoleSchema,
  memberCount: z.number().int().positive(),
  joinedAt: instantSchema,
});

export const groupInvitationSchema = z.object({
  id: z.uuid(),
  groupId: z.uuid(),
  groupName: z.string(),
  inviterName: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  expiresAt: instantSchema,
});

// Periodo de archivado ya cerrado, en fechas locales del dueño del hábito:
// el hábito no cuenta en `[from, to)`.
export const sharedArchivePeriodSchema = z.object({
  from: localDateSchema,
  to: localDateSchema,
});

export const sharedHabitSchema = z.object({
  /** Solo en los hábitos propios; `null` en los de otros miembros. */
  habitId: z.uuid().nullable(),
  name: z.string(),
  color: z.enum(habitColors),
  icon: z.enum(habitIcons),
  startDate: localDateSchema,
  archivePeriods: z.array(sharedArchivePeriodSchema),
  checkinDates: z.array(localDateSchema),
});

export const groupMemberProgressSchema = z.object({
  /** Id opaco de la membresía (para expulsar o transferir), no el de usuario. */
  memberId: z.uuid(),
  displayName: z.string().nullable(),
  role: groupRoleSchema,
  isMe: z.boolean(),
  /** "Hoy" de ese miembro en su zona horaria, calculado en el servidor. */
  today: localDateSchema,
  habits: z.array(sharedHabitSchema),
});

export const pendingGroupInvitationSchema = z.object({
  id: z.uuid(),
  userCode: z.string(),
  expiresAt: instantSchema,
});

export const groupProgressSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  myRole: groupRoleSchema,
  members: z.array(groupMemberProgressSchema),
  /** Solo las ve el dueño; vacío para el resto. */
  pendingInvitations: z.array(pendingGroupInvitationSchema),
});

export const inviteResultSchema = z.enum(["sent", "already_member", "already_invited"]);

export type GroupRole = z.infer<typeof groupRoleSchema>;
export type GroupSummary = z.infer<typeof groupSummarySchema>;
export type GroupInvitation = z.infer<typeof groupInvitationSchema>;
export type SharedArchivePeriod = z.infer<typeof sharedArchivePeriodSchema>;
export type SharedHabit = z.infer<typeof sharedHabitSchema>;
export type GroupMemberProgress = z.infer<typeof groupMemberProgressSchema>;
export type PendingGroupInvitation = z.infer<typeof pendingGroupInvitationSchema>;
export type GroupProgress = z.infer<typeof groupProgressSchema>;
export type InviteResult = z.infer<typeof inviteResultSchema>;
