import { AuthForm } from "@/components/auth-form";
import { AuthScreen } from "@/components/auth-screen";

import { updatePassword } from "../actions";

export default function UpdatePasswordPage() {
  return (
    <AuthScreen
      title="Crea una nueva"
      highlight="contraseña"
      subtitle="Elige una contraseña de al menos ocho caracteres."
    >
      <AuthForm
        action={updatePassword}
        fields="password"
        confirmPassword
        submitLabel="Guardar contraseña"
      />
    </AuthScreen>
  );
}
