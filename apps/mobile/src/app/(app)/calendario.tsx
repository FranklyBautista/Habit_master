import {
  addMonthsToDateKey,
  calculateDailyCompletion,
  formatLocalDate,
  getLocalDateKey,
  getMondayFirstWeekday,
  getMonthDateKeys,
  isHabitActiveOnDate,
} from "@habit-tracker/domain";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHabitStore } from "@/lib/habit-store";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const GENERAL = "general";

function toneLevel(value: number | null): 0 | 1 | 2 | 3 | 4 {
  if (value === null) return 0;
  if (value === 0) return 1;
  if (value >= 100) return 4;
  return value <= 50 ? 2 : 3;
}

export default function CalendarioScreen() {
  const snapshot = useHabitStore();
  const theme = useTheme();
  const { habits, checkins, settings } = snapshot;

  const today = getLocalDateKey(new Date(), settings.timezone);
  const [monthKey, setMonthKey] = useState(`${today.slice(0, 7)}-01`);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState(GENERAL);

  const habitId = scope === GENERAL ? undefined : scope;
  const options = { habits, checkins, timezone: settings.timezone, habitId };

  const monthDates = getMonthDateKeys(monthKey);
  const leadingCells = getMondayFirstWeekday(monthDates[0]);
  const monthMetrics = monthDates.map((date) =>
    calculateDailyCompletion(date, options),
  );

  const selectedMetrics = calculateDailyCompletion(selectedDate, options);
  const completedIds = new Set(
    checkins.filter((c) => c.checkinDate === selectedDate).map((c) => c.habitId),
  );
  const expectedHabits = habits.filter(
    (habit) =>
      (scope === GENERAL || habit.id === scope) &&
      isHabitActiveOnDate(habit, selectedDate, settings.timezone),
  );

  function changeMonth(amount: number) {
    const next = addMonthsToDateKey(monthKey, amount);
    setMonthKey(next);
    setSelectedDate(today.startsWith(next.slice(0, 7)) ? today : next);
  }

  const monthLabel = formatLocalDate(monthKey, { month: "long", year: "numeric" });
  const selectedLabel = formatLocalDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Tone backgrounds keyed by level; text flips to white on the strong tones.
  const toneBg = [
    "transparent",
    theme.backgroundSelected,
    theme.tint + "3A",
    theme.tint + "8C",
    theme.tint,
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Calendario</ThemedText>
          <ThemedText themeColor="textSecondary">
            El color representa el porcentaje cumplido, no una cantidad absoluta.
          </ThemedText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scopeRow}
          >
            {[{ id: GENERAL, name: "Resumen general" }, ...habits].map((item) => {
              const active = item.id === scope;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setScope(item.id)}
                  style={[
                    styles.scopeChip,
                    {
                      backgroundColor: active ? theme.tint : theme.backgroundElement,
                      borderColor: active ? theme.tint : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: active ? "white" : theme.text }}
                  >
                    {item.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <Card>
            <View style={styles.monthControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
                hitSlop={8}
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
              >
                <ChevronLeft size={20} color={theme.text} />
              </Pressable>
              <ThemedText type="smallBold" accessibilityLiveRegion="polite">
                {monthLabel}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
                hitSlop={8}
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
              >
                <ChevronRight size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.grid} accessibilityRole="none">
              {WEEKDAYS.map((day) => (
                <View key={day} style={styles.cell}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {day}
                  </ThemedText>
                </View>
              ))}
              {Array.from({ length: leadingCells }, (_, index) => (
                <View key={`empty-${index}`} style={styles.cell} />
              ))}
              {monthMetrics.map((metrics) => {
                const level = toneLevel(metrics.percentage);
                const isSelected = metrics.date === selectedDate;
                const isToday = metrics.date === today;
                const status =
                  metrics.percentage === null
                    ? "sin hábitos previstos"
                    : `${metrics.percentage}% completado`;
                return (
                  <Pressable
                    key={metrics.date}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${formatLocalDate(metrics.date, {
                      day: "numeric",
                      month: "long",
                    })}, ${status}`}
                    onPress={() => setSelectedDate(metrics.date)}
                    style={styles.cell}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        { backgroundColor: toneBg[level] },
                        isToday && { borderColor: theme.tint, borderWidth: 1 },
                        isSelected && {
                          borderColor: theme.text,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color: level >= 3 ? "white" : theme.text,
                          fontWeight: isToday ? "700" : "500",
                        }}
                      >
                        {Number(metrics.date.slice(-2))}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={styles.legend}
              accessibilityRole="none"
              accessibilityLabel="Leyenda de cumplimiento"
            >
              {[
                ["Sin datos", toneBg[0]],
                ["0%", toneBg[1]],
                ["Parcial", toneBg[3]],
                ["100%", toneBg[4]],
              ].map(([label, color]) => (
                <View key={label} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      {
                        backgroundColor: color,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>

          <Card accessibilityLiveRegion="polite">
            <ThemedText type="small" themeColor="textSecondary">
              {selectedLabel}
            </ThemedText>
            <ThemedText type="smallBold">
              {selectedMetrics.percentage === null
                ? "Sin datos para este día"
                : selectedMetrics.percentage === 100
                  ? "Día completo"
                  : "Progreso del día"}
            </ThemedText>
            <ThemedText style={styles.dayValue}>
              {selectedMetrics.completed} de {selectedMetrics.expected}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selectedMetrics.percentage === null
                ? "Ningún hábito contaba todavía en esta fecha."
                : `${selectedMetrics.percentage}% de los hábitos previstos fue completado.`}
            </ThemedText>

            {expectedHabits.length ? (
              <View style={styles.miniHabits}>
                {expectedHabits.map((habit) => {
                  const done = completedIds.has(habit.id);
                  return (
                    <View
                      key={habit.id}
                      style={styles.miniHabit}
                      accessibilityRole="text"
                      accessibilityLabel={`${habit.name}, ${done ? "completado" : "pendiente"}`}
                    >
                      {done ? (
                        <CheckCircle2 size={17} color={theme.tint} />
                      ) : (
                        <Circle size={17} color={theme.textSecondary} />
                      )}
                      <ThemedText type="small">{habit.name}</ThemedText>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  scopeRow: { gap: Spacing.two, paddingVertical: Spacing.two },
  scopeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
  },
  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.one,
  },
  monthButton: { padding: Spacing.one },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: Spacing.one },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  dayInner: {
    width: "100%",
    height: "100%",
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "transparent",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  dayValue: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  miniHabits: { gap: Spacing.two, marginTop: Spacing.one },
  miniHabit: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
});
