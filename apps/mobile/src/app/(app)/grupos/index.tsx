import { groupLimits } from "@habit-tracker/domain";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { expiresInLabel, memberCountLabel } from "@/components/groups/group-format";
import {
  FieldError,
  GroupButton,
  GroupScreen,
  hitSlop,
  LoadingState,
  MessageState,
  SectionTitle,
} from "@/components/groups/group-ui";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGroupActions, useGroups } from "@/lib/group-store";

export default function GruposScreen() {
  const snapshot = useGroups();
  const actions = useGroupActions();
  const theme = useTheme();
  const [declining, setDeclining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const atLimit = snapshot.groups.length >= groupLimits.maxGroupsPerUser;

  async function decline(invitationId: string) {
    setDeclining(invitationId);
    setError(null);
    const result = await actions.respondInvitation({ invitationId, accept: false });
    setDeclining(null);
    if (!result.ok) setError(result.error);
  }

  const createButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Crear grupo"
      accessibilityState={{ disabled: atLimit }}
      disabled={atLimit}
      hitSlop={hitSlop}
      onPress={() => router.push("/grupos/nuevo")}
      style={[
        styles.create,
        { backgroundColor: theme.tint },
        atLimit && styles.disabled,
      ]}
    >
      <Plus size={18} color="#FFFFFF" />
      <ThemedText type="smallBold" style={{ color: "#FFFFFF" }}>
        Crear
      </ThemedText>
    </Pressable>
  );

  let content;
  if (!snapshot.hydrated && snapshot.error) {
    content = (
      <MessageState
        title="No se pudieron cargar tus grupos."
        message={snapshot.error}
        actionLabel="Reintentar"
        onAction={() => void actions.refresh()}
      />
    );
  } else if (!snapshot.hydrated) {
    content = <LoadingState />;
  } else {
    content = (
      <>
        {snapshot.error ? <FieldError message={snapshot.error} /> : null}
        <FieldError message={error} />

        {snapshot.invitations.length ? (
          <View style={styles.section}>
            <SectionTitle>INVITACIONES ({snapshot.invitations.length})</SectionTitle>
            {snapshot.invitations.map((invitation) => (
              <Card key={invitation.id}>
                <ThemedText>
                  {invitation.inviterName ?? "Alguien"} te invita a «
                  {invitation.groupName}»
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {memberCountLabel(invitation.memberCount)} ·{" "}
                  {expiresInLabel(invitation.expiresAt)}
                </ThemedText>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <GroupButton
                      label="Rechazar"
                      accessibilityLabel={`Rechazar invitación a ${invitation.groupName}`}
                      busyLabel="Rechazando…"
                      busy={declining === invitation.id}
                      variant="secondary"
                      onPress={() => void decline(invitation.id)}
                    />
                  </View>
                  <View style={styles.flex}>
                    <GroupButton
                      label="Ver y unirme"
                      accessibilityLabel={`Ver invitación a ${invitation.groupName}`}
                      onPress={() =>
                        router.push({
                          pathname: "/grupos/invitacion/[id]",
                          params: { id: invitation.id },
                        })
                      }
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTitle>
            TUS GRUPOS ({snapshot.groups.length}/{groupLimits.maxGroupsPerUser})
          </SectionTitle>
          {snapshot.groups.length ? (
            snapshot.groups.map((group) => (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityLabel={`${group.name}, ${memberCountLabel(group.memberCount)}`}
                onPress={() =>
                  router.push({ pathname: "/grupos/[id]", params: { id: group.id } })
                }
                style={[
                  styles.groupRow,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{group.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {memberCountLabel(group.memberCount)}
                    {group.role === "owner" ? " · eres el dueño" : ""}
                  </ThemedText>
                </View>
                <ChevronRight size={20} color={theme.textSecondary} />
              </Pressable>
            ))
          ) : (
            <MessageState
              title="Aún no estás en ningún grupo."
              message="Crea uno, elige qué hábitos compartes e invita a tu gente con su código."
              actionLabel="Crear grupo"
              onAction={() => router.push("/grupos/nuevo")}
            />
          )}
          {atLimit ? (
            <ThemedText type="small" themeColor="textSecondary">
              Ya estás en {groupLimits.maxGroupsPerUser} grupos, el máximo.
            </ThemedText>
          ) : null}
        </View>
      </>
    );
  }

  return (
    <GroupScreen
      title="Grupos"
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      action={createButton}
    >
      {content}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 40,
  },
  disabled: { opacity: 0.6 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    minHeight: 56,
  },
});
