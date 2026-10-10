import { addDaysToDateKey, getDateRange } from "./dates";
import type { Habit, HabitCheckin } from "./entities";
import type { GroupMemberProgress, GroupProgress, SharedHabit } from "./groups";
import { calculateStreaks, type StreakMetrics } from "./metrics";

// Métricas de la vista de grupo. Cada miembro se evalúa con su propio
// `today` (calculado en el servidor en su zona horaria) y los periodos de
// archivado llegan ya como fechas locales, así que aquí no hay zona horaria.

export type SharedHabitDay = {
  date: string;
  active: boolean;
  completed: boolean;
};

export type SharedHabitStatus = {
  activeToday: boolean;
  completedToday: boolean;
  streak: StreakMetrics;
  last7Days: SharedHabitDay[];
  completedInLast7: number;
  activeInLast7: number;
};

export type MemberTodayStatus = {
  sharesHabits: boolean;
  activeToday: number;
  completedToday: number;
  upToDate: boolean;
};

export type GroupTodaySummary = {
  upToDate: number;
  participating: number;
};

const sharedHabitId = "00000000-0000-4000-8000-000000000000";
const placeholderInstant = "1970-01-01T00:00:00.000Z";

/** Mismo criterio que `isHabitActiveOnDate`, con los periodos `[from, to)` ya en fechas locales. */
export function isSharedHabitActiveOnDate(
  habit: SharedHabit,
  dateKey: string,
): boolean {
  if (habit.startDate > dateKey) return false;
  return !habit.archivePeriods.some(
    (period) => period.from <= dateKey && dateKey < period.to,
  );
}

// Convierte el hábito compartido en un `Habit` en UTC: a medianoche UTC, la
// fecha local de cada instante es exactamente `from`/`to`. Así la racha se
// calcula con `calculateStreaks`, la misma función que ve el dueño.
function toUtcHabit(habit: SharedHabit): { habit: Habit; checkins: HabitCheckin[] } {
  return {
    habit: {
      id: sharedHabitId,
      name: habit.name,
      description: null,
      color: habit.color,
      icon: habit.icon,
      frequency: "daily",
      startDate: habit.startDate,
      position: 0,
      archivedAt: null,
      archivePeriods: habit.archivePeriods.map((period) => ({
        archivedAt: `${period.from}T00:00:00.000Z`,
        restoredAt: `${period.to}T00:00:00.000Z`,
      })),
      createdAt: placeholderInstant,
      updatedAt: placeholderInstant,
    },
    checkins: habit.checkinDates.map((checkinDate, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      habitId: sharedHabitId,
      checkinDate,
      completedAt: placeholderInstant,
    })),
  };
}

export function getSharedHabitStatus(
  habit: SharedHabit,
  today: string,
): SharedHabitStatus {
  const completedDates = new Set(habit.checkinDates);
  const last7Days = getDateRange(addDaysToDateKey(today, -6), today).map((date) => {
    const active = isSharedHabitActiveOnDate(habit, date);
    return { date, active, completed: active && completedDates.has(date) };
  });
  const todayStatus = last7Days[last7Days.length - 1];
  const { habit: utcHabit, checkins } = toUtcHabit(habit);

  return {
    activeToday: todayStatus.active,
    completedToday: todayStatus.completed,
    streak: calculateStreaks(today, {
      habits: [utcHabit],
      checkins,
      timezone: "UTC",
    }),
    last7Days,
    completedInLast7: last7Days.filter((day) => day.completed).length,
    activeInLast7: last7Days.filter((day) => day.active).length,
  };
}

export function getMemberTodayStatus(member: GroupMemberProgress): MemberTodayStatus {
  const activeHabits = member.habits.filter((habit) =>
    isSharedHabitActiveOnDate(habit, member.today),
  );
  const completedToday = activeHabits.filter((habit) =>
    habit.checkinDates.includes(member.today),
  ).length;
  return {
    sharesHabits: member.habits.length > 0,
    activeToday: activeHabits.length,
    completedToday,
    upToDate: activeHabits.length > 0 && completedToday === activeHabits.length,
  };
}

/** "Hoy: X de Y al día". Quien no tiene hábitos compartidos activos hoy no cuenta. */
export function getGroupTodaySummary(progress: GroupProgress): GroupTodaySummary {
  const statuses = progress.members.map(getMemberTodayStatus);
  return {
    upToDate: statuses.filter((status) => status.upToDate).length,
    participating: statuses.filter((status) => status.activeToday > 0).length,
  };
}
