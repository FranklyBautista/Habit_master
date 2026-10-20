import { calculateStreaks, type Habit, type HabitCheckin } from "@habit-tracker/domain";
import { Flame } from "lucide-react-native";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { habitIconComponents } from "@/components/habit-icons";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { buildHabitHeatmap, type HeatmapCellState } from "@/lib/habit-heatmap";

const CELL = 11;
const GAP = 3;
const MAX_WEEKS = 53;
// Hasta medir el ancho real se pinta medio año, que cabe en cualquier móvil.
const DEFAULT_WEEKS = 20;

type Props = {
  habit: Habit;
  habits: Habit[];
  checkins: HabitCheckin[];
  today: string;
  timezone: string;
};

// Historial al estilo de las contribuciones de GitHub: una columna por semana,
// una fila por día (de lunes a domingo) y el color del hábito en cada día marcado.
export function HabitHeatmapCard({ habit, habits, checkins, today, timezone }: Props) {
  const theme = useTheme();
  const [weekCount, setWeekCount] = useState(DEFAULT_WEEKS);

  const heatmap = buildHabitHeatmap(habit, checkins, today, timezone, weekCount);
  const streak = calculateStreaks(today, {
    habits,
    checkins,
    timezone,
    habitId: habit.id,
  }).current;
  const Icon = habitIconComponents[habit.icon];

  function onGridLayout(event: LayoutChangeEvent) {
    const fit = Math.floor((event.nativeEvent.layout.width + GAP) / (CELL + GAP));
    const next = Math.max(1, Math.min(MAX_WEEKS, fit));
    if (next !== weekCount) setWeekCount(next);
  }

  const cellColor: Record<HeatmapCellState, string> = {
    done: habit.color,
    missed: theme.backgroundSelected,
    inactive: theme.backgroundSelected,
    future: "transparent",
  };

  return (
    <Card
      accessible
      accessibilityLabel={`${habit.name}: ${heatmap.completed} días completados en las últimas ${weekCount} semanas, racha actual de ${streak} días`}
    >
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: `${habit.color}26` }]}>
          <Icon size={16} color={habit.color} />
        </View>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
          {habit.name}
        </ThemedText>
        <View style={styles.stat}>
          <Flame size={14} color={theme.tint} />
          <ThemedText type="small">{streak}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {heatmap.completed}d
        </ThemedText>
      </View>

      <View onLayout={onGridLayout}>
        <View style={styles.months}>
          {heatmap.months.map((month) => (
            <ThemedText
              key={`${month.column}-${month.label}`}
              type="small"
              themeColor="textSecondary"
              style={[styles.monthLabel, { left: month.column * (CELL + GAP) }]}
            >
              {month.label}
            </ThemedText>
          ))}
        </View>
        <View style={styles.grid}>
          {heatmap.weeks.map((week) => (
            <View key={week[0].date} style={styles.week}>
              {week.map((cell) => (
                <View
                  key={cell.date}
                  style={[
                    styles.cell,
                    { backgroundColor: cellColor[cell.state] },
                    cell.state === "inactive" && styles.inactive,
                    cell.date === today && {
                      borderWidth: 1.5,
                      borderColor: theme.text,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1 },
  stat: { flexDirection: "row", alignItems: "center", gap: 2 },
  months: { height: 18, marginTop: Spacing.one },
  monthLabel: { position: "absolute", top: 0, fontSize: 11, lineHeight: 14 },
  grid: { flexDirection: "row", gap: GAP },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  inactive: { opacity: 0.4 },
});
