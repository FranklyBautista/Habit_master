import type { Habit, HabitCheckin } from "@habit-tracker/domain";
import { describe, expect, it } from "vitest";

import { buildHabitHeatmap } from "./habit-heatmap";

const HABIT_ID = "00000000-0000-4000-8000-000000000001";
const TZ = "Europe/Madrid";

const habit: Habit = {
  id: HABIT_ID,
  name: "Leer",
  description: null,
  color: "#047857",
  icon: "book-open",
  frequency: "daily",
  startDate: "2026-10-07",
  position: 0,
  archivedAt: null,
  archivePeriods: [],
  createdAt: "2026-10-07T08:00:00.000Z",
  updatedAt: "2026-10-07T08:00:00.000Z",
};

function checkin(date: string, habitId = HABIT_ID): HabitCheckin {
  return {
    id: `00000000-0000-4000-8000-${date.replaceAll("-", "").padStart(12, "0")}`,
    habitId,
    checkinDate: date,
    completedAt: `${date}T10:00:00.000Z`,
  };
}

describe("buildHabitHeatmap", () => {
  // 2026-10-21 es miércoles.
  const today = "2026-10-21";

  it("builds Monday-first week columns ending with the current week", () => {
    const { weeks } = buildHabitHeatmap(habit, [], today, TZ, 3);
    expect(weeks).toHaveLength(3);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-10-05");
    expect(weeks[2][0].date).toBe("2026-10-19");
    expect(weeks[2][6].date).toBe("2026-10-25");
  });

  it("classifies each day", () => {
    const { weeks, completed } = buildHabitHeatmap(
      habit,
      [checkin("2026-10-20"), checkin("2026-10-08"), checkin("2026-10-20", "other")],
      today,
      TZ,
      3,
    );
    const byDate = Object.fromEntries(
      weeks.flat().map((cell) => [cell.date, cell.state]),
    );
    expect(byDate["2026-10-06"]).toBe("inactive"); // antes de startDate
    expect(byDate["2026-10-08"]).toBe("done");
    expect(byDate["2026-10-09"]).toBe("missed");
    expect(byDate["2026-10-20"]).toBe("done");
    expect(byDate["2026-10-21"]).toBe("missed"); // hoy, aún sin marcar
    expect(byDate["2026-10-22"]).toBe("future");
    expect(completed).toBe(2);
  });

  it("labels the column where each month starts", () => {
    const { months } = buildHabitHeatmap(habit, [], today, TZ, 12);
    // Primera columna: 2026-08-03. Septiembre empieza en la semana del 31-ago,
    // así que la primera columna de septiembre es la del 7-sep (columna 5).
    expect(months.map((month) => month.column)).toEqual([0, 5, 9]);
    expect(months[0].label.toLowerCase()).toMatch(/^ago/);
  });

  it("drops the first month label when the next one would overlap it", () => {
    // Primera columna: 2026-09-21; octubre empieza en la columna 2.
    const { months } = buildHabitHeatmap(habit, [], today, TZ, 5);
    expect(months).toHaveLength(1);
    expect(months[0].label.toLowerCase()).toMatch(/^oct/);
  });
});
