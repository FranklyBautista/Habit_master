import { useRouter } from "expo-router";
import { useState } from "react";
import { z } from "zod";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
} from "@/components/auth/auth-scaffold";
import { authErrorMessage } from "@/lib/auth/errors";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

const emailSchema = z.email("Escribe un correo válido.");

export default function RecoverPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setError(undefined);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      parsed.data,
      {
        redirectTo: getMobileAuthRedirect("/(auth)/actualizar-contrasena"),
      },
    );
    setSubmitting(false);
    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }
    // Se pasa a la pantalla del código exista o no la cuenta: Supabase no lo
    // revela y aquí tampoco, para no permitir enumerar correos.
    router.push({
      pathname: "/(auth)/verificar",
      params: { email: parsed.data, type: "recovery" },
    });
  }

  return (
    <AuthScaffold
      title="¿Olvidaste tu"
      highlight="contraseña?"
      subtitle="Te enviaremos un código a tu correo para restablecerla."
      showBack
      footer={
        <AuthFooterLink
          prompt="¿La recordaste?"
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
        valid={emailSchema.safeParse(email).success}
        onChangeText={setEmail}
        onSubmitEditing={handleSubmit}
      />
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthButton
        label={submitting ? "Enviando…" : "Enviar código"}
        accessibilityLabel="Enviar código"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </AuthScaffold>
  );
}
