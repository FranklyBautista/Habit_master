import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";

// Layout común de las pantallas de auth. Los colores (campos, botones, errores)
// salen de TextField, Button y `theme.danger`, no de aquí.
export const authFormStyles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
