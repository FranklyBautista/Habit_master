import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthBrand } from "@/components/auth-brand";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { registerSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  function goToVerify(address: string) {
    router.push({
      pathname: "/(auth)/verificar",
      params: { email: address, type: "signup" },
    });
  }

  async function handleSubmit() {
    setError(undefined);
    const parsed = registerSchema.safeParse({ email, password });
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AuthBrand tagline="Empieza a construir tus hábitos con Constancia." />
        <ThemedText type="title">Crear cuenta</ThemedText>
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
          label={submitting ? "Creando…" : "Crear cuenta"}
          accessibilityLabel="Crear cuenta"
          disabled={submitting}
          onPress={handleSubmit}
        />
        <Link href="/(auth)/login">
          <ThemedText type="link">Ya tengo una cuenta</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
