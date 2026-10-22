import {
  calculateStreaks,
  formatLocalDate,
  getLocalDateKey,
} from "@habit-tracker/domain";
import { Link } from "expo-router";
import { Check, Flame, Inbox, Plus, Target, Trophy } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { Button } from "@/components/button";
import { GroupsCard } from "@/components/groups/groups-card";
import { habitIconComponents } from "@/components/habit-icons";
import { ProgressRing } from "@/components/progress-ring";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WeekStrip } from "@/components/week-strip";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function HoyScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const theme = useTheme();
  const { activeHabits, completedIds } = getTodaySnapshot(snapshot);
  const completed = activeHabits.filter((habit) => completedIds.has(habit.id)).length;
  const percentage = activeHabits.length
    ? Math.round((completed / activeHabits.length) * 100)
    : null;

  const { settings } = snapshot;
  const today = getLocalDateKey(new Date(), settings.timezone);
  const options = {
    habits: snapshot.habits,
    checkins: snapshot.checkins,
    timezone: settings.timezone,
  };
  const streaks = calculateStreaks(today, options);
  const dateLabel = formatLocalDate(today, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const remaining = activeHabits.length - completed;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="small" themeColor="textSecondary">
                {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
              </ThemedText>
            </View>
            <Link href="/(app)/ajustes" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir ajustes"
                // Hijo de <Link asChild>: expo-router no acepta un array de estilos.
                style={StyleSheet.flatten([
                  styles.avatarRing,
                  { borderColor: theme.tint },
                ])}
              >
                <View
                  style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="subtitle">
                    {settings.displayName.slice(0, 1).toUpperCase() || "?"}
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          </View>

          <View style={styles.stats}>
            <Stat
              icon={<Target size={18} color={theme.tint} />}
              value={percentage === null ? "—" : `${percentage}%`}
              label="Hoy"
            />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <Stat
              icon={<Flame size={18} color={theme.tint} />}
              value={String(streaks.current)}
              label="Racha"
            />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <Stat
              icon={<Trophy size={18} color={theme.tint} />}
              value={String(streaks.best)}
              label="Mejor racha"
            />
          </View>

          <WeekStrip today={today} options={options} />

          <GroupsCard />

          {activeHabits.length ? (
            <>
              <View
                style={[
                  styles.hero,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* El View absoluto ocupa toda la tarjeta; el Svg directo con
                    "100%" se medía contra el área sin padding y el brillo quedaba
                    cortado antes del borde (mismo arreglo que en AuthButton). */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <RadialGradient id="heroGlow" cx="100%" cy="0%" r="90%">
                        <Stop offset="0" stopColor={theme.accent} stopOpacity={0.35} />
                        <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#heroGlow)" />
                  </Svg>
                </View>
                <View style={styles.heroCopy}>
                  <ThemedText type="small" themeColor="textSecondary">
                    PROGRESO DE HOY
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {remaining === 0 ? "¡Todo listo!" : "Sigue así"}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {remaining === 0
                      ? streaks.current > 1
                        ? `${streaks.current} días seguidos completando todo.`
                        : "Completaste todos tus hábitos de hoy."
                      : `Te ${remaining === 1 ? "falta uno" : `faltan ${remaining}`}. Sin prisa.`}
                  </ThemedText>
                </View>
                <ProgressRing percentage={percentage}>
                  <ThemedText type="smallBold" style={styles.ringValue}>
                    {completed}/{activeHabits.length}
                  </ThemedText>
                </ProgressRing>
              </View>

              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">Tus hábitos</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {completed} de {activeHabits.length}
                </ThemedText>
              </View>

              <View style={styles.list}>
                {activeHabits.map((habit) => {
                  const checked = completedIds.has(habit.id);
                  const Icon = habitIconComponents[habit.icon];
                  return (
                    <Pressable
                      key={habit.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={habit.name}
                      style={({ pressed }) => [
                        styles.habitRow,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: checked ? theme.tint : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => void actions.toggleToday(habit.id)}
                    >
                      <View
                        style={[styles.habitIcon, { backgroundColor: habit.color }]}
                      >
                        <Icon size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.habitCopy}>
                        <ThemedText type="smallBold" style={styles.habitName}>
                          {habit.name}
                        </ThemedText>
                        {habit.description ? (
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            numberOfLines={2}
                          >
                            {habit.description}
                          </ThemedText>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.check,
                          checked
                            ? {
                                backgroundColor: theme.accent,
                                borderColor: theme.accent,
                              }
                            : { borderColor: theme.textSecondary },
                        ]}
                      >
                        {checked ? (
                          <Check size={16} strokeWidth={3} color={theme.onAccent} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
                <Inbox size={26} color={theme.tint} />
              </View>
              <ThemedText type="subtitle">Sin hábitos para este día</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: "center" }}>
                Crea tu primer hábito para empezar una rutina sencilla.
              </ThemedText>
              <Link href="/(app)/habitos" asChild>
                <Button
                  label="Crear un hábito"
                  icon={(color) => <Plus size={18} color={color} />}
                  style={styles.emptyButton}
                />
              </Link>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.statValueRow}>
        {icon}
        <ThemedText type="subtitle">{value}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  headerCopy: { flex: 1, gap: 2 },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: Spacing.one + 2 },
  statDivider: { width: 1, height: 32 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroCopy: { flex: 1, gap: Spacing.one },
  ringValue: { fontSize: 18, lineHeight: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: Spacing.two,
  },
  list: { gap: Spacing.two },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCopy: { flex: 1, gap: 2 },
  habitName: { fontSize: 16, lineHeight: 22 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
  },
  emptyButton: { marginTop: Spacing.two },
});
