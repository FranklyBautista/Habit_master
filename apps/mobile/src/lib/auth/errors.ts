// Mirrors apps/web/src/app/(auth)/actions.ts#authError — same Supabase error
// strings, same Spanish messages, so both clients read identically.
export function authErrorMessage(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "El correo o la contraseña no coinciden.";
  }
  if (message.includes("Password should contain at least one character")) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  if (message.includes("New password should be different from the old password")) {
    return "La contraseña nueva debe ser distinta de la actual.";
  }
  if (message.includes("Token has expired or is invalid")) {
    return "El código no es válido o ha caducado. Pide uno nuevo.";
  }
  if (
    message.includes("For security purposes") ||
    message.includes("rate limit exceeded")
  ) {
    return "Espera un momento antes de pedir otro código.";
  }
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}
