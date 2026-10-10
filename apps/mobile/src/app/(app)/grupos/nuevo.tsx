import {
  formatUserCode,
  groupLimits,
  groupNameSchema,
  isPlaceholderDisplayName,
} from "@habit-tracker/domain";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import {
  expiresInLabel,
  groupDisplayNameProblem,
} from "@/components/groups/group-format";
import {
  FieldError,
  GroupButton,
  GroupScreen,
  GroupTextField,
  SectionTitle,
} from "@/components/groups/group-ui";
import { HabitPicker } from "@/components/groups/habit-picker";
import { InviteForm } from "@/components/groups/invite-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  isDisplayNameRequiredError,
  useGroupActions,
  useGroupProgress,
  useGroups,
} from "@/lib/group-store";
import { useHabitActions } from "@/lib/habit-store";

// Crear grupo en 3 pasos (WIREFRAMES_GRUPOS.md): nombre → hábitos que
// compartes → invitar. El grupo se crea al terminar el paso 2 (sin UI
// optimista), así que el paso 3 ya invita dentro de él y se puede saltar.
export default function NuevoGrupoScreen() {
  const snapshot = useGroups();
  const actions = useGroupActions();
  const habitActions = useHabitActions();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [askName, setAskName] = useState(false);
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  const showName =
    askName || (snapshot.hydrated && isPlaceholderDisplayName(snapshot.displayName));
  const atLimit = snapshot.groups.length >= groupLimits.maxGroupsPerUser;

  function nextFromName() {
    const parsed = groupNameSchema.safeParse(name);
    const nameProblem = parsed.success ? null : parsed.error.issues[0].message;
    const personProblem = showName ? groupDisplayNameProblem(displayName) : null;
    setNameError(nameProblem);
    setDisplayNameError(personProblem);
    if (!nameProblem && !personProblem) setStep(2);
  }

  async function create() {
    setCreating(true);
    setError(null);
    const result = await actions.createGroup({
      name,
      habitIds,
      displayName: showName ? displayName : undefined,
    });
    setCreating(false);
    if (!result.ok) {
      if (isDisplayNameRequiredError(result.error)) {
        setAskName(true);
        setDisplayNameError(result.error);
        setStep(1);
      } else {
        setError(result.error);
      }
      return;
    }
    if (showName) void habitActions.refresh();
    setGroupId(result.data);
    setStep(3);
  }

  function goToGroup(id: string) {
    router.replace({ pathname: "/grupos/[id]", params: { id } });
  }

  const back =
    step === 2
      ? () => setStep(1)
      : step === 3 && groupId
        ? () => goToGroup(groupId)
        : undefined;

  return (
    <GroupScreen title="Nuevo grupo" subtitle={`Paso ${step} de 3`} onBack={back}>
      {step === 1 ? (
        <>
          {atLimit ? (
            <Card>
              <ThemedText>
                Ya estás en {groupLimits.maxGroupsPerUser} grupos, el máximo. Sal de
                alguno para crear otro.
              </ThemedText>
            </Card>
          ) : null}
          <GroupTextField
            label="Nombre del grupo"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError(null);
            }}
            placeholder="Por ejemplo, Familia"
            hint="De 1 a 60 caracteres."
            error={nameError}
          />
          {showName ? (
            <GroupTextField
              label="Tu nombre en el grupo"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                setDisplayNameError(null);
              }}
              placeholder="Por ejemplo, Alex"
              hint="Es lo que verán los demás miembros. Se guarda en tu perfil."
              error={displayNameError}
            />
          ) : null}
          <GroupButton label="Siguiente" disabled={atLimit} onPress={nextFromName} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.section}>
            <SectionTitle>HÁBITOS QUE COMPARTES</SectionTitle>
            <HabitPicker selected={habitIds} onChange={setHabitIds} allowCreate />
            <ThemedText type="small" themeColor="textSecondary">
              Puedes no compartir ninguno. Los demás verán solo el nombre, el color y
              los días completados de los que elijas.
            </ThemedText>
          </View>
          <FieldError message={error} />
          <GroupButton
            label="Siguiente"
            busyLabel="Creando grupo…"
            busy={creating}
            onPress={() => void create()}
          />
        </>
      ) : null}

      {step === 3 && groupId ? (
        <InviteStep
          groupId={groupId}
          userCode={snapshot.userCode}
          onFinish={() => goToGroup(groupId)}
        />
      ) : null}
    </GroupScreen>
  );
}

function InviteStep({
  groupId,
  userCode,
  onFinish,
}: {
  groupId: string;
  userCode: string | null;
  onFinish: () => void;
}) {
  const actions = useGroupActions();
  const { progress } = useGroupProgress(groupId);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = progress?.pendingInvitations ?? [];

  async function remove(invitationId: string) {
    setRemoving(invitationId);
    setError(null);
    const result = await actions.cancelInvitation(invitationId);
    setRemoving(null);
    if (!result.ok) setError(result.error);
  }

  return (
    <>
      <ThemedText>Grupo creado. Invita a tu gente con su código.</ThemedText>
      <InviteForm groupId={groupId} />

      {pending.length ? (
        <View style={styles.section}>
          <SectionTitle>PENDIENTES</SectionTitle>
          {pending.map((invitation) => (
            <View key={invitation.id} style={styles.pendingRow}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {formatUserCode(invitation.userCode)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Enviada · {expiresInLabel(invitation.expiresAt)}
                </ThemedText>
              </View>
              <GroupButton
                label="Quitar"
                accessibilityLabel={`Quitar invitación a ${formatUserCode(invitation.userCode)}`}
                busyLabel="Quitando…"
                busy={removing === invitation.id}
                variant="secondary"
                onPress={() => void remove(invitation.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
      <FieldError message={error} />

      {userCode ? (
        <ThemedText type="small" themeColor="textSecondary">
          Tu código: {formatUserCode(userCode)}
        </ThemedText>
      ) : null}

      <View style={styles.row}>
        <View style={styles.flex}>
          <GroupButton
            label={pending.length ? "Ir al grupo" : "Saltar"}
            variant={pending.length ? "primary" : "secondary"}
            onPress={onFinish}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
});
