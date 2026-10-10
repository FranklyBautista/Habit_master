import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Aviso flotante con colores invertidos: claro sobre la app oscura y al revés,
// para que destaque sobre cualquier superficie (antes era #111827 fijo, casi
// invisible sobre el fondo negro).
export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="alert"
      onPress={onDismiss}
      style={[styles.toast, { backgroundColor: theme.inverse }]}
    >
      <ThemedText type="small" style={{ color: theme.onInverse }}>
        {message}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: Spacing.four,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
