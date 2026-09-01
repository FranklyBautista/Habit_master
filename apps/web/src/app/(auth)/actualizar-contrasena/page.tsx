import { AuthForm } from "@/components/auth-form";

import { updatePassword } from "../actions";

export default function UpdatePasswordPage() {
  return (
    <>
      <div className="auth-heading">
        <span className="section-kicker">Seguridad</span>
        <h1>Nueva contraseña</h1>
        <p>Elige una contraseña de al menos ocho caracteres.</p>
      </div>
      <AuthForm
        action={updatePassword}
        fields="password"
        submitLabel="Guardar contraseña"
      />
    </>
  );
}
