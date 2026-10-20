import { AuthForm } from "@/components/auth-form";
import { AuthFooterLink, AuthScreen } from "@/components/auth-screen";

import { recoverPassword } from "../actions";

export default function RecoverPage() {
  return (
    <AuthScreen
      title="¿Olvidaste tu"
      highlight="contraseña?"
      subtitle="Te enviaremos un código si el correo corresponde a una cuenta."
      backHref="/login"
      footer={
        <AuthFooterLink prompt="¿La recordaste?" label="Inicia sesión" href="/login" />
      }
    >
      <AuthForm action={recoverPassword} fields="email" submitLabel="Enviar código" />
    </AuthScreen>
  );
}
