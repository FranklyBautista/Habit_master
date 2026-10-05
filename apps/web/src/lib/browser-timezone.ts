// La zona horaria del perfil decide a qué día pertenece cada check-in. En vez
// de pedírsela al usuario se toma del navegador (el reloj del dispositivo),
// igual que en móvil: los perfiles nacen con 'UTC' (valor por defecto de la
// tabla) y, para alguien en América, el "hoy" cambiaba de día a media tarde.
export function getBrowserTimeZone(): string | undefined {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timeZone === "string" && timeZone.length > 0 ? timeZone : undefined;
  } catch {
    return undefined;
  }
}
