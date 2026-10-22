import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AuthError } from "@/components/auth/auth-scaffold";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { signInWithGoogle } from "@/lib/auth/google";

// "o" + botón «Continuar con Google» bajo el formulario de login y registro.
// Mismo bloque que GoogleSignInButton en la web. No navega: al crearse la
// sesión, AuthGate saca de login/registro a /(app).
export function GoogleSignIn() {
  const theme = useTheme();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handlePress() {
    setError(undefined);
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);
    if (result.status === "error") setError(result.message);
  }

  return (
    <View style={styles.root}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>o</Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      {error ? <AuthError>{error}</AuthError> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        accessibilityState={{ disabled: submitting }}
        disabled={submitting}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          pressed && { backgroundColor: theme.backgroundSelected },
          submitting && styles.disabled,
        ]}
      >
        <GoogleLogo />
        <Text style={[styles.label, { color: theme.text }]}>
          {submitting ? "Conectando…" : "Continuar con Google"}
        </Text>
      </Pressable>
    </View>
  );
}

// Logotipo "G" oficial, en sus colores (las guías de marca de Google no
// permiten recolorearlo).
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  divider: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 14 },
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two + Spacing.one,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  label: { fontSize: 15, fontWeight: 700 },
  disabled: { opacity: 0.55 },
});
