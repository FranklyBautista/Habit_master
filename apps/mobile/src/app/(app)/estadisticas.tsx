import {
  calculatePeriodMetrics,
  calculateStreaks,
  compareHabits,
  getLocalDateKey,
  getPeriodStartDate,
} from "@habit-tracker/domain";
import { CalendarDays, Flame, Medal, Target } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/card";
import { HabitHeatmapCard } from "@/components/habit-heatmap-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHabitStore } from "@/lib/habit-store";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function formatPercentage(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export default function EstadisticasScreen() {
  const snapshot = useHabitStore();
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>(30);

  const today = getLocalDateKey(new Date(), snapshot.settings.timezone);
  const options = {
    habits: snapshot.habits,
    checkins: snapshot.checkins,
    timezone: snapshot.settings.timezone,
  };

  const summaries = [1, 7, 30, 90].map((days) => ({
    label: days === 1 ? "Hoy" : `${days} días`,
    metrics: calculatePeriodMetrics(getPeriodStartDate(today, days), today, options),
  }));
  const selected = calculatePeriodMetrics(
    getPeriodStartDate(today, period),
    today,
    options,
  );
  const streaks = calculateStreaks(today, options);
  const comparison = compareHabits(selected.startDate, today, options);
  const activeHabits = snapshot.habits.filter((habit) => !habit.archivedAt);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Estadísticas</ThemedText>
          <ThemedText themeColor="textSecondary">
            Las cifras cuentan solo los días en que cada hábito estaba activo.
          </ThemedText>

          {activeHabits.length ? (
            <View style={styles.history}>
              <ThemedText type="smallBold">Historial por hábito</ThemedText>
              {activeHabits.map((habit) => (
                <HabitHeatmapCard
                  key={habit.id}
                  habit={habit}
                  habits={snapshot.habits}
                  checkins={snapshot.checkins}
                  today={today}
                  timezone={snapshot.settings.timezone}
                />
              ))}
            </View>
          ) : null}

          <View
            accessibilityRole="tablist"
            style={[styles.periodTabs, { backgroundColor: theme.backgroundElement }]}
          >
            {PERIODS.map((option) => {
              const active = option === period;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Últimos ${option} días`}
                  onPress={() => setPeriod(option)}
                  style={[
                    styles.periodTab,
                    active && { backgroundColor: theme.accent },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? theme.onAccent : theme.textSecondary }}
                  >
                    {option} días
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.summaryGrid}>
            {summaries.map(({ label, metrics }) => (
              <Card key={label} style={styles.summaryCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {label}
                </ThemedText>
                <ThemedText style={styles.bigValue}>
                  {formatPercentage(metrics.percentage)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {metrics.expected
                    ? `${metrics.completed} de ${metrics.expected} registros`
                    : "Sin hábitos previstos"}
                </ThemedText>
              </Card>
            ))}
          </View>

          <MetricCard
            icon={<Target size={18} color={theme.tint} />}
            label="Cumplimiento del periodo"
            value={formatPercentage(selected.percentage)}
            hint={`${selected.completed} de ${selected.expected} check-ins esperados`}
          />
          <MetricCard
            icon={<Flame size={18} color={theme.tint} />}
            label="Racha actual"
            value={`${streaks.current} días`}
            hint="Puede continuar desde ayer si hoy aún está incompleto"
          />
          <MetricCard
            icon={<Medal size={18} color={theme.tint} />}
            label="Mejor racha"
            value={`${streaks.best} días`}
            hint="Días completos consecutivos"
          />

          {selected.expected ? (
            <Card>
              <ThemedText type="smallBold">Comparación por hábito</ThemedText>
              {comparison.length ? (
                comparison.map((habit) => (
                  <View
                    key={habit.habitId}
                    style={styles.comparisonRow}
                    accessibilityRole="text"
                    accessibilityLabel={`${habit.name}: ${habit.completed} de ${habit.expected} completados, ${habit.percentage ?? 0} por ciento`}
                  >
                    <View style={styles.comparisonHeader}>
                      <ThemedText type="small">{habit.name}</ThemedText>
                      <ThemedText type="smallBold">
                        {formatPercentage(habit.percentage)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.track,
                        { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <View
                        style={[
                          styles.trackFill,
                          {
                            width: `${habit.percentage ?? 0}%`,
                            backgroundColor: habit.color,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {habit.completed} de {habit.expected} registros
                    </ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  No hay hábitos que comparar en estas fechas.
                </ThemedText>
              )}
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <CalendarDays size={24} color={theme.textSecondary} />
              <ThemedText type="smallBold">Sin datos en este periodo</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ textAlign: "center" }}
              >
                Crea o marca hábitos para ver la comparación.
              </ThemedText>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: theme.accentSoft }]}>
          {icon}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText style={styles.bigValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
    </Card>
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
  history: { gap: Spacing.two, marginTop: Spacing.two },
  periodTabs: {
    flexDirection: "row",
    borderRadius: Radius.pill,
    padding: Spacing.one,
    gap: Spacing.one,
    marginVertical: Spacing.two,
  },
  periodTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  summaryCard: { flexGrow: 1, flexBasis: "45%", gap: Spacing.one },
  bigValue: { fontSize: 28, lineHeight: 34, fontWeight: 800, letterSpacing: -0.5 },
  metricHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonRow: { gap: Spacing.one, marginTop: Spacing.two },
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  trackFill: { height: 10, borderRadius: 5 },
  emptyCard: { alignItems: "center", paddingVertical: Spacing.five },
});
