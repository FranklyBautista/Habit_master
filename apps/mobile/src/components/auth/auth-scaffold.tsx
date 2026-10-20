import { type Href, Link, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeroBackground } from "@/components/auth/hero-background";
import { ThemedText } from "@/components/themed-text";
import { AuthPalette, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AuthScaffoldProps = {
  // Primera línea del saludo, en claro.
  title: string;
  // Segunda línea, en lima.
  highlight?: string;
  subtitle?: string;
  // Flecha para volver; sin historial vuelve a la bienvenida.
  showBack?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

// Estructura de las pantallas de auth: cabecera oscura con degradado y un
// saludo grande, y debajo una hoja redondeada (color del tema) con el
// formulario. El pie (p. ej. "¿No tienes cuenta? Regístrate") queda abajo.
export function AuthScaffold({
  title,
  highlight,
  subtitle,
  showBack,
  footer,
  children,
}: AuthScaffoldProps) {
  const theme = useTheme();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/bienvenida");
  }

  return (
    <View style={styles.root}>
      <HeroBackground />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <SafeAreaView edges={["top"]} style={styles.hero}>
            {showBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                hitSlop={12}
                style={styles.back}
                onPress={goBack}
              >
                <ArrowLeft size={24} color={AuthPalette.heroText} />
              </Pressable>
            ) : null}
            <Text accessibilityRole="header" style={styles.title}>
              {title}
              {highlight ? (
                <Text
                  style={{ color: AuthPalette.heroAccent }}
                >{`\n${highlight}`}</Text>
              ) : null}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </SafeAreaView>
          <SafeAreaView
            edges={["bottom"]}
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.form}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Pie alineado a la derecha: pregunta en gris y enlace en negrita debajo.
export function AuthFooterLink({
  prompt,
  label,
  href,
}: {
  prompt?: string;
  label: string;
  href: Href;
}) {
  return (
    <View style={styles.footerLink}>
      {prompt ? (
        <ThemedText type="small" themeColor="textSecondary">
          {prompt}
        </ThemedText>
      ) : null}
      <Link href={href} replace>
        <ThemedText type="linkPrimary" themeColor="text">
          {label}
        </ThemedText>
      </Link>
    </View>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedText type="small" accessibilityRole="alert" style={{ color: theme.danger }}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuthPalette.heroTo },
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: Spacing.four + Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six - Spacing.two,
    gap: Spacing.two,
  },
  back: { alignSelf: "flex-start", marginBottom: Spacing.three },
  title: {
    color: AuthPalette.heroText,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: 800,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: AuthPalette.heroTextSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 500,
  },
  sheet: {
    flexGrow: 1,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    paddingHorizontal: Spacing.four + Spacing.two,
    paddingTop: Spacing.five + Spacing.two,
    paddingBottom: Spacing.four,
  },
  form: { gap: Spacing.four },
  footer: { marginTop: "auto", paddingTop: Spacing.five },
  footerLink: { alignItems: "flex-end" },
});
