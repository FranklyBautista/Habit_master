import { describe, expect, it } from "vitest";

import {
  createHabitInputSchema,
  getLocalDateKey,
  habitSchema,
  habitTrackerStateSchema,
  userSettingsSchema,
} from "./index";

describe("domain schemas", () => {
  it("requires a non-empty habit name", () => {
    const result = createHabitInputSchema.safeParse({
      name: "   ",
      description: null,
      color: "#047857",
      icon: "brain",
    });
    expect(result.success).toBe(false);
  });

  it("validates IANA timezones", () => {
    expect(
      userSettingsSchema.safeParse({
        displayName: "Alex",
        timezone: "Not/A_Zone",
        locale: "es",
        weekStartsOn: 1,
      }).success,
    ).toBe(false);
  });

  const stateHabit = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Leer",
    description: null,
    color: "#047857",
    icon: "brain",
    frequency: "daily",
    startDate: "2026-08-01",
    position: 0,
    archivedAt: null,
    createdAt: "2026-08-01T16:00:00.000Z",
    updatedAt: "2026-08-01T16:00:00.000Z",
  };
  const checkin = {
    id: "20000000-0000-4000-8000-000000000001",
    habitId: stateHabit.id,
    checkinDate: "2026-08-30",
    completedAt: "2026-08-30T16:00:00.000Z",
  };
  const settings = {
    displayName: "Alex",
    timezone: "America/Los_Angeles",
    locale: "es",
    weekStartsOn: 1,
  };

  it("accepts check-ins of existing habits, including archived ones", () => {
    const result = habitTrackerStateSchema.safeParse({
      version: 1,
      habits: [{ ...stateHabit, archivedAt: "2026-09-01T16:00:00.000Z" }],
      checkins: [checkin],
      settings,
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicated check-ins for the same habit and date", () => {
    const result = habitTrackerStateSchema.safeParse({
      version: 1,
      habits: [stateHabit],
      checkins: [checkin, { ...checkin, id: "20000000-0000-4000-8000-000000000002" }],
      settings,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Un hábito solo puede tener un check-in por fecha.",
    ]);
  });

  it("rejects a check-in whose habit does not exist instead of dropping it", () => {
    const orphan = {
      ...checkin,
      id: "20000000-0000-4000-8000-000000000003",
      habitId: "10000000-0000-4000-8000-000000000099",
    };
    const result = habitTrackerStateSchema.safeParse({
      version: 1,
      habits: [stateHabit],
      checkins: [checkin, orphan],
      settings,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([
      {
        message: "Hay check-ins de un hábito que no existe.",
        path: ["checkins", 1, "habitId"],
      },
    ]);
  });
});

describe("habit archive history", () => {
  const habit = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Leer",
    description: null,
    color: "#047857",
    icon: "brain",
    frequency: "daily",
    startDate: "2026-04-01",
    position: 0,
    archivedAt: null,
    createdAt: "2026-04-01T16:00:00.000Z",
    updatedAt: "2026-04-01T16:00:00.000Z",
  };

  it("defaults to no archive periods for habits saved before the history existed", () => {
    expect(habitSchema.parse(habit).archivePeriods).toEqual([]);
  });

  it("rejects a period that ends before it starts", () => {
    const result = habitSchema.safeParse({
      ...habit,
      archivePeriods: [
        {
          archivedAt: "2026-04-07T17:00:00.000Z",
          restoredAt: "2026-04-04T17:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("local dates", () => {
  it("uses the profile timezone around midnight UTC", () => {
    const instant = new Date("2026-08-30T01:30:00.000Z");
    expect(getLocalDateKey(instant, "America/Los_Angeles")).toBe("2026-08-29");
    expect(getLocalDateKey(instant, "Europe/Madrid")).toBe("2026-08-30");
  });
});
