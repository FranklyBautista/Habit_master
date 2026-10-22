// Lo usan la acción (si Supabase no da la URL de Google) y el login (cuando
// app/auth/callback vuelve con ?error=google: cancelado, denegado o canje
// fallido). Mismo texto que GOOGLE_SIGN_IN_ERROR en apps/mobile.
export const GOOGLE_SIGN_IN_ERROR =
  "No se pudo iniciar sesión con Google. Inténtalo de nuevo.";
