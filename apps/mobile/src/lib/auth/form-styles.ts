import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export const authFormStyles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  button: {
    backgroundColor: "#047857",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  error: { color: "#DC2626" },
});

// authFormStyles.input has no color/background of its own — without this,
// TextInput falls back to the OS default (black text, transparent
// background) and turns unreadable against the dark-mode ThemedView behind
// it. placeholderTextColor isn't stylable via `style` in RN, so callers pass
// it as a prop.
export function useAuthInputStyle() {
  const theme = useTheme();
  return {
    style: [
      authFormStyles.input,
      { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
    ],
    placeholderTextColor: theme.textSecondary,
  };
}
