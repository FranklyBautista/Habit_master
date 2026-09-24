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
    archivePeriods: [],
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
    archivePeriods: [],
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

describe("archive and restore", () => {
  // Hábito archivado el 4 de abril y restaurado el 7 (hora de Los Ángeles),
  // marcado todos los días en que estuvo activo.
  const restored: Habit = {
    ...habits[1],
    id: "10000000-0000-4000-8000-000000000003",
    name: "Leer",
    startDate: "2026-04-01",
    archivedAt: null,
    archivePeriods: [
      {
        archivedAt: "2026-04-04T17:00:00.000Z",
        restoredAt: "2026-04-07T17:00:00.000Z",
      },
    ],
  };
  const restoredCheckins: HabitCheckin[] = [
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
    "2026-04-07",
    "2026-04-08",
  ].map((checkinDate, index) => ({
    id: `00000000-0000-4000-8000-00000000010${index}`,
    habitId: restored.id,
    checkinDate,
    completedAt: `${checkinDate}T18:00:00.000Z`,
  }));
  const restoredOptions = { habits: [restored], checkins: restoredCheckins, timezone };

  it("does not count the archived days as missed", () => {
    for (const date of ["2026-04-04", "2026-04-05", "2026-04-06"]) {
      expect(calculateDailyCompletion(date, restoredOptions).expected).toBe(0);
    }
    expect(
      calculatePeriodMetrics("2026-04-01", "2026-04-08", restoredOptions),
    ).toMatchObject({ expected: 5, completed: 5, percentage: 100 });
  });

  it("keeps the streak across the archived window", () => {
    expect(calculateStreaks("2026-04-08", restoredOptions)).toEqual({
      current: 5,
      best: 5,
    });
  });

  it("counts the restore day and an archive-and-restore on the same day", () => {
    expect(calculateDailyCompletion("2026-04-07", restoredOptions).expected).toBe(1);
    const sameDay: Habit = {
      ...restored,
      archivePeriods: [
        {
          archivedAt: "2026-04-05T16:00:00.000Z",
          restoredAt: "2026-04-05T20:00:00.000Z",
        },
      ],
    };
    expect(
      calculateDailyCompletion("2026-04-05", { ...restoredOptions, habits: [sameDay] })
        .expected,
    ).toBe(1);
  });

  it("uses the local date of the archive instant, not the UTC one", () => {
    // 06:00 UTC del 4 de abril = 23:00 del 3 de abril en Los Ángeles.
    const lateNight: Habit = {
      ...restored,
      archivePeriods: [
        {
          archivedAt: "2026-04-04T06:00:00.000Z",
          restoredAt: "2026-04-07T17:00:00.000Z",
        },
      ],
    };
    const lateNightOptions = { ...restoredOptions, habits: [lateNight] };
    expect(calculateDailyCompletion("2026-04-03", lateNightOptions).expected).toBe(0);
    expect(calculateDailyCompletion("2026-04-02", lateNightOptions).expected).toBe(1);
  });

  it("combines past windows with a current archive", () => {
    const archivedAgain: Habit = {
      ...restored,
      archivedAt: "2026-04-08T17:00:00.000Z",
    };
    const archivedAgainOptions = { ...restoredOptions, habits: [archivedAgain] };
    expect(calculateDailyCompletion("2026-04-05", archivedAgainOptions).expected).toBe(
      0,
    );
    expect(calculateDailyCompletion("2026-04-07", archivedAgainOptions).expected).toBe(
      1,
    );
    expect(calculateDailyCompletion("2026-04-08", archivedAgainOptions).expected).toBe(
      0,
    );
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
