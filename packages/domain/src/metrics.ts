import { addDaysToDateKey, getDateRange, isHabitActiveOnDate } from "./dates";
import type { Habit, HabitCheckin } from "./entities";

export type DailyCompletion = {
  date: string;
  expected: number;
  completed: number;
  percentage: number | null;
};

export type PeriodMetrics = {
  startDate: string;
  endDate: string;
  expected: number;
  completed: number;
  percentage: number | null;
  days: DailyCompletion[];
};

export type StreakMetrics = {
  current: number;
  best: number;
};

export type HabitComparison = {
  habitId: string;
  name: string;
  color: string;
  expected: number;
  completed: number;
  percentage: number | null;
};

type CompletionOptions = {
  habits: Habit[];
  checkins: HabitCheckin[];
  timezone: string;
  habitId?: string;
};

function expectedHabitsForDate(
  date: string,
  { habits, timezone, habitId }: CompletionOptions,
): Habit[] {
  return habits.filter(
    (habit) =>
      (!habitId || habit.id === habitId) && isHabitActiveOnDate(habit, date, timezone),
  );
}

function percentage(completed: number, expected: number): number | null {
  return expected ? Math.round((completed / expected) * 100) : null;
}

export function calculateDailyCompletion(
  date: string,
  options: CompletionOptions,
): DailyCompletion {
  const expectedHabits = expectedHabitsForDate(date, options);
  const expectedIds = new Set(expectedHabits.map((habit) => habit.id));
  const completedIds = new Set(
    options.checkins
      .filter(
        (checkin) => checkin.checkinDate === date && expectedIds.has(checkin.habitId),
      )
      .map((checkin) => checkin.habitId),
  );
  return {
    date,
    expected: expectedHabits.length,
    completed: completedIds.size,
    percentage: percentage(completedIds.size, expectedHabits.length),
  };
}

export function calculatePeriodMetrics(
  startDate: string,
  endDate: string,
  options: CompletionOptions,
): PeriodMetrics {
  const days = getDateRange(startDate, endDate).map((date) =>
    calculateDailyCompletion(date, options),
  );
  const expected = days.reduce((total, day) => total + day.expected, 0);
  const completed = days.reduce((total, day) => total + day.completed, 0);
  return {
    startDate,
    endDate,
    expected,
    completed,
    percentage: percentage(completed, expected),
    days,
  };
}

export function calculateStreaks(
  today: string,
  options: CompletionOptions,
): StreakMetrics {
  const relevantHabits = options.habitId
    ? options.habits.filter((habit) => habit.id === options.habitId)
    : options.habits;
  if (!relevantHabits.length) return { current: 0, best: 0 };

  const firstDate = relevantHabits.reduce(
    (earliest, habit) => (habit.startDate < earliest ? habit.startDate : earliest),
    relevantHabits[0].startDate,
  );
  const days = calculatePeriodMetrics(firstDate, today, options).days;
  let best = 0;
  let running = 0;
  for (const day of days) {
    if (!day.expected) continue;
    if (day.completed === day.expected) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  const comparableDays = days.filter((day) => day.expected > 0);
  let current = 0;
  let index = comparableDays.length - 1;
  if (
    index >= 0 &&
    comparableDays[index].date === today &&
    comparableDays[index].completed !== comparableDays[index].expected
  ) {
    index -= 1;
  }
  for (; index >= 0; index -= 1) {
    const day = comparableDays[index];
    if (day.completed !== day.expected) break;
    current += 1;
  }
  return { current, best };
}

export function compareHabits(
  startDate: string,
  endDate: string,
  options: CompletionOptions,
): HabitComparison[] {
  return options.habits
    .map((habit) => {
      const metrics = calculatePeriodMetrics(startDate, endDate, {
        ...options,
        habitId: habit.id,
      });
      return {
        habitId: habit.id,
        name: habit.name,
        color: habit.color,
        expected: metrics.expected,
        completed: metrics.completed,
        percentage: metrics.percentage,
      };
    })
    .filter((habit) => habit.expected > 0)
    .sort((a, b) =>
      (b.percentage ?? 0) !== (a.percentage ?? 0)
        ? (b.percentage ?? 0) - (a.percentage ?? 0)
        : a.name.localeCompare(b.name, "es"),
    );
}

export function getPeriodStartDate(endDate: string, days: number): string {
  return addDaysToDateKey(endDate, -(days - 1));
}
