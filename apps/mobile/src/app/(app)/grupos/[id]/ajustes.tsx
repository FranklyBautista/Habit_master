import {
  formatUserCode,
  groupLimits,
  type GroupMemberProgress,
  type GroupProgress,
} from "@habit-tracker/domain";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { expiresInLabel } from "@/components/groups/group-format";
import {
  FieldError,
  GroupButton,
  GroupScreen,
  GroupTextField,
  LoadingState,
  MessageState,
  SectionTitle,
} from "@/components/groups/group-ui";
import { InviteForm } from "@/components/groups/invite-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  type ActionResult,
  useGroupActions,
  useGroupProgress,
} from "@/lib/group-store";

export default function AjustesGrupoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { progress, loading, error, notMember, refresh } = useGroupProgress(id);

  if (notMember) {
    return (
      <GroupScreen title="Ajustes del grupo">
        <MessageState
          title="Ya no formas parte de este grupo."
          actionLabel="Ir a Grupos"
          onAction={() => router.replace("/grupos")}
        />
      </GroupScreen>
    );
  }

  if (!progress) {
    return (
      <GroupScreen title="Ajustes del grupo">
        {loading ? (
          <LoadingState />
        ) : (
          <MessageState
            title="No se pudo cargar el grupo."
            message={error ?? undefined}
            actionLabel="Reintentar"
            onAction={() => void refresh()}
          />
        )}
      </GroupScreen>
    );
  }

  // `key`: si el grupo cambia de nombre fuera, el formulario arranca de nuevo.
  return <GroupSettings key={progress.id} groupId={id} progress={progress} />;
}

