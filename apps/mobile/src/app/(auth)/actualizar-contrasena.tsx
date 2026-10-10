import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { newPasswordSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { supabase } from "@/lib/supabase/client";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();

  async function handleSubmit() {
    setError(undefined);
    const parsed = newPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data,
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Actualizar contraseña</ThemedText>
        <TextField
          accessibilityLabel="Nueva contraseña"
          placeholder="Nueva contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}
        <Button
          label={submitting ? "Guardando…" : "Guardar contraseña"}
          accessibilityLabel="Guardar contraseña"
          disabled={submitting}
          onPress={handleSubmit}
        />
      </SafeAreaView>
    </ThemedView>
  );
}
