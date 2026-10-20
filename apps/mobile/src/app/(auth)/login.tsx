import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
} from "@/components/auth/auth-scaffold";
import { ThemedText } from "@/components/themed-text";
import { credentialsSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { supabase } from "@/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

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
    <AuthScaffold
      title="Hola de nuevo,"
      highlight="inicia sesión"
      showBack
      footer={
        <AuthFooterLink
          prompt="¿No tienes cuenta?"
          label="Regístrate"
          href="/(auth)/registro"
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
        valid={credentialsSchema.shape.email.safeParse(email).success}
        onChangeText={setEmail}
      />
      <AuthField
        label="Contraseña"
        autoComplete="current-password"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
      />
      <View style={styles.forgot}>
        <Link href="/(auth)/recuperar">
          <ThemedText type="linkPrimary" themeColor="text">
            ¿Olvidaste tu contraseña?
          </ThemedText>
        </Link>
      </View>
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthButton
        label={submitting ? "Entrando…" : "Entrar"}
        accessibilityLabel="Entrar"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: { alignItems: "flex-end", marginTop: -8 },
});
