import { describe, expect, it } from "vitest";

import { createHabitInputSchema, type Habit, type HabitCheckin } from "./entities";
import { getHabitWeekSummary, habitIdeas } from "./habit-summary";

const timezone = "Europe/Madrid";
// Viernes.
const today = "2026-10-23";

const habit: Habit = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Caminar",
  description: null,
  color: "#047857",
  icon: "footprints",
  frequency: "daily",
  startDate: "2026-10-01",
  position: 0,
  archivedAt: null,
  archivePeriods: [],
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
};

function checkin(date: string, index: number): HabitCheckin {
  return {
    id: `30000000-0000-4000-8000-00000000000${index}`,
    habitId: habit.id,
    checkinDate: date,
    completedAt: `${date}T09:00:00.000Z`,
  };
}

describe("getHabitWeekSummary", () => {
  it("marks each day of the Monday-first week", () => {
    const summary = getHabitWeekSummary(habit, today, {
      timezone,
      checkins: [
        checkin("2026-10-19", 1),
        checkin("2026-10-21", 2),
        checkin("2026-10-22", 3),
      ],
    });

    expect(summary.days.map((day) => day.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(summary.days.map((day) => day.status)).toEqual([
      "done",
      "missed",
      "done",
      "done",
      "pending",
      "upcoming",
      "upcoming",
    ]);
    expect(summary).toMatchObject({
      expected: 5,
      completed: 3,
      completedToday: false,
      // Hoy sin marcar todavía no rompe la racha.
      currentStreak: 2,
      isNew: false,
    });
  });

  it("does not count days before the habit started", () => {
    const summary = getHabitWeekSummary({ ...habit, startDate: today }, today, {
      timezone,
      checkins: [checkin(today, 1)],
    });

    expect(summary.days.slice(0, 5).map((day) => day.status)).toEqual([
      "inactive",
      "inactive",
      "inactive",
      "inactive",
      "done",
    ]);
    expect(summary).toMatchObject({
      expected: 1,
      completed: 1,
      completedToday: true,
      currentStreak: 1,
      isNew: true,
    });
  });
});

describe("habitIdeas", () => {
  it("prefill valid habits, except the one whose name the user picks", () => {
    for (const idea of habitIdeas) {
      const parsed = createHabitInputSchema.safeParse(idea.defaults);
      expect(parsed.success).toBe(idea.defaults.name !== "");
    }
  });
});
