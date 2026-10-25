import type { HabitCheckin, HabitTrackerState } from "@habit-tracker/domain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

// Check-ins hechos sin conexión, pendientes de enviar a sync_offline_checkins
// (ADR 0003). Solo IDs y fechas, así que van en AsyncStorage sin cifrar.
export type CheckinOp = { habitId: string; checkinDate: string; completed: boolean };

const queueSchema = z.array(
  z.object({ habitId: z.string(), checkinDate: z.string(), completed: z.boolean() }),
);

function storageKey(userId: string) {
  return `habit-tracker:checkin-queue:v1:${userId}`;
}

function hasCheckin(state: HabitTrackerState, habitId: string, checkinDate: string) {
  return state.checkins.some(
    (checkin) => checkin.habitId === habitId && checkin.checkinDate === checkinDate,
  );
}

// Un único estado final por (hábito, fecha). Si el cambio deja el check-in
// como ya está en el servidor, no queda nada que enviar. Siempre devuelve
// objetos nuevos para los cambios: flushQueue los reconoce por referencia.
export function enqueueCheckin(
  queue: CheckinOp[],
  op: CheckinOp,
  serverState: HabitTrackerState,
): CheckinOp[] {
  const rest = queue.filter(
    (queued) => queued.habitId !== op.habitId || queued.checkinDate !== op.checkinDate,
  );
  if (hasCheckin(serverState, op.habitId, op.checkinDate) === op.completed) return rest;
  return [...rest, { ...op }];
}

// Estado que ve la persona: el de la cola si hay un cambio pendiente, si no
// el del servidor.
export function isCheckinCompleted(
  serverState: HabitTrackerState,
  queue: CheckinOp[],
  habitId: string,
  checkinDate: string,
): boolean {
  const queued = queue.find(
    (op) => op.habitId === habitId && op.checkinDate === checkinDate,
  );
  return queued ? queued.completed : hasCheckin(serverState, habitId, checkinDate);
}

// Quita del lote solo lo que se envió y no cambió mientras tanto.
export function removeSent(queue: CheckinOp[], sent: CheckinOp[]): CheckinOp[] {
  return queue.filter((op) => !sent.includes(op));
}

function randomUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Estado que se muestra: el del servidor con la cola aplicada encima. Los
// check-ins pendientes llevan un id provisional; nunca se guardan en la caché.
export function applyQueue(
  state: HabitTrackerState,
  queue: CheckinOp[],
): HabitTrackerState {
  if (queue.length === 0) return state;
  const habitIds = new Set(state.habits.map((habit) => habit.id));
  let checkins: HabitCheckin[] = state.checkins;
  for (const op of queue) {
    // Un hábito que ya no existe en el servidor: el RPC lo rechazará.
    if (!habitIds.has(op.habitId)) continue;
    const without = checkins.filter(
      (checkin) =>
        checkin.habitId !== op.habitId || checkin.checkinDate !== op.checkinDate,
    );
    checkins = op.completed
      ? [
          ...without,
          {
            id: randomUuid(),
            habitId: op.habitId,
            checkinDate: op.checkinDate,
            completedAt: new Date().toISOString(),
          },
        ]
      : without;
  }
  return { ...state, checkins };
}

export async function loadQueue(userId: string): Promise<CheckinOp[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) return [];
    const parsed = queueSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function saveQueue(userId: string, queue: CheckinOp[]): Promise<void> {
  if (queue.length === 0) await AsyncStorage.removeItem(storageKey(userId));
  else await AsyncStorage.setItem(storageKey(userId), JSON.stringify(queue));
}

export async function clearQueue(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
