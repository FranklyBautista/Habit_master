import { describe, expect, it } from "vitest";

import { addDaysToDateKey, getLocalDateKey, isHabitActiveOnDate } from "./dates";
import type { Habit } from "./entities";

// Cambios de horario reales de 2026 (verificados con Intl):
// - America/New_York adelanta el 8 de marzo a las 02:00 EST (07:00 UTC) y
//   atrasa el 1 de noviembre a las 02:00 EDT (06:00 UTC).
// - Europe/Madrid adelanta el 29 de marzo a las 02:00 CET (01:00 UTC).
// Una implementación con desfase fijo (p. ej. "UTC-5 siempre") falla justo en
// las medianoches posteriores al cambio, que es lo que se comprueba aquí.
const NEW_YORK = "America/New_York";
const MADRID = "Europe/Madrid";

function dateKeyAt(iso: string, timezone: string) {
  return getLocalDateKey(new Date(iso), timezone);
}

describe("getLocalDateKey across daylight saving changes", () => {
  it("keeps the same local day across the spring-forward jump", () => {
    expect(dateKeyAt("2026-03-08T06:59:00.000Z", NEW_YORK)).toBe("2026-03-08"); // 01:59 EST
    expect(dateKeyAt("2026-03-08T07:00:00.000Z", NEW_YORK)).toBe("2026-03-08"); // 03:00 EDT
  });

  it("moves the next midnight one hour earlier in UTC after spring forward", () => {
    // Antes del cambio la medianoche era a las 05:00 UTC; ahora es a las 04:00.
    expect(dateKeyAt("2026-03-09T03:59:00.000Z", NEW_YORK)).toBe("2026-03-08"); // 23:59 EDT
    expect(dateKeyAt("2026-03-09T04:00:00.000Z", NEW_YORK)).toBe("2026-03-09"); // 00:00 EDT
    expect(dateKeyAt("2026-03-09T04:30:00.000Z", NEW_YORK)).toBe("2026-03-09");
  });

  it("keeps both repeated 01:30 hours of fall back on the same local day", () => {
    expect(dateKeyAt("2026-11-01T05:30:00.000Z", NEW_YORK)).toBe("2026-11-01"); // 01:30 EDT
    expect(dateKeyAt("2026-11-01T06:30:00.000Z", NEW_YORK)).toBe("2026-11-01"); // 01:30 EST
  });

  it("moves the next midnight one hour later in UTC after fall back", () => {
    // El 1 de noviembre dura 25 horas: su medianoche final cae a las 05:00 UTC.
    expect(dateKeyAt("2026-11-02T04:30:00.000Z", NEW_YORK)).toBe("2026-11-01"); // 23:30 EST
    expect(dateKeyAt("2026-11-02T04:59:00.000Z", NEW_YORK)).toBe("2026-11-01"); // 23:59 EST
    expect(dateKeyAt("2026-11-02T05:00:00.000Z", NEW_YORK)).toBe("2026-11-02"); // 00:00 EST
  });

  it("handles a timezone east of UTC changing on a different date", () => {
    expect(dateKeyAt("2026-03-28T22:30:00.000Z", MADRID)).toBe("2026-03-28"); // 23:30 CET
    expect(dateKeyAt("2026-03-29T00:59:00.000Z", MADRID)).toBe("2026-03-29"); // 01:59 CET
    expect(dateKeyAt("2026-03-29T22:30:00.000Z", MADRID)).toBe("2026-03-30"); // 00:30 CEST
  });

  it("skips a local day when adding 24 hours to an instant, but not to a date key", () => {
    // Por esto la aritmética de calendario usa claves y no instantes: a las
    // 23:30 locales, sumar 24 h naturales cruza el día de 23 horas y salta del
    // 7 al 9 de marzo, mientras que addDaysToDateKey va del 7 al 8.
    const evening = "2026-03-07T04:30:00.000Z"; // 23:30 EST del 6 de marzo
    const keys = [0, 1, 2, 3].map((day) =>
      dateKeyAt(
        new Date(new Date(evening).getTime() + day * 24 * 60 * 60 * 1000).toISOString(),
        NEW_YORK,
      ),
    );
    expect(keys).toEqual(["2026-03-06", "2026-03-07", "2026-03-09", "2026-03-10"]);
    expect(addDaysToDateKey("2026-03-07", 1)).toBe("2026-03-08");
  });
});

describe("isHabitActiveOnDate across daylight saving changes", () => {
  const habit: Habit = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Leer",
    description: null,
    color: "#047857",
    icon: "brain",
    frequency: "daily",
    startDate: "2026-03-01",
    position: 0,
    archivedAt: null,
    archivePeriods: [],
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
  };

  it("archives on the local day of the archive instant after spring forward", () => {
    // 00:30 EDT del 9 de marzo: con UTC-5 fijo parecería aún el día 8.
    const archived = { ...habit, archivedAt: "2026-03-09T04:30:00.000Z" };
    expect(isHabitActiveOnDate(archived, "2026-03-08", NEW_YORK)).toBe(true);
    expect(isHabitActiveOnDate(archived, "2026-03-09", NEW_YORK)).toBe(false);
  });

  it("excludes a restored window whose edges fall around fall back", () => {
    const restored = {
      ...habit,
      archivePeriods: [
        {
          archivedAt: "2026-11-01T06:30:00.000Z", // 01:30 EST del 1 de noviembre
          restoredAt: "2026-11-03T04:30:00.000Z", // 23:30 EST del 2 de noviembre
        },
      ],
    };
    expect(isHabitActiveOnDate(restored, "2026-10-31", NEW_YORK)).toBe(true);
    expect(isHabitActiveOnDate(restored, "2026-11-01", NEW_YORK)).toBe(false);
    expect(isHabitActiveOnDate(restored, "2026-11-02", NEW_YORK)).toBe(true);
  });
});
