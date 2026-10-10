import { Link } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthBrand } from "@/components/auth-brand";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { credentialsSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { supabase } from "@/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();

  async function handleSubmit() {
    setError(undefined);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    // No navegamos a mano: AuthGate redirige a /(app) en cuanto la sesión
    // cambia vía onAuthStateChange.
    if (signInError) setError(authErrorMessage(signInError.message));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AuthBrand tagline="Bienvenido de nuevo a Constancia." />
        <ThemedText type="title">Iniciar sesión</ThemedText>
        <TextField
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          accessibilityLabel="Contraseña"
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}
        <Button
          label={submitting ? "Entrando…" : "Entrar"}
          accessibilityLabel="Entrar"
          disabled={submitting}
          onPress={handleSubmit}
        />
        <Link href="/(auth)/recuperar">
          <ThemedText type="link">¿Olvidaste tu contraseña?</ThemedText>
        </Link>
        <Link href="/(auth)/registro">
          <ThemedText type="link">Crear una cuenta</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
