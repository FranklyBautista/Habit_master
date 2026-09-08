import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { credentialsSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    setMessage(undefined);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      ...parsed.data,
      options: { emailRedirectTo: getMobileAuthRedirect("/(app)") },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }
    // Con confirmación de correo desactivada (como en local), signUp ya deja
    // sesión activa y AuthGate redirige solo. Si está activada, no hay sesión
    // todavía y toca avisar.
    if (!data.session) setMessage("Revisa tu correo para confirmar la cuenta.");
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Crear cuenta</ThemedText>
        <TextInput
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Correo electrónico"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          accessibilityLabel="Contraseña"
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {message ? <ThemedText>{message}</ThemedText> : null}
        <Pressable
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
        >
          <ThemedText type="smallBold">
            {submitting ? "Creando…" : "Crear cuenta"}
          </ThemedText>
        </Pressable>
        <Link href="/(auth)/login">
          <ThemedText type="link">Ya tengo una cuenta</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
