import { describe, expect, it } from "vitest";

import type { Habit, HabitCheckin } from "./entities";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  getDateRange,
  getMondayFirstWeekday,
  getMonthDateKeys,
} from "./dates";
import {
  calculateDailyCompletion,
  calculatePeriodMetrics,
  calculateStreaks,
  compareHabits,
} from "./metrics";

const timezone = "America/Los_Angeles";

const habits: Habit[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Temprano",
    description: null,
    color: "#047857",
    icon: "brain",
    frequency: "daily",
    startDate: "2026-03-07",
    position: 0,
    archivedAt: "2026-03-10T07:00:00.000Z",
    createdAt: "2026-03-07T16:00:00.000Z",
    updatedAt: "2026-03-10T07:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Nuevo",
    description: null,
    color: "#0369A1",
    icon: "book-open",
    frequency: "daily",
    startDate: "2026-03-09",
    position: 1,
    archivedAt: null,
    createdAt: "2026-03-09T16:00:00.000Z",
    updatedAt: "2026-03-09T16:00:00.000Z",
  },
];

const checkins: HabitCheckin[] = [
  ["00000000-0000-4000-8000-000000000001", habits[0].id, "2026-03-07"],
  ["00000000-0000-4000-8000-000000000002", habits[0].id, "2026-03-08"],
  ["00000000-0000-4000-8000-000000000003", habits[0].id, "2026-03-09"],
  ["00000000-0000-4000-8000-000000000004", habits[1].id, "2026-03-09"],
].map(([id, habitId, checkinDate]) => ({
  id,
  habitId,
  checkinDate,
  completedAt: `${checkinDate}T18:00:00.000Z`,
}));

const options = { habits, checkins, timezone };

describe("completion metrics", () => {
  it("returns no percentage for days without expected habits", () => {
    expect(calculateDailyCompletion("2026-03-06", options)).toEqual({
      date: "2026-03-06",
      expected: 0,
      completed: 0,
      percentage: null,
    });
  });

  it("excludes habits before creation and from their archive date", () => {
    expect(calculateDailyCompletion("2026-03-08", options)).toMatchObject({
      expected: 1,
      completed: 1,
      percentage: 100,
    });
    expect(calculateDailyCompletion("2026-03-10", options)).toMatchObject({
      expected: 1,
      completed: 0,
      percentage: 0,
    });
  });

  it("calculates a manually verified partial period", () => {
    expect(calculatePeriodMetrics("2026-03-07", "2026-03-10", options)).toMatchObject({
      expected: 5,
      completed: 4,
      percentage: 80,
    });
  });

  it("calculates current and best streak while today is incomplete", () => {
    expect(calculateStreaks("2026-03-10", options)).toEqual({
      current: 3,
      best: 3,
    });
  });

  it("compares each habit using only the days when it was expected", () => {
    expect(compareHabits("2026-03-07", "2026-03-10", options)).toEqual([
      expect.objectContaining({ name: "Temprano", expected: 3, percentage: 100 }),
      expect.objectContaining({ name: "Nuevo", expected: 2, percentage: 50 }),
    ]);
  });
});

describe("date boundaries", () => {
  it("moves across month and year boundaries", () => {
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonthsToDateKey("2026-12-15", 1)).toBe("2027-01-01");
    expect(getDateRange("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("keeps consecutive local dates across daylight saving time", () => {
    expect(getDateRange("2026-03-07", "2026-03-10")).toEqual([
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
  });

  it("builds leap months and Monday-first offsets", () => {
    expect(getMonthDateKeys("2024-02-01")).toHaveLength(29);
    expect(getMondayFirstWeekday("2026-08-01")).toBe(5);
  });
});
