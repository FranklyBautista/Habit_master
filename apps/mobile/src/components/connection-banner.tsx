import { CloudOff, RefreshCw } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { connectionStatus } from "@/lib/connection-status";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

// Persistent bar shown at the top of the app whenever the device is offline or
// the last sync failed. There is no optimistic UI (ADR 0001), so this is how a
// failed write surfaces: as a recoverable state the person can retry.
const PALETTE = {
  offline: { background: "#B45309", foreground: "#FFFFFF" },
  error: { background: "#B91C1C", foreground: "#FFFFFF" },
} as const;

export function ConnectionBanner() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const insets = useSafeAreaInsets();

  const status = connectionStatus(snapshot);
  if (!status) return null;

  const palette = PALETTE[status.kind];
  const Icon = status.kind === "offline" ? CloudOff : RefreshCw;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top + Spacing.two },
      ]}
    >
      <Icon size={18} color={palette.foreground} />
      <Text style={[styles.message, { color: palette.foreground }]}>
        {status.message}
      </Text>
      {status.kind === "error" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar sincronización"
          disabled={snapshot.syncing}
          onPress={() => void actions.refresh()}
          style={({ pressed }) => [
            styles.retry,
            { borderColor: palette.foreground },
            (pressed || snapshot.syncing) && styles.retryActive,
          ]}
        >
          <Text style={[styles.retryLabel, { color: palette.foreground }]}>
            {snapshot.syncing ? "Reintentando…" : "Reintentar"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  message: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  retry: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  retryActive: { opacity: 0.6 },
  retryLabel: { fontSize: 14, fontWeight: 700 },
});
