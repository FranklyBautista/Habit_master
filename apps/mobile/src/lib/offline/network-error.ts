// ¿La petición no llegó al servidor? En React Native fetch lanza
// "TypeError: Network request failed", y supabase-js lo devuelve como un objeto
// plano ({ message, code: "" }) o lo relanza. Cualquier otro error (RLS,
// validación, sesión caducada) sí vino del servidor y no se debe encolar.
const NETWORK_MESSAGE =
  /network request failed|failed to fetch|network ?error|timed? ?out/i;

export function isNetworkError(reason: unknown): boolean {
  if (typeof reason !== "object" || reason === null) return false;
  const { message } = reason as { message?: unknown };
  return typeof message === "string" && NETWORK_MESSAGE.test(message);
}
