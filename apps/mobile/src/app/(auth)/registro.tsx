import { useRouter } from "expo-router";
import { useState } from "react";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
} from "@/components/auth/auth-scaffold";
import { GoogleSignIn } from "@/components/auth/google-button";
import { registerSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function goToVerify(address: string) {
    router.push({
      pathname: "/(auth)/verificar",
      params: { email: address, type: "signup" },
    });
  }

  async function handleSubmit() {
    setError(undefined);
    const parsed = registerSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: getMobileAuthRedirect("/(app)") },
    });
    setSubmitting(false);
    if (signUpError) {
      // Mismo camino que un registro nuevo — revelar "ya existe" permitiría
      // enumerar correos, igual que en recuperar.tsx.
      if (signUpError.message.includes("User already registered")) {
        goToVerify(parsed.data.email);
        return;
      }
      setError(authErrorMessage(signUpError.message));
      return;
    }
    // Con confirmación de correo desactivada (como en local), signUp ya deja
    // sesión activa y AuthGate redirige solo. Si está activada, no hay sesión
    // todavía y se pide el código que llegó por correo.
    if (!data.session) goToVerify(parsed.data.email);
  }

  return (
    <AuthScaffold
      title="Crea tu"
      highlight="cuenta"
      subtitle="Empieza a construir tus hábitos con Constancia."
      showBack
      footer={
        <AuthFooterLink
          prompt="¿Ya tienes cuenta?"
          label="Inicia sesión"
          href="/(auth)/login"
        />
      }
    >
      <AuthField
        label="Correo electrónico"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="tu@correo.com"
        value={email}
        valid={registerSchema.shape.email.safeParse(email).success}
        onChangeText={setEmail}
      />
      <AuthField
        label="Contraseña"
        autoComplete="new-password"
        placeholder="Mínimo 8, con letras y números"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <AuthField
        label="Confirmar contraseña"
        autoComplete="new-password"
        placeholder="Repite la contraseña"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleSubmit}
      />
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthButton
        label={submitting ? "Creando…" : "Crear cuenta"}
        accessibilityLabel="Crear cuenta"
        disabled={submitting}
        onPress={handleSubmit}
      />
      <GoogleSignIn />
    </AuthScaffold>
  );
}
