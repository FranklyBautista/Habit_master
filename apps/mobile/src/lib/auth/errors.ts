// Mirrors apps/web/src/app/(auth)/actions.ts#authError — same Supabase error
// strings, same Spanish messages, so both clients read identically.
export function authErrorMessage(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "El correo o la contraseña no coinciden.";
  }
  if (message.includes("Password should contain at least one character")) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}
