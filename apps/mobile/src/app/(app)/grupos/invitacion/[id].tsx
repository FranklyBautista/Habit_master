import { isPlaceholderDisplayName } from "@habit-tracker/domain";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import {
  expiresInLabel,
  groupDisplayNameProblem,
  memberCountLabel,
} from "@/components/groups/group-format";
import {
  FieldError,
  GroupButton,
  GroupScreen,
  GroupTextField,
  LoadingState,
  MessageState,
  SectionTitle,
} from "@/components/groups/group-ui";
import { HabitPicker } from "@/components/groups/habit-picker";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  isDisplayNameRequiredError,
  useGroupActions,
  useGroups,
} from "@/lib/group-store";
import { useHabitActions } from "@/lib/habit-store";

export default function InvitacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useGroups();
  const actions = useGroupActions();
  const habitActions = useHabitActions();
  const invitation = snapshot.invitations.find((item) => item.id === id);

  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  // Tras aceptar o rechazar, la invitación sale del overview: no mostrar
  // "ya no está disponible" mientras se navega.
  const [done, setDone] = useState(false);

  const showName = askName || isPlaceholderDisplayName(snapshot.displayName);

  async function respond(accept: boolean) {
    if (!invitation) return;
    setError(null);
    setNameError(null);
    if (accept && showName) {
      const problem = groupDisplayNameProblem(displayName);
      if (problem) {
        setNameError(problem);
        return;
      }
    }
    setBusy(accept ? "accept" : "decline");
    const result = await actions.respondInvitation({
      invitationId: invitation.id,
      accept,
      habitIds: accept ? habitIds : [],
      displayName: accept && showName ? displayName : undefined,
    });
    setBusy(null);
    if (!result.ok) {
      if (isDisplayNameRequiredError(result.error)) {
        setAskName(true);
        setNameError(result.error);
      } else {
        setError(result.error);
      }
      return;
    }
    setDone(true);
    if (accept) {
      if (showName) void habitActions.refresh();
      router.replace({ pathname: "/grupos/[id]", params: { id: invitation.groupId } });
    } else {
      router.replace("/grupos");
    }
  }

  if (!snapshot.hydrated) {
    return (
      <GroupScreen title="Invitación">
        <LoadingState />
      </GroupScreen>
    );
  }

  if (!invitation) {
    return (
      <GroupScreen title="Invitación">
        <MessageState
          title={done ? "Listo." : "Esta invitación ya no está disponible."}
          message={
            done ? undefined : "Puede que haya caducado o que la hayan cancelado."
          }
          actionLabel="Ir a Grupos"
          onAction={() => router.replace("/grupos")}
        />
      </GroupScreen>
    );
  }

  return (
    <GroupScreen
      title={`Unirte a «${invitation.groupName}»`}
      subtitle={`${invitation.inviterName ? `Te invita ${invitation.inviterName} · ` : ""}${memberCountLabel(invitation.memberCount)} · ${expiresInLabel(invitation.expiresAt)}`}
    >
      {showName ? (
        <GroupTextField
          label="Tu nombre en el grupo"
          value={displayName}
          onChangeText={(text) => {
            setDisplayName(text);
            setNameError(null);
          }}
          placeholder="Por ejemplo, Alex"
          hint="Es lo que verán los demás miembros. Se guarda en tu perfil."
          error={nameError}
        />
      ) : null}

      <View style={styles.section}>
        <SectionTitle>¿QUÉ HÁBITOS COMPARTES?</SectionTitle>
        <HabitPicker selected={habitIds} onChange={setHabitIds} />
        <ThemedText type="small" themeColor="textSecondary">
          Puedes no compartir ninguno y participar solo animando.
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Los demás verán tu nombre y, de los hábitos que compartas, el nombre, el color
          y los días completados. Nada más de tu cuenta: ni tu correo, ni tus otros
          hábitos, ni la hora de cada check-in.
        </ThemedText>
      </Card>

      <FieldError message={error} />

      <View style={styles.row}>
        <View style={styles.flex}>
          <GroupButton
            label="Rechazar"
            busyLabel="Rechazando…"
            busy={busy === "decline"}
            disabled={busy !== null}
            variant="secondary"
            onPress={() => void respond(false)}
          />
        </View>
        <View style={styles.flex}>
          <GroupButton
            label="Unirme"
            busyLabel="Uniéndote…"
            busy={busy === "accept"}
            disabled={busy !== null}
            onPress={() => void respond(true)}
          />
        </View>
      </View>
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
});
