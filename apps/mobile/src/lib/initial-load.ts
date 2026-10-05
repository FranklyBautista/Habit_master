// La primera carga tras iniciar sesión puede fallar una vez de forma
// pasajera (visto en producción con cuentas recién verificadas: "Reintentar"
// la resolvía siempre). Se reintenta sola antes de mostrar la pantalla de
// error, esperando un poco más en cada intento.
export async function loadWithRetry<T>(
  load: () => Promise<T>,
  { attempts = 3, delayMs = 1000 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

// supabase-js devuelve los errores de consulta como objetos planos
// ({ message, code }), no como `Error`, así que antes se mostraba siempre el
// mensaje genérico y se perdía la causa. El detalle va aparte, en pequeño,
// para que una captura de un tester diga qué falló.
export function initialLoadErrorDetail(reason: unknown): string | undefined {
  if (typeof reason !== "object" || reason === null) {
    return typeof reason === "string" && reason ? reason : undefined;
  }
  const { code, message } = reason as { code?: unknown; message?: unknown };
  const parts = [code, message].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(": ") : undefined;
}
