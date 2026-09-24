import { describe, expect, it } from "vitest";

import {
  compareTimes,
  formatReminderTime,
  from12Hour,
  isSameTime,
  parseManualTime,
  stepHour,
  stepMinute,
  to12Hour,
} from "./reminder-time";

describe("stepHour", () => {
  it("moves one hour and wraps around midnight", () => {
    expect(stepHour({ hour: 20, minute: 15 }, 1)).toEqual({ hour: 21, minute: 15 });
    expect(stepHour({ hour: 23, minute: 0 }, 1)).toEqual({ hour: 0, minute: 0 });
    expect(stepHour({ hour: 0, minute: 0 }, -1)).toEqual({ hour: 23, minute: 0 });
  });
});

describe("stepMinute", () => {
  it("moves five minutes and wraps within the hour", () => {
    expect(stepMinute({ hour: 8, minute: 0 }, 1)).toEqual({ hour: 8, minute: 5 });
    expect(stepMinute({ hour: 8, minute: 55 }, 1)).toEqual({ hour: 8, minute: 0 });
    expect(stepMinute({ hour: 8, minute: 0 }, -1)).toEqual({ hour: 8, minute: 55 });
  });

  it("snaps an off-grid minute to the next step in the chosen direction", () => {
    expect(stepMinute({ hour: 8, minute: 7 }, 1)).toEqual({ hour: 8, minute: 10 });
    expect(stepMinute({ hour: 8, minute: 7 }, -1)).toEqual({ hour: 8, minute: 5 });
  });
});

describe("formatReminderTime", () => {
  it("uses the 12-hour Spanish format of the presets", () => {
    expect(formatReminderTime({ hour: 8, minute: 0 })).toBe("8:00 a. m.");
    expect(formatReminderTime({ hour: 21, minute: 30 })).toBe("9:30 p. m.");
    expect(formatReminderTime({ hour: 0, minute: 5 })).toBe("12:05 a. m.");
    expect(formatReminderTime({ hour: 12, minute: 45 })).toBe("12:45 p. m.");
  });
});

describe("isSameTime", () => {
  it("compares hour and minute", () => {
    expect(isSameTime({ hour: 8, minute: 0 }, { hour: 8, minute: 0 })).toBe(true);
    expect(isSameTime({ hour: 8, minute: 0 }, { hour: 8, minute: 5 })).toBe(false);
  });
});

describe("12-hour conversion", () => {
  it("round-trips every hour of the day", () => {
    for (let hour = 0; hour < 24; hour++) {
      const { hour12, period } = to12Hour(hour);
      expect(hour12).toBeGreaterThanOrEqual(1);
      expect(hour12).toBeLessThanOrEqual(12);
      expect(from12Hour(hour12, period)).toBe(hour);
    }
  });

  it("maps midnight and noon to 12", () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, period: "am" });
    expect(to12Hour(12)).toEqual({ hour12: 12, period: "pm" });
  });
});

describe("parseManualTime", () => {
  it("accepts valid 12-hour input", () => {
    expect(parseManualTime("7", "45", "pm")).toEqual({
      ok: true,
      time: { hour: 19, minute: 45 },
    });
    expect(parseManualTime("12", "05", "am")).toEqual({
      ok: true,
      time: { hour: 0, minute: 5 },
    });
    expect(parseManualTime(" 08 ", "0", "am")).toEqual({
      ok: true,
      time: { hour: 8, minute: 0 },
    });
  });

  it("rejects out-of-range or non-numeric input", () => {
    for (const hour of ["0", "13", "", "8a", "1.5", "-1"]) {
      expect(parseManualTime(hour, "00", "am").ok).toBe(false);
    }
    for (const minute of ["60", "", "5m", "123"]) {
      expect(parseManualTime("8", minute, "am").ok).toBe(false);
    }
  });
});

describe("compareTimes", () => {
  it("orders by time of day", () => {
    const times = [
      { hour: 20, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 8, minute: 5 },
    ];
    expect([...times].sort(compareTimes)).toEqual([
      { hour: 8, minute: 5 },
      { hour: 8, minute: 30 },
      { hour: 20, minute: 0 },
    ]);
  });
});
