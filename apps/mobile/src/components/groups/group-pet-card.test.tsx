import type { GroupProgress } from "@habit-tracker/domain";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { GroupPetCard } from "./group-pet-card";

type Props = { children?: ReactNode; accessibilityRole?: string };

vi.mock(
  "react-native",
  async () => (await import("./rn-host-mock")).reactNativeHostMock,
);
// El dibujo (react-native-svg + Animated) no se puede pintar en jsdom: basta
// con comprobar la etiqueta accesible que recibe.
vi.mock("./group-pet-art", () => ({
  PetArt: ({ label }: { label: string }) =>
    createElement("span", { role: "img", "aria-label": label }),
}));
vi.mock("@/components/card", () => ({
  Card: ({ children }: Props) => createElement("section", null, children),
}));
vi.mock("@/components/themed-text", () => ({
  ThemedText: ({ children, accessibilityRole }: Props) =>
    createElement("span", { role: accessibilityRole }, children),
}));
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ border: "#ccc", accent: "#C6F432" }),
}));
vi.mock("@/constants/theme", () => ({
  Spacing: { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 },
}));

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
  it("describes the octopus, its streak and the last 7 days in text", () => {
    render(
      <GroupPetCard progress={progress(["2026-10-09", "2026-10-10", "2026-10-11"])} />,
    );

    expect(
      screen.getByRole("img", { name: "Pulpito del grupo, etapa Pequeña, hambrienta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("header")).toHaveTextContent(
      "Pulpito · Pequeña · Hambrienta",
    );
    expect(
      screen.getByText("Tiene hambre: falta 1 persona por ponerse al día."),
    ).toBeInTheDocument();
    expect(screen.getByText("Racha 3 días · Mejor 3 días")).toBeInTheDocument();
    expect(
      screen.getByText("Crece a Joven con 4 días más de racha"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Últimos 7 días: comió 3 de 5")).toBeInTheDocument();
  });

  it("is happy after eating today", () => {
    render(<GroupPetCard progress={progress(["2026-10-12"])} />);
    expect(screen.getByRole("img", { name: /contenta$/ })).toBeInTheDocument();
    expect(screen.getByText("¡Festín! Todo el grupo está al día.")).toBeInTheDocument();
  });
});
