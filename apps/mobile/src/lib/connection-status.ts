import type { HabitSnapshot } from "./habit-store";

// Pure decision for the connectivity banner, kept out of the component so it can
// be tested without a React Native renderer.
export type ConnectionStatus =
  | { kind: "offline"; message: string }
  | { kind: "error"; message: string }
  | { kind: "pending"; message: string }
  | { kind: "notice"; message: string }
  | null;

function changes(count: number) {
  return count === 1 ? "1 cambio" : `${count} cambios`;
}

export function connectionStatus(
  snapshot: Pick<HabitSnapshot, "online" | "error" | "pendingCount" | "notice">,
): ConnectionStatus {
  // Offline wins: while disconnected, a stale sync error is not actionable.
  // Solo los check-ins se guardan sin conexión (ADR 0003); el texto no debe
  // prometer más.
  if (!snapshot.online) {
    return {
      kind: "offline",
      message:
        snapshot.pendingCount > 0
          ? `Sin conexión · ${changes(snapshot.pendingCount)} pendiente${snapshot.pendingCount === 1 ? "" : "s"} de sincronizar.`
          : "Sin conexión. Puedes marcar tus hábitos; se sincronizarán al volver la conexión.",
    };
  }
  if (snapshot.error) return { kind: "error", message: snapshot.error };
  if (snapshot.pendingCount > 0) {
    return {
      kind: "pending",
      message: `Sincronizando ${changes(snapshot.pendingCount)}…`,
    };
  }
  if (snapshot.notice) return { kind: "notice", message: snapshot.notice };
  return null;
}
