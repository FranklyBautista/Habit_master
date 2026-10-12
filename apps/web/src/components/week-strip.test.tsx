import type { Habit, HabitCheckin } from "@habit-tracker/domain";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressRing } from "./ui/progress-ring";
import { WeekStrip } from "./week-strip";

const habit: Habit = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Meditar",
  description: null,
  color: "#047857",
  icon: "brain",
  frequency: "daily",
  startDate: "2026-10-12",
  position: 0,
  archivedAt: null,
  archivePeriods: [],
  createdAt: "2026-10-12T08:00:00.000Z",
  updatedAt: "2026-10-12T08:00:00.000Z",
};

const checkin: HabitCheckin = {
  id: "20000000-0000-4000-8000-000000000001",
  habitId: habit.id,
  checkinDate: "2026-10-12",
  completedAt: "2026-10-12T15:00:00.000Z",
};

describe("WeekStrip", () => {
  it("lists Monday to Sunday and describes each day without blaming", () => {
    render(
      <WeekStrip
        today="2026-10-14"
        options={{
          habits: [habit],
          checkins: [checkin],
          timezone: "America/Los_Angeles",
        }}
      />,
    );

    const week = screen.getByRole("list", { name: "Esta semana" });
    const days = within(week).getAllByRole("listitem");
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent("lunes, 12 de octubre, 100% completado");
    expect(days[1]).toHaveTextContent("martes, 13 de octubre, 0% completado");
    expect(days[2]).toHaveTextContent("miércoles, 14 de octubre, hoy, 0% completado");
    expect(days[2]).toHaveAttribute("aria-current", "date");
    // Antes del inicio del hábito y en el futuro no hay nada que medir.
    expect(days[6]).toHaveTextContent("domingo, 18 de octubre, sin datos");
  });
});

describe("ProgressRing", () => {
  it("exposes the value when it has a name", () => {
    render(
      <ProgressRing percentage={50} label="Progreso de hoy" valueText="2 de 4">
        2/4
      </ProgressRing>,
    );

    const ring = screen.getByRole("progressbar", { name: "Progreso de hoy" });
    expect(ring).toHaveAttribute("aria-valuenow", "50");
    expect(ring).toHaveAttribute("aria-valuetext", "2 de 4");
  });

  it("stays decorative without a percentage", () => {
    render(<ProgressRing percentage={null} label="Progreso de hoy" />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
