import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// TextInput sin color propio usa el del sistema (texto negro, fondo
// transparente) y desaparece en modo oscuro. Todos los campos pasan por aquí.
// `placeholderTextColor` no se puede fijar vía `style`, por eso va como prop.
export function TextField({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      selectionColor={theme.tint}
      cursorColor={theme.tint}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - Spacing.one,
    fontSize: 16,
  },
});
