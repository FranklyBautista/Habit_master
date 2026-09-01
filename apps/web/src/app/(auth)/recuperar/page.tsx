import { AuthForm, AuthLink } from "@/components/auth-form";

import { recoverPassword } from "../actions";

export default function RecoverPage() {
  return (
    <>
      <div className="auth-heading">
        <span className="section-kicker">Recuperación</span>
        <h1>Restablecer contraseña</h1>
        <p>Enviaremos un enlace seguro si el correo corresponde a una cuenta.</p>
      </div>
      <AuthForm action={recoverPassword} fields="email" submitLabel="Enviar enlace">
        <div className="auth-links">
          <AuthLink href="/login">Volver al inicio de sesión</AuthLink>
        </div>
      </AuthForm>
    </>
  );
}
