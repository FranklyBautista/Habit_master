import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  // primary = relleno lima; secondary = superficie neutra; outline = solo borde.
  variant?: "primary" | "secondary" | "outline";
  icon?: (color: string) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Botón en píldora compartido. Fija juntos el fondo y el color del texto para
// que ninguna pantalla vuelva a combinar, por ejemplo, texto del tema (claro en
// modo oscuro) sobre un gris claro fijo.
export function Button({
  label,
  variant = "primary",
  icon,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { background: theme.accent, border: theme.accent, text: theme.onAccent },
    secondary: {
      background: theme.backgroundSelected,
      border: theme.backgroundSelected,
      text: theme.text,
    },
    outline: { background: "transparent", border: theme.border, text: theme.text },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {icon?.(palette.text)}
      <ThemedText type="smallBold" style={{ color: palette.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three - Spacing.one,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
