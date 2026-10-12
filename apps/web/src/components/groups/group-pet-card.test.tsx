import type { GroupProgress } from "@habit-tracker/domain";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupPetCard } from "./group-pet-card";

function progress(checkinDates: string[]): GroupProgress {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Familia",
    myRole: "owner",
    pendingInvitations: [],
    members: [
      {
        memberId: "10000000-0000-4000-8000-000000000001",
        displayName: "Ana",
        role: "owner",
        isMe: true,
        today: "2026-10-12",
        habits: [
          {
            habitId: "30000000-0000-4000-8000-000000000001",
            name: "Caminar",
            color: "#047857",
            icon: "footprints",
            startDate: "2026-10-08",
            archivePeriods: [],
            checkinDates,
          },
        ],
      },
    ],
  };
}

describe("GroupPetCard", () => {
  it("shows a hungry octopus with its stage, streak and an accessible 7-day history", () => {
    render(
      <GroupPetCard progress={progress(["2026-10-09", "2026-10-10", "2026-10-11"])} />,
    );

    expect(
      screen.getByRole("img", { name: "Pulpito del grupo, etapa Pequeña, hambrienta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pulpito" })).toBeInTheDocument();
    expect(
      screen.getByText("Tiene hambre: falta 1 persona por ponerse al día."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Racha 3 días · Mejor 3 días/)).toBeInTheDocument();
    const days = screen.getByRole("list", { name: "Comidas de los últimos 7 días" });
    expect(days.querySelectorAll("li")).toHaveLength(7);
    expect(days).toHaveTextContent("comió");
    expect(days).toHaveTextContent("sin hábitos");
  });

  it("is happy once it ate today", () => {
    render(<GroupPetCard progress={progress(["2026-10-12"])} />);
    expect(screen.getByRole("img", { name: /contenta$/ })).toBeInTheDocument();
    expect(screen.getByText("¡Festín! Todo el grupo está al día.")).toBeInTheDocument();
  });
});
