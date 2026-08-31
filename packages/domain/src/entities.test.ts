import { describe, expect, it } from "vitest";

import {
  createHabitInputSchema,
  getLocalDateKey,
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

describe("local dates", () => {
  it("uses the profile timezone around midnight UTC", () => {
    const instant = new Date("2026-08-30T01:30:00.000Z");
    expect(getLocalDateKey(instant, "America/Los_Angeles")).toBe("2026-08-29");
    expect(getLocalDateKey(instant, "Europe/Madrid")).toBe("2026-08-30");
  });
});
