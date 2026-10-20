import { Check, Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AuthFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  // Muestra una marca de verificación cuando el valor ya es válido.
  valid?: boolean;
};

// Campo subrayado con etiqueta de acento, como en la hoja de login. Con
// `secureTextEntry` añade el botón de mostrar/ocultar. Igual que TextField,
// fija color de texto, placeholder y cursor para no desaparecer en oscuro.
export function AuthField({
  label,
  valid,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: AuthFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
      <View
        style={[styles.row, { borderBottomColor: focused ? theme.tint : theme.border }]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.tint}
          cursorColor={theme.tint}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, { color: theme.text }]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}
            hitSlop={12}
            onPress={() => setHidden((value) => !value)}
          >
            {hidden ? (
              <EyeOff size={20} color={theme.textSecondary} />
            ) : (
              <Eye size={20} color={theme.tint} />
            )}
          </Pressable>
        ) : valid ? (
          <Check size={20} color={theme.tint} strokeWidth={2.6} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderBottomWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two + Spacing.one,
  },
});
