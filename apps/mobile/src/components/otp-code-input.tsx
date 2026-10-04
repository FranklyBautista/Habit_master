import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type OtpCodeInputProps = {
  length: number;
  value: string;
  onChangeText: (code: string) => void;
  accessibilityLabel: string;
};

// Casillas de un dígito sobre un único TextInput transparente que cubre la
// fila. Con un TextInput por casilla, pegar el código, el autocompletado del
// sistema (`oneTimeCode`) y borrar hacia atrás exigen mover el foco a mano y
// fallan en Android; así se comportan como en un campo normal.
export function OtpCodeInput({
  length,
  value,
  onChangeText,
  accessibilityLabel,
}: OtpCodeInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, index) => (
        <View
          key={index}
          style={[
            styles.cell,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: focused && index === activeIndex ? theme.tint : theme.border,
            },
          ]}
        >
          <ThemedText type="subtitle">{value[index] ?? ""}</ThemedText>
        </View>
      ))}
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoComplete="one-time-code"
        caretHidden
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        value={value}
        onBlur={() => setFocused(false)}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.two,
  },
  cell: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
  // Casi transparente en vez de 0: Android deja de dar foco a vistas con
  // opacidad 0.
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: "transparent",
  },
});
