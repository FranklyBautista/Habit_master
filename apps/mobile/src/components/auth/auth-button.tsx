import { useId } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { AuthPalette, Radius, Spacing } from "@/constants/theme";

type AuthButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  // primary = degradado lima (sobre la hoja o sobre la cabecera);
  // heroOutline = solo borde claro, para ir sobre la cabecera oscura.
  variant?: "primary" | "heroOutline";
  style?: StyleProp<ViewStyle>;
};

// Botón en píldora de las pantallas de auth. Fondo y texto van fijos (no del
// tema) porque el degradado lima y la cabecera oscura son iguales en ambos modos.
export function AuthButton({
  label,
  variant = "primary",
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: AuthButtonProps) {
  const gradientId = `btn-${useId().replace(/:/g, "")}`;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.heroOutline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {isPrimary ? (
        // El View absoluto ocupa todo el botón; el Svg directo con "100%" se
        // medía contra el ancho sin padding y el degradado quedaba corto.
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={AuthPalette.buttonFrom} />
                <Stop offset="1" stopColor={AuthPalette.buttonTo} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </View>
      ) : null}
      <Text
        style={[
          styles.label,
          { color: isPrimary ? AuthPalette.onButton : AuthPalette.heroText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    overflow: "hidden",
  },
  primary: {
    shadowColor: AuthPalette.buttonTo,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroOutline: {
    borderWidth: 1.5,
    borderColor: AuthPalette.heroBorder,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
});
