import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";

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
    borderColor: "#8888",
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
