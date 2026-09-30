import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles, useAuthInputStyle } from "@/lib/auth/form-styles";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

const emailSchema = z.email("Escribe un correo válido.");

export default function RecoverPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const inputStyle = useAuthInputStyle();

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Recuperar contraseña</ThemedText>
        <TextInput
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Correo electrónico"
          placeholderTextColor={inputStyle.placeholderTextColor}
          style={inputStyle.style}
          value={email}
          onChangeText={setEmail}
        />
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar código"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
        >
          <ThemedText type="smallBold">
            {submitting ? "Enviando…" : "Enviar código"}
          </ThemedText>
        </Pressable>
        <Link href="/(auth)/login">
          <ThemedText type="link">Volver a iniciar sesión</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
