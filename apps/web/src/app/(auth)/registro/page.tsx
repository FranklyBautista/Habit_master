import { AuthForm } from "@/components/auth-form";
import { AuthFooterLink, AuthScreen } from "@/components/auth-screen";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

import { register } from "../actions";

export default function RegisterPage() {
  return (
    <AuthScreen
      title="Crea tu"
      highlight="cuenta"
      subtitle="Usa un correo y una contraseña de al menos ocho caracteres."
      backHref="/bienvenida"
      footer={
        <AuthFooterLink
          prompt="¿Ya tienes cuenta?"
          label="Inicia sesión"
          href="/login"
        />
      }
    >
      <AuthForm
        action={register}
        fields="credentials"
        confirmPassword
        submitLabel="Crear cuenta"
      />
      <GoogleSignInButton />
    </AuthScreen>
  );
}
