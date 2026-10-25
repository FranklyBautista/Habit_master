import { getGroupTodaySummary } from "@habit-tracker/domain";
import { router, useLocalSearchParams } from "expo-router";
import { MessageCircle, Settings } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { GroupPetCard } from "@/components/groups/group-pet-card";
import {
  FieldError,
  GroupButton,
  GroupScreen,
  hitSlop,
  LoadingState,
  MessageState,
  SectionTitle,
} from "@/components/groups/group-ui";
import { HabitPicker } from "@/components/groups/habit-picker";
import { MemberProgressCard } from "@/components/groups/member-progress-card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGroupActions, useGroupProgress } from "@/lib/group-store";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function GrupoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { progress, loading, error, notMember, refresh } = useGroupProgress(id);
  const actions = useGroupActions();
  const habitActions = useHabitActions();
  const habitSnapshot = useHabitStore();
  const theme = useTheme();
  const [pendingHabitIds, setPendingHabitIds] = useState<string[]>([]);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const me = progress?.members.find((member) => member.isMe);
  const mySharedIds =
    me?.habits.flatMap((habit) => (habit.habitId ? [habit.habitId] : [])) ?? [];

  // Mismo check-in que en Hoy (misma acción y misma dedupe); después se vuelve
  // a pedir el progreso del grupo, sin UI optimista.
  async function toggleHabit(habitId: string) {
    setPendingHabitIds((current) => [...current, habitId]);
    setToggleError(null);
    const ok = await habitActions.toggleToday(habitId);
    // Sin conexión el check-in queda en la cola (ADR 0003); el progreso del
    // grupo se vuelve a pedir al reconectar.
    if (ok && habitSnapshot.online) await refresh();
    else setToggleError("No se pudo guardar el check-in. Inténtalo de nuevo.");
    setPendingHabitIds((current) => current.filter((item) => item !== habitId));
  }

  async function saveShared() {
    setSaving(true);
    setSaveError(null);
    const result = await actions.setSharedHabits(id, selected);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setManaging(false);
  }

  const settingsButton = progress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ajustes de ${progress.name}`}
      hitSlop={hitSlop}
      onPress={() =>
        router.push({ pathname: "/grupos/[id]/ajustes", params: { id: progress.id } })
      }
      style={styles.iconButton}
    >
      <Settings size={22} color={theme.text} />
    </Pressable>
  ) : undefined;

  const headerActions = progress ? (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Chat de ${progress.name}`}
        hitSlop={hitSlop}
        onPress={() =>
          router.push({ pathname: "/grupos/[id]/chat", params: { id: progress.id } })
        }
        style={styles.iconButton}
      >
        <MessageCircle size={22} color={theme.text} />
      </Pressable>
      {settingsButton}
    </View>
  ) : undefined;

  if (notMember) {
    return (
      <GroupScreen title="Grupo">
        <MessageState
          title="Ya no formas parte de este grupo."
          message="Puede que te hayan expulsado o que el grupo se haya borrado."
          actionLabel="Ir a Grupos"
          onAction={() => router.replace("/grupos")}
        />
      </GroupScreen>
    );
  }

  if (!progress) {
    return (
      <GroupScreen title="Grupo">
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

  const summary = getGroupTodaySummary(progress);
  const members = [...progress.members].sort((a, b) => Number(b.isMe) - Number(a.isMe));
  const alone = progress.members.length === 1;

  return (
    <GroupScreen title={progress.name} action={headerActions}>
      <ThemedText type="smallBold" accessibilityRole="summary">
        {summary.participating
          ? `Hoy: ${summary.upToDate} de ${summary.participating} al día`
          : "Hoy nadie comparte hábitos todavía."}
      </ThemedText>
      {error ? <FieldError message={error} /> : null}
      <FieldError message={toggleError} />
      <GroupPetCard progress={progress} />

      {members.map((member) => (
        <MemberProgressCard
          key={member.memberId}
          member={member}
          onToggleHabit={
            member.isMe ? (habitId) => void toggleHabit(habitId) : undefined
          }
          pendingHabitIds={pendingHabitIds}
        />
      ))}

      {alone ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Aún estás solo en este grupo.{" "}
            {progress.myRole === "owner"
              ? "Invita a alguien con su código desde los ajustes del grupo."
              : ""}
          </ThemedText>
        </Card>
      ) : null}

      {managing ? (
        <View style={styles.section}>
          <SectionTitle>HÁBITOS QUE COMPARTES</SectionTitle>
          <HabitPicker selected={selected} onChange={setSelected} />
          <FieldError message={saveError} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <GroupButton
                label="Cancelar"
                variant="secondary"
                disabled={saving}
                onPress={() => setManaging(false)}
              />
            </View>
            <View style={styles.flex}>
              <GroupButton
                label="Guardar"
                busyLabel="Guardando…"
                busy={saving}
                onPress={() => void saveShared()}
              />
            </View>
          </View>
        </View>
      ) : (
        <GroupButton
          label="Gestionar mis hábitos"
          variant="secondary"
          onPress={() => {
            setSelected(mySharedIds);
            setSaveError(null);
            setManaging(true);
          }}
        />
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  iconButton: { padding: Spacing.one },
  headerActions: { flexDirection: "row", gap: Spacing.one },
  section: { gap: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two },
  flex: { flex: 1 },
});
