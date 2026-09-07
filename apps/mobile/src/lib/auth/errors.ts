// Mirrors apps/web/src/app/(auth)/actions.ts#authError — same Supabase error
// strings, same Spanish messages, so both clients read identically.
export function authErrorMessage(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "El correo o la contraseña no coinciden.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con este correo.";
  }
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}
