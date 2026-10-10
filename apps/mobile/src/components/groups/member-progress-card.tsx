import {
  getMemberTodayStatus,
  getSharedHabitStatus,
  type GroupMemberProgress,
} from "@habit-tracker/domain";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { streakLabel } from "./group-format";
import { groupColors, hitSlop } from "./group-ui";

// Tarjeta de un miembro en la vista del grupo. ✓/✗ siempre van con texto y los
// últimos 7 días tienen alternativa textual ("5 de 7 días"), nunca solo color.
// La tarjeta propia permite marcar el check-in de hoy (`onToggleHabit`).
export function MemberProgressCard({
  member,
  onToggleHabit,
  pendingHabitIds = [],
}: {
  member: GroupMemberProgress;
  onToggleHabit?: (habitId: string) => void;
  pendingHabitIds?: string[];
}) {
  const theme = useTheme();
  const status = getMemberTodayStatus(member);
  const name = member.displayName ?? "Miembro";
  const heading = [
    member.isMe ? `${name} (tú)` : name,
    member.role === "owner" ? "dueño" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <ThemedText type="smallBold" accessibilityRole="header">
        {heading}
      </ThemedText>
      {status.sharesHabits ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {member.isMe ? "Aún no compartes hábitos." : "Aún no comparte hábitos."}
        </ThemedText>
      )}
      {member.habits.map((habit, index) => {
        const habitStatus = getSharedHabitStatus(habit, member.today);
        const todayLabel = !habitStatus.activeToday
          ? "no toca hoy"
          : habitStatus.completedToday
            ? "✓ hoy"
            : "✗ hoy";
        const weekLabel = `${habitStatus.completedInLast7} de ${habitStatus.activeInLast7} días`;
        const canToggle =
          member.isMe && habit.habitId && onToggleHabit && habitStatus.activeToday;
        const pending = habit.habitId ? pendingHabitIds.includes(habit.habitId) : false;

        return (
          <View key={habit.habitId ?? `${habit.name}-${index}`} style={styles.habit}>
            <View style={styles.habitRow}>
              {canToggle ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Marcar ${habit.name} hoy`}
                  accessibilityState={{
                    checked: habitStatus.completedToday,
                    disabled: pending,
                    busy: pending,
                  }}
                  disabled={pending}
                  hitSlop={hitSlop}
                  onPress={() => onToggleHabit(habit.habitId as string)}
                  style={[
                    styles.checkbox,
                    { borderColor: habit.color },
                    habitStatus.completedToday && { backgroundColor: habit.color },
                    pending && styles.pending,
                  ]}
                >
                  {habitStatus.completedToday ? (
                    <Check size={16} color="#FFFFFF" />
                  ) : null}
                </Pressable>
              ) : (
                <View style={[styles.dot, { backgroundColor: habit.color }]} />
              )}
              <ThemedText style={styles.habitName}>{habit.name}</ThemedText>
              <ThemedText
                type="smallBold"
                style={{
                  color: !habitStatus.activeToday
                    ? theme.textSecondary
                    : habitStatus.completedToday
                      ? groupColors.success
                      : groupColors.danger,
                }}
              >
                {todayLabel}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {streakLabel(habitStatus.streak.current)}
            </ThemedText>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Últimos 7 días: ${weekLabel}`}
              style={styles.week}
            >
              {habitStatus.last7Days.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.day,
                    { borderColor: day.active ? habit.color : theme.border },
                    day.completed && { backgroundColor: habit.color },
                  ]}
                />
              ))}
              <ThemedText type="small" themeColor="textSecondary">
                {weekLabel}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  habit: { gap: Spacing.one, paddingTop: Spacing.one },
  habitRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  habitName: { flex: 1 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pending: { opacity: 0.5 },
  dot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 8 },
  week: { flexDirection: "row", alignItems: "center", gap: 4 },
  day: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
});
