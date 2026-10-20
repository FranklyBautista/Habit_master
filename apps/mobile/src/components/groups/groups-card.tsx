import { router } from "expo-router";
import { ChevronRight, Users } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGroups } from "@/lib/group-store";

// Acceso a Grupos desde Hoy (la barra inferior se queda con 5 pestañas). Sin
// grupos ni invitaciones invita a crear uno.
export function GroupsCard() {
  const { hydrated, groups, invitations } = useGroups();
  const theme = useTheme();
  if (!hydrated) return null;

  const empty = !groups.length && !invitations.length;
  const pending = invitations.length;
  const detail = empty
    ? "Comparte hábitos con tu gente y animaos a diario."
    : groups.length
      ? groups.map((group) => group.name).join(" · ")
      : "Aún no estás en ningún grupo.";
  const label = empty
    ? "Comparte hábitos con tu gente"
    : `Grupos${pending ? `, ${pending === 1 ? "1 invitación nueva" : `${pending} invitaciones nuevas`}` : ""}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={empty ? "Crea un grupo" : "Abre tus grupos"}
      onPress={() => router.push(empty ? "/grupos/nuevo" : "/grupos")}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <Users size={22} color={theme.tint} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold">
            {empty ? "Comparte hábitos con tu gente" : "Grupos"}
          </ThemedText>
          {pending ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText
                type="smallBold"
                style={[styles.badgeText, { color: theme.onAccent }]}
              >
                {pending === 1 ? "1 nueva" : `${pending} nuevas`}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {detail}
        </ThemedText>
      </View>
      <ChevronRight size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    minHeight: 56,
  },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 12, lineHeight: 16 },
});
