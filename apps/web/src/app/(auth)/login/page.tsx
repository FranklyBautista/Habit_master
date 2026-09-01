import { AuthForm, AuthLink } from "@/components/auth-form";

import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/hoy";
  return (
    <>
      <div className="auth-heading">
        <span className="section-kicker">Tu cuenta</span>
        <h1>Iniciar sesión</h1>
        <p>Continúa tus hábitos desde cualquier navegador.</p>
      </div>
      <AuthForm action={login} fields="credentials" next={next} submitLabel="Entrar">
        <div className="auth-links">
          <AuthLink href="/recuperar">Olvidé mi contraseña</AuthLink>
          <span>
            ¿Primera vez? <AuthLink href="/registro">Crear cuenta</AuthLink>
          </span>
        </div>
      </AuthForm>
    </>
  );
}