function GroupSettings({
  groupId,
  progress,
}: {
  groupId: string;
  progress: GroupProgress;
}) {
  const actions = useGroupActions();
  const theme = useTheme();
  const [name, setName] = useState(progress.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  const isOwner = progress.myRole === "owner";
  const others = progress.members.filter((member) => !member.isMe);
  const mustTransfer = isOwner && others.length > 0;

  async function run(key: string, action: () => Promise<ActionResult>) {
    setBusy(key);
    setError(null);
    const result = await action();
    setBusy(null);
    if (!result.ok) setError(result.error);
    return result.ok;
  }

  async function rename() {
    setNameError(null);
    setNameSaved(false);
    setBusy("rename");
    const result = await actions.renameGroup(groupId, name);
    setBusy(null);
    if (!result.ok) setNameError(result.error);
    else setNameSaved(true);
  }

  function confirmMemberAction(member: GroupMemberProgress, kind: "remove" | "owner") {
    const who = member.displayName ?? "este miembro";
    Alert.alert(
      kind === "remove" ? `¿Expulsar a ${who}?` : `¿Hacer dueño a ${who}?`,
      kind === "remove"
        ? "Perderá el acceso al grupo y se dejará de ver lo que compartía. Podrás volver a invitarle."
        : "Podrá invitar, expulsar y borrar el grupo. Tú pasarás a ser miembro.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: kind === "remove" ? "Expulsar" : "Hacer dueño",
          style: kind === "remove" ? "destructive" : "default",
          onPress: () =>
            void run(`${kind}:${member.memberId}`, () =>
              kind === "remove"
                ? actions.removeMember(groupId, member.memberId)
                : actions.transferOwnership(groupId, member.memberId),
            ),
        },
      ],
    );
  }

  function confirmLeave() {
    Alert.alert(
      "¿Salir del grupo?",
      others.length
        ? "Dejarás de ver el progreso del grupo y se dejará de compartir lo tuyo."
        : "Eres el único miembro: salir borra el grupo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: () =>
            void (async () => {
              if (await run("leave", () => actions.leaveGroup(groupId))) {
                router.replace("/grupos");
              }
            })(),
        },
      ],
    );
  }

  async function deleteGroup() {
    if (await run("delete", () => actions.deleteGroup(groupId))) {
      router.replace("/grupos");
    }
  }

  return (
    <GroupScreen title={`Ajustes de ${progress.name}`}>
      <FieldError message={error} />

      {isOwner ? (
        <View style={styles.section}>
          <GroupTextField
            label="Nombre del grupo"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError(null);
              setNameSaved(false);
            }}
            error={nameError}
          />
          <GroupButton
            label="Guardar nombre"
            busyLabel="Guardando…"
            busy={busy === "rename"}
            disabled={name.trim() === progress.name}
            onPress={() => void rename()}
          />
          {nameSaved ? (
            <ThemedText type="small" accessibilityRole="alert">
              Nombre guardado.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionTitle>
          MIEMBROS ({progress.members.length}/{groupLimits.maxMembers})
        </SectionTitle>
        {progress.members.map((member) => (
          <Card key={member.memberId}>
            <ThemedText type="smallBold">
              {member.displayName ?? "Miembro"}
              {member.isMe ? " (tú)" : ""}
              {member.role === "owner" ? " · dueño" : ""}
            </ThemedText>
            {isOwner && !member.isMe ? (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <GroupButton
                    label="Hacer dueño"
                    accessibilityLabel={`Hacer dueño a ${member.displayName ?? "este miembro"}`}
                    busyLabel="Transfiriendo…"
                    busy={busy === `owner:${member.memberId}`}
                    disabled={busy !== null}
                    variant="secondary"
                    onPress={() => confirmMemberAction(member, "owner")}
                  />
                </View>
                <View style={styles.flex}>
                  <GroupButton
                    label="Expulsar"
                    accessibilityLabel={`Expulsar a ${member.displayName ?? "este miembro"}`}
                    busyLabel="Expulsando…"
                    busy={busy === `remove:${member.memberId}`}
                    disabled={busy !== null}
                    variant="danger"
                    onPress={() => confirmMemberAction(member, "remove")}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      {isOwner ? (
        <View style={styles.section}>
          <SectionTitle>INVITACIONES PENDIENTES</SectionTitle>
          {progress.pendingInvitations.length ? (
            progress.pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={styles.pendingRow}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">
                    {formatUserCode(invitation.userCode)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {expiresInLabel(invitation.expiresAt)}
                  </ThemedText>
                </View>
                <GroupButton
                  label="Cancelar"
                  accessibilityLabel={`Cancelar invitación a ${formatUserCode(invitation.userCode)}`}
                  busyLabel="Cancelando…"
                  busy={busy === `cancel:${invitation.id}`}
                  disabled={busy !== null}
                  variant="secondary"
                  onPress={() =>
                    void run(`cancel:${invitation.id}`, () =>
                      actions.cancelInvitation(invitation.id),
                    )
                  }
                />
              </View>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No hay invitaciones pendientes.
            </ThemedText>
          )}
          <InviteForm groupId={groupId} />
        </View>
      ) : null}

      <View style={[styles.section, styles.danger, { borderColor: theme.border }]}>
        <GroupButton
          label="Salir del grupo"
          busyLabel="Saliendo…"
          busy={busy === "leave"}
          disabled={mustTransfer || busy !== null}
          variant="secondary"
          onPress={confirmLeave}
        />
        {mustTransfer ? (
          <ThemedText type="small" themeColor="textSecondary">
            Para salir, primero haz dueño a otro miembro.
          </ThemedText>
        ) : null}

        {isOwner ? (
          confirmingDelete ? (
            <View style={styles.section}>
              <GroupTextField
                label={`Escribe «${progress.name}» para confirmar`}
                value={deleteName}
                onChangeText={setDeleteName}
                hint="Se borrará el grupo para todos sus miembros. Sus hábitos personales no cambian."
              />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <GroupButton
                    label="Cancelar"
                    variant="secondary"
                    disabled={busy === "delete"}
                    onPress={() => {
                      setConfirmingDelete(false);
                      setDeleteName("");
                    }}
                  />
                </View>
                <View style={styles.flex}>
                  <GroupButton
                    label="Borrar grupo"
                    busyLabel="Borrando…"
                    busy={busy === "delete"}
                    disabled={deleteName.trim() !== progress.name}
                    variant="danger"
                    onPress={() => void deleteGroup()}
                  />
                </View>
              </View>
            </View>
          ) : (
            <GroupButton
              label="Borrar grupo"
              variant="danger"
              disabled={busy !== null}
              onPress={() => setConfirmingDelete(true)}
            />
          )
        ) : null}
      </View>
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  danger: { borderTopWidth: 1, paddingTop: Spacing.three },
});
