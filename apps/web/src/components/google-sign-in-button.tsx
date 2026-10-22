"use client";

import { useActionState } from "react";

import { signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  next?: string;
  // Error con el que vuelve app/auth/callback (?error=google).
  initialError?: string;
};

// Formulario propio (no comparte estado con AuthForm): la acción no necesita
// correo ni contraseña y redirige a Google.
export function GoogleSignInButton({ next, initialError }: GoogleSignInButtonProps) {
  const [state, formAction, pending] = useActionState(signInWithGoogle, {
    error: initialError,
  });

  return (
    <form className="auth-google" action={formAction}>
      <p className="auth-divider">o</p>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        className="auth-button--google"
        disabled={pending}
      >
        <GoogleLogo />
        {pending ? "Conectando…" : "Continuar con Google"}
      </Button>
    </form>
  );
}

// Logotipo "G" oficial, en sus colores (las guías de marca de Google no
// permiten recolorearlo).
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
