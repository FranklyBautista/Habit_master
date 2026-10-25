import { type HabitTrackerState, habitTrackerStateSchema } from "@habit-tracker/domain";

import { LargeSecureStore } from "@/lib/supabase/large-secure-store";

// Último estado confirmado por el servidor, para abrir la app sin conexión
// (ADR 0003). Cifrado como la sesión: contiene los nombres de los hábitos.
const store = new LargeSecureStore();

function storageKey(userId: string) {
  return `habit-tracker:state-cache:v1:${userId}`;
}

export async function saveCachedState(
  userId: string,
  state: HabitTrackerState,
): Promise<void> {
  try {
    await store.setItem(storageKey(userId), JSON.stringify(state));
  } catch (reason) {
    // Sin caché la app sigue funcionando con conexión; no es un error visible.
    console.warn("Could not cache habit state", reason);
  }
}

// Se vuelve a validar al leer: es un límite de confianza (CLAUDE.md), y una
// caché de una versión anterior del esquema no debe romper el arranque.
export async function loadCachedState(
  userId: string,
): Promise<HabitTrackerState | null> {
  try {
    const stored = await store.getItem(storageKey(userId));
    if (!stored) return null;
    const parsed = habitTrackerStateSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearCachedState(userId: string): Promise<void> {
  await store.removeItem(storageKey(userId));
}
