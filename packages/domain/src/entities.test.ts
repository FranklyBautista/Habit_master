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

  it("rejects duplicated check-ins for the same habit and date", () => {
    const checkin = {
      id: "20000000-0000-4000-8000-000000000001",
      habitId: "10000000-0000-4000-8000-000000000001",
      checkinDate: "2026-08-30",
      completedAt: "2026-08-30T16:00:00.000Z",
    };
    const result = habitTrackerStateSchema.safeParse({
      version: 1,
      habits: [],
      checkins: [checkin, { ...checkin, id: "20000000-0000-4000-8000-000000000002" }],
      settings: {
        displayName: "Alex",
        timezone: "America/Los_Angeles",
        locale: "es",
        weekStartsOn: 1,
      },
    });
    expect(result.success).toBe(false);
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
