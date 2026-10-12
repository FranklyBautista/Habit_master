import { z } from "zod";

import { addDaysToDateKey, getLocalDateKey } from "./dates";

// Chat del grupo (fase colaborativa C5, addendum de ADR 0002). Los esquemas
// describen lo que devuelve `get_group_messages` ya pasado a camelCase; las
// funciones puras mantienen la ventana de mensajes cargados en web y móvil.

const instantSchema = z.iso.datetime({ offset: true });

export const groupChatLimits = {
  /** Igual que el `check` de `group_messages.body` (caracteres, no bytes). */
  maxMessageLength: 1000,
  pageSize: 50,
  maxMessagesPerMinute: 10,
} as const;

/** Autor de un mensaje que ya no está en el grupo (lo envía el servidor). */
export const formerMemberName = "Antiguo miembro";

/**
 * Caracteres como los cuenta Postgres (`char_length`): puntos de código, así
 * que un emoji cuenta 1 aunque en JavaScript mida 2. Sin los espacios de los
 * extremos, que el servidor recorta.
 */
export function countMessageCharacters(text: string): number {
  return Array.from(text.trim()).length;
}

export const groupMessageBodySchema = z
  .string()
  .trim()
  .min(1, "Escribe un mensaje.")
  .refine(
    (body) => Array.from(body).length <= groupChatLimits.maxMessageLength,
    `El mensaje no puede tener más de ${groupChatLimits.maxMessageLength} caracteres.`,
  );

export const groupMessageSchema = z.object({
  id: z.uuid(),
  body: z.string().min(1),
  createdAt: instantSchema,
  /** Id opaco de la membresía del autor; `null` si ya no está en el grupo. */
  memberId: z.uuid().nullable(),
  /** Nombre visible del autor, o "Antiguo miembro". Nunca su id ni su correo. */
  authorName: z.string().min(1),
  isMine: z.boolean(),
});

/** Página de mensajes en orden de lectura (del más antiguo al más reciente). */
export const groupMessagePageSchema = z.object({
  messages: z.array(groupMessageSchema),
  /** Hay mensajes más antiguos que el primero de la página. */
  hasMore: z.boolean(),
});

export type GroupMessage = z.infer<typeof groupMessageSchema>;
export type GroupMessagePage = z.infer<typeof groupMessagePageSchema>;
export type GroupMessageCursor = { createdAt: string; id: string };

// `Date.parse` se queda en milisegundos y Postgres guarda microsegundos: dos
// mensajes del mismo milisegundo se ordenan por los dígitos restantes y, si
// empatan, por id (el mismo orden que usa la RPC).
function instantKey(instant: string): number {
  const fraction = /\.(\d+)/.exec(instant)?.[1] ?? "";
  const extraMicros = Number(fraction.padEnd(6, "0").slice(3, 6));
  return Date.parse(instant) * 1000 + extraMicros;
}

export function compareGroupMessages(a: GroupMessage, b: GroupMessage): number {
  const byTime = instantKey(a.createdAt) - instantKey(b.createdAt);
  if (byTime !== 0) return byTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Cursor para pedir la página anterior al mensaje más antiguo cargado. */
export function getOlderMessagesCursor(
  messages: GroupMessage[],
): GroupMessageCursor | null {
  const oldest = messages[0];
  return oldest ? { createdAt: oldest.createdAt, id: oldest.id } : null;
}

/**
 * Sustituye la parte reciente de la ventana por la última página del servidor
 * (ADR 0001: el estado viene del servidor). Solo se conservan los mensajes ya
 * cargados que son más antiguos que esa página; si la página trae todo el
 * historial, se queda tal cual.
 */
export function mergeLatestGroupMessages(
  current: GroupMessagePage,
  latest: GroupMessagePage,
): GroupMessagePage {
  const oldestLatest = latest.messages[0];
  if (!latest.hasMore || !oldestLatest) return latest;
  const older = current.messages.filter(
    (message) => compareGroupMessages(message, oldestLatest) < 0,
  );
  if (older.length === 0) return latest;
  return { messages: [...older, ...latest.messages], hasMore: current.hasMore };
}

/** Añade una página más antigua delante de la ventana, sin duplicados. */
export function prependOlderGroupMessages(
  current: GroupMessagePage,
  older: GroupMessagePage,
): GroupMessagePage {
  const loaded = new Set(current.messages.map((message) => message.id));
  return {
    messages: [
      ...older.messages.filter((message) => !loaded.has(message.id)),
      ...current.messages,
    ].sort(compareGroupMessages),
    hasMore: older.hasMore,
  };
}

/**
 * Hora de un mensaje para mostrarla: "09:12" si es de hoy, "ayer 21:40" o
 * "3 oct 18:05", en la zona horaria de quien lo lee.
 */
export function formatGroupMessageTime(
  createdAt: string,
  now: Date,
  timezone: string,
  locale = "es",
): string {
  const instant = new Date(createdAt);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
  const day = getLocalDateKey(instant, timezone);
  const today = getLocalDateKey(now, timezone);
  if (day === today) return time;
  if (day === addDaysToDateKey(today, -1)) return `ayer ${time}`;
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }),
  })
    .format(instant)
    .replace(".", "");
  return `${date} ${time}`;
}

/**
 * UUID v4 a partir de 16 bytes aleatorios. El dominio no usa APIs de la
 * plataforma: web y móvil pasan `crypto.getRandomValues(new Uint8Array(16))`.
 * Sirve de id del mensaje para que reintentar un envío no lo duplique.
 */
export function createGroupMessageId(randomBytes: Uint8Array): string {
  if (randomBytes.length < 16) throw new Error("Hacen falta 16 bytes aleatorios.");
  const bytes = Array.from(randomBytes.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
