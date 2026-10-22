// `next` llega desde la URL o un formulario: solo se acepta una ruta interna,
// nunca "//otro-dominio" ni una URL absoluta (open redirect).
export function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/hoy";
}
