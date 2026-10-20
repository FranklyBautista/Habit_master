import { useRouter } from "expo-router";
import { useState } from "react";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthField } from "@/components/auth/auth-field";
import { AuthError, AuthScaffold } from "@/components/auth/auth-scaffold";
import { updatePasswordSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { supabase } from "@/lib/supabase/client";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (updateError) {
      setError(authErrorMessage(updateError.message));
      return;
    }
    // Esta ruta está a propósito fuera de los "auth redirect paths" de
    // AuthGate (ver auth-gate.tsx), así que hay que navegar a mano al éxito.
    router.replace("/(app)");
  }

  return (
    <AuthScaffold
      title="Crea una nueva"
      highlight="contraseña"
      subtitle="Usa al menos 8 caracteres, con letras y números."
    >
      <AuthField
        label="Nueva contraseña"
        autoComplete="new-password"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <AuthField
        label="Confirmar contraseña"
        autoComplete="new-password"
        placeholder="••••••••"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleSubmit}
      />
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthButton
        label={submitting ? "Guardando…" : "Guardar contraseña"}
        accessibilityLabel="Guardar contraseña"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </AuthScaffold>
  );
}
