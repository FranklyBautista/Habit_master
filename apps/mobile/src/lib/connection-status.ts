import type { HabitSnapshot } from "./habit-store";

// Pure decision for the connectivity banner, kept out of the component so it can
// be tested without a React Native renderer.
export type ConnectionStatus =
  { kind: "offline"; message: string } | { kind: "error"; message: string } | null;

const OFFLINE_MESSAGE =
  "Sin conexión. Tus cambios se guardarán cuando vuelvas a tener conexión.";

export function connectionStatus(
  snapshot: Pick<HabitSnapshot, "online" | "error">,
): ConnectionStatus {
  // Offline wins: while disconnected, a stale sync error is not actionable.
  if (!snapshot.online) return { kind: "offline", message: OFFLINE_MESSAGE };
  if (snapshot.error) return { kind: "error", message: snapshot.error };
  return null;
}
