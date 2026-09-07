import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

const emailSchema = z.email("Escribe un correo válido.");

export default function RecoverPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    setMessage(undefined);
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
    setMessage("Si la cuenta existe, recibirás un enlace para continuar.");
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Recuperar contraseña</ThemedText>
        <TextInput
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Correo electrónico"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {message ? <ThemedText>{message}</ThemedText> : null}
        <Pressable
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
        >
          <ThemedText type="smallBold">
            {submitting ? "Enviando…" : "Enviar enlace"}
          </ThemedText>
        </Pressable>
        <Link href="/(auth)/login">
          <ThemedText type="link">Volver a iniciar sesión</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
