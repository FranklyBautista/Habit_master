import { Sparkles } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Marca en la cabecera de login y registro.
export function AuthBrand({ tagline }: { tagline: string }) {
  const theme = useTheme();
  return (
    <View style={styles.brand}>
      <View style={[styles.mark, { backgroundColor: theme.accent }]}>
        <Sparkles size={26} color={theme.onAccent} strokeWidth={2.4} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {tagline}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { gap: Spacing.three, marginBottom: Spacing.two },
  mark: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
