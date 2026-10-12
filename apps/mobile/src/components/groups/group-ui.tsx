import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Piezas comunes de las pantallas de grupos. Viven aquí (y no en los
// componentes compartidos de la app) para no tocar archivos que el rediseño
// visual reescribe; usan los mismos tokens de `theme.ts`.

export const groupColors = { danger: "#B91C1C", success: "#047857" } as const;

// Expande el área táctil de los botones compactos (mínimo ~44 pt).
export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

export function GroupScreen({
  title,
  subtitle,
  onBack = () => (router.canGoBack() ? router.back() : router.replace("/grupos")),
  action,
  scrollable = true,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  /** `false` para pantallas con su propia lista (el chat). */
  scrollable?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={hitSlop}
            onPress={onBack}
            style={styles.back}
          >
            <ChevronLeft size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText type="subtitle" accessibilityRole="header" numberOfLines={2}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {action}
        </View>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.fixedContent}>{children}</View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

export function LoadingState() {
  return (
    <View style={styles.centered} accessibilityLabel="Cargando">
      <ActivityIndicator />
    </View>
  );
}

export function MessageState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <ThemedText type="smallBold" style={styles.centerText}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <GroupButton label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function GroupButton({
  label,
  busyLabel,
  onPress,
  busy = false,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
}: {
  label: string;
  busyLabel?: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const inactive = disabled || busy;
  const background =
    variant === "primary"
      ? theme.tint
      : variant === "danger"
        ? groupColors.danger
        : theme.backgroundElement;
  const foreground = variant === "secondary" ? theme.text : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: background, borderColor: theme.border },
        variant === "secondary" && styles.buttonOutlined,
        inactive && styles.buttonDisabled,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: foreground }}>
        {busy && busyLabel ? busyLabel : label}
      </ThemedText>
    </Pressable>
  );
}

export function GroupTextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  maxLength = 60,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  maxLength?: number;
  autoCapitalize?: "none" | "characters" | "sentences" | "words";
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: error ? groupColors.danger : theme.border,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <ThemedText
      type="small"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: groupColors.danger }}
    >
      {message}
    </ThemedText>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" accessibilityRole="header">
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  back: { padding: Spacing.one },
  headerCopy: { flex: 1, gap: 2 },
  scrollContent: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  fixedContent: { flex: 1 },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: "center" },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonOutlined: { borderWidth: 1 },
  buttonDisabled: { opacity: 0.6 },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
  },
});
