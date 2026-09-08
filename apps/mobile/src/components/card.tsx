import { StyleSheet, View, type ViewProps } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Shared raised surface: a white (light) / dark-grey (dark) panel with a
// hairline border so cards stay distinct from the page on any screen
// brightness. Replaces the ad-hoc `backgroundColor: "#F0F0F3"` that every
// screen used to hardcode.
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
