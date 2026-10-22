import { AuthForm, AuthLink } from "@/components/auth-form";
import { AuthFooterLink, AuthScreen } from "@/components/auth-screen";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { GOOGLE_SIGN_IN_ERROR } from "@/lib/auth/google";

import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/hoy";
  return (
    <AuthScreen
      title="Hola de nuevo,"
      highlight="inicia sesión"
      subtitle="Continúa tus hábitos desde cualquier navegador."
      backHref="/bienvenida"
      footer={
        <AuthFooterLink
          prompt="¿No tienes cuenta?"
          label="Regístrate"
          href="/registro"
        />
      }
    >
      <AuthForm
        action={login}
        fields="credentials"
        next={next}
        submitLabel="Entrar"
        belowFields={
          <div className="auth-forgot">
            <AuthLink href="/recuperar">¿Olvidaste tu contraseña?</AuthLink>
          </div>
        }
      />
      <GoogleSignInButton
        next={next}
        initialError={params.error === "google" ? GOOGLE_SIGN_IN_ERROR : undefined}
      />
    </AuthScreen>
  );
}
