import { formatUserCode } from "@habit-tracker/domain";
import { router } from "expo-router";
import { ChevronRight, Share2, Users } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGroupActions, useGroups } from "@/lib/group-store";

import { FieldError, hitSlop } from "./group-ui";

// "Tu código" en Ajustes (ADR 0002 §1): se comparte por otro canal para que te
// inviten; regenerarlo invalida el anterior. Se comparte con la hoja nativa
// (Share) en vez del portapapeles para no añadir dependencias nativas.
export function UserCodeSection() {
  const { userCode, hydrated, groups, invitations } = useGroups();
  const actions = useGroupActions();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatted = userCode ? formatUserCode(userCode) : null;

  function confirmRegenerate() {
    Alert.alert(
      "¿Generar un código nuevo?",
      "El código actual dejará de servir para invitarte. Las invitaciones que ya tengas siguen pendientes.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Generar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              const result = await actions.regenerateUserCode();
              setBusy(false);
              if (!result.ok) setError(result.error);
            })();
          },
        },
      ],
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.copy}>
          <ThemedText type="small" themeColor="textSecondary">
            GRUPOS
          </ThemedText>
          <ThemedText type="smallBold">Tu código</ThemedText>
        </View>
        <Users size={20} color={theme.textSecondary} />
      </View>

      <ThemedText
        type="subtitle"
        accessibilityLabel={
          formatted ? `Tu código: ${formatted.split("").join(" ")}` : undefined
        }
        style={styles.code}
      >
        {formatted ?? (hydrated ? "—" : "Cargando…")}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Compártelo con quien quiera invitarte a un grupo. Nadie puede buscarte por tu
        correo.
      </ThemedText>
      <FieldError message={error} />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartir mi código"
          accessibilityState={{ disabled: !formatted }}
          disabled={!formatted}
          hitSlop={hitSlop}
          onPress={() =>
            void Share.share({
              message: `Mi código en Habit Tracker para invitarme a un grupo: ${formatted}`,
            })
          }
          style={[styles.button, { backgroundColor: theme.tint }]}
        >
          <Share2 size={16} color="#FFFFFF" />
          <ThemedText type="smallBold" style={{ color: "#FFFFFF" }}>
            Compartir
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generar un código nuevo"
          accessibilityState={{ disabled: busy || !formatted, busy }}
          disabled={busy || !formatted}
          hitSlop={hitSlop}
          onPress={confirmRegenerate}
          style={[styles.button, styles.outlined, { borderColor: theme.border }]}
        >
          <ThemedText type="smallBold">
            {busy ? "Generando…" : "Generar uno nuevo"}
          </ThemedText>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          invitations.length
            ? `Grupos, ${invitations.length} invitaciones pendientes`
            : "Grupos"
        }
        onPress={() => router.push("/grupos")}
        style={[styles.link, { borderColor: theme.border }]}
      >
        <ThemedText type="smallBold" style={styles.copy}>
          Tus grupos ({groups.length})
          {invitations.length ? ` · ${invitations.length} invitaciones` : ""}
        </ThemedText>
        <ChevronRight size={18} color={theme.textSecondary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three, padding: Spacing.four },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: { flex: 1, gap: 2 },
  code: { letterSpacing: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  outlined: { borderWidth: 1 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    minHeight: 44,
  },
});
