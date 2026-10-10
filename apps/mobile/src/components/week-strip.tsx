import {
  addDaysToDateKey,
  calculateDailyCompletion,
  formatLocalDate,
  getMondayFirstWeekday,
} from "@habit-tracker/domain";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type CompletionOptions = Parameters<typeof calculateDailyCompletion>[1];

type WeekStripProps = {
  today: string;
  options: CompletionOptions;
};

function weekdayLabel(date: string) {
  const label = formatLocalDate(date, { weekday: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Semana actual (lunes a domingo) con un punto por día: lleno de acento si se
// completó todo, del color del texto si fue parcial y apagado si fue 0 %. Los
// días sin hábitos previstos y los futuros no llevan punto — nunca se pinta un
// día incompleto como error.
export function WeekStrip({ today, options }: WeekStripProps) {
  const theme = useTheme();
  const monday = addDaysToDateKey(today, -getMondayFirstWeekday(today));
  const days = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(monday, index));

  return (
    <View style={styles.row} accessibilityLabel="Esta semana">
      {days.map((date) => {
        const isToday = date === today;
        const isFuture = date > today;
        const metrics = isFuture ? null : calculateDailyCompletion(date, options);
        const percentage = metrics?.percentage ?? null;
        const dotColor =
          percentage === null
            ? "transparent"
            : percentage >= 100
              ? theme.accent
              : percentage > 0
                ? theme.text
                : theme.textSecondary;
        const status = percentage === null ? "sin datos" : `${percentage}% completado`;

        return (
          <View
            key={date}
            accessible
            accessibilityLabel={`${formatLocalDate(date, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}, ${isToday ? "hoy, " : ""}${status}`}
            style={[
              styles.day,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: isToday ? theme.tint : theme.backgroundElement,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <ThemedText
              type="small"
              themeColor={isToday ? "text" : "textSecondary"}
              style={styles.weekday}
            >
              {weekdayLabel(date)}
            </ThemedText>
            <ThemedText
              type="smallBold"
              themeColor={isFuture ? "textSecondary" : "text"}
              style={styles.dayNumber}
            >
              {Number(date.slice(-2))}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.one + 2 },
  day: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  weekday: { fontSize: 12, lineHeight: 16 },
  dayNumber: { fontSize: 16, lineHeight: 20 },
});
