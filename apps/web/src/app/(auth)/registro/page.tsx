import { AuthForm, AuthLink } from "@/components/auth-form";

import { register } from "../actions";

export default function RegisterPage() {
  return (
    <>
      <div className="auth-heading">
        <h1>Crear cuenta</h1>
        <p>Usa un correo y una contraseña de al menos ocho caracteres.</p>
      </div>
      <AuthForm action={register} fields="credentials" submitLabel="Crear cuenta">
        <div className="auth-links">
          <span>
            ¿Ya tienes cuenta? <AuthLink href="/login">Iniciar sesión</AuthLink>
          </span>
        </div>
      </AuthForm>
    </>
  );
}
