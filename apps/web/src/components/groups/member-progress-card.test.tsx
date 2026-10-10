import type { GroupMemberProgress } from "@habit-tracker/domain";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MemberProgressCard } from "./member-progress-card";

const today = "2026-10-10";

function member(overrides: Partial<GroupMemberProgress> = {}): GroupMemberProgress {
  return {
    memberId: "11111111-1111-4111-8111-111111111111",
    displayName: "Sam",
    role: "owner",
    isMe: false,
    today,
    habits: [
      {
        habitId: null,
        name: "Caminar",
        color: "#0369A1",
        icon: "footprints",
        startDate: "2026-09-01",
        archivePeriods: [],
        // Hoy hecho y 5 de los últimos 7 días (faltan el 5 y el 7).
        checkinDates: [
          "2026-10-04",
          "2026-10-06",
          "2026-10-08",
          "2026-10-09",
          "2026-10-10",
        ],
      },
      {
        habitId: null,
        name: "Leer",
        color: "#7C3AED",
        icon: "book-open",
        startDate: "2026-10-08",
        archivePeriods: [],
        checkinDates: ["2026-10-08"],
      },
    ],
    ...overrides,
  };
}

describe("MemberProgressCard", () => {
  it("names the member, the owner role and each habit status in text", () => {
    render(<MemberProgressCard member={member()} />);
    const card = screen.getByRole("article", { name: "Sam · dueño" });

    const walk = within(card).getByText("Caminar").closest("li");
    const read = within(card).getByText("Leer").closest("li");
    if (!walk || !read) throw new Error("No se encontraron los hábitos.");
    expect(within(walk).getByText("✓ hecho hoy")).toBeInTheDocument();
    expect(within(walk).getByText("racha 3")).toBeInTheDocument();
    expect(within(read).getByText("✗ pendiente hoy")).toBeInTheDocument();
    expect(within(card).getByText("1 de 2 hoy")).toBeInTheDocument();
  });

  it("gives the last 7 days a text alternative that only counts active days", () => {
    render(<MemberProgressCard member={member()} />);

    expect(screen.getByText("5 de 7 días · últimos 7 días")).toBeInTheDocument();
    // "Leer" empezó hace 3 días: solo cuentan esos.
    expect(screen.getByText("1 de 3 días · últimos 7 días")).toBeInTheDocument();
  });

  it("says when a member shares nothing yet", () => {
    render(<MemberProgressCard member={member({ habits: [], role: "member" })} />);

    expect(screen.getByRole("article", { name: "Sam" })).toBeInTheDocument();
    expect(screen.getByText("Aún no comparte hábitos.")).toBeInTheDocument();
  });

  it("lets the caller check in their own shared habit", async () => {
    const user = userEvent.setup();
    const onToggleToday = vi.fn();
    const habitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const own = member({
      displayName: "Alex",
      role: "member",
      isMe: true,
      habits: [
        {
          habitId,
          name: "Meditar",
          color: "#047857",
          icon: "brain",
          startDate: "2026-09-01",
          archivePeriods: [],
          checkinDates: [],
        },
      ],
    });

    render(<MemberProgressCard member={own} onToggleToday={onToggleToday} />);
    const checkbox = screen.getByRole("checkbox", { name: /Meditar/ });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("article", { name: "Alex (tú)" })).toBeInTheDocument();

    await user.click(checkbox);
    expect(onToggleToday).toHaveBeenCalledWith(habitId);
  });

  it("disables the own checkbox while that check-in is in flight", () => {
    const habitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const own = member({
      isMe: true,
      habits: [
        {
          habitId,
          name: "Meditar",
          color: "#047857",
          icon: "brain",
          startDate: "2026-09-01",
          archivePeriods: [],
          checkinDates: [today],
        },
      ],
    });

    render(
      <MemberProgressCard
        member={own}
        onToggleToday={vi.fn()}
        pendingHabitId={habitId}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: /Meditar/ });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });
});
