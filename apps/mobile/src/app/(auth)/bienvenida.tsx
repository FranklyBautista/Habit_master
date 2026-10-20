import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth/auth-button";
import { HeroBackground } from "@/components/auth/hero-background";
import { AuthPalette, Radius, Spacing } from "@/constants/theme";

// Portada sin sesión: marca, saludo y las dos entradas (login / registro)
// sobre la cabecera oscura a pantalla completa.
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <HeroBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Sparkles size={34} color={AuthPalette.onButton} strokeWidth={2.4} />
          </View>
          <Text style={styles.brandName}>CONSTANCIA</Text>
        </View>

        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.title}>
            Bienvenido
          </Text>
          <Text style={styles.subtitle}>
            Pequeños hábitos, cada día.{"\n"}Grandes cambios, a tu ritmo.
          </Text>
        </View>

        <View style={styles.actions}>
          <AuthButton
            label="Iniciar sesión"
            variant="heroOutline"
            onPress={() => router.push("/(auth)/login")}
          />
          <AuthButton
            label="Crear cuenta"
            onPress={() => router.push("/(auth)/registro")}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuthPalette.heroTo },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four + Spacing.two,
    paddingVertical: Spacing.five,
  },
  brand: { alignItems: "center", gap: Spacing.three, marginTop: Spacing.six },
  mark: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    backgroundColor: AuthPalette.heroAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: AuthPalette.heroText,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  title: {
    color: AuthPalette.heroText,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: 800,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: AuthPalette.heroTextSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  actions: { gap: Spacing.three },
});
