import type { GroupProgress } from "@habit-tracker/domain";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { groups, repository, sync } = vi.hoisted(() => ({
  groups: {
    hydrated: true,
    revision: 0,
    groups: [] as { id: string; name: string }[],
  },
  repository: { getProgress: vi.fn() },
  sync: vi.fn(async () => undefined),
}));

vi.mock("./group-store", () => ({
  useGroups: () => groups,
  useGroupRepository: () => repository,
}));
vi.mock("./habit-store", () => ({ useHabitStore: () => ({ checkins: [] }) }));
vi.mock("./notifications/pet-reminder", () => ({ syncPetReminder: sync }));

const { PetReminderSync } = await import("./pet-reminder-sync");

function progress(id: string, checkinDates: string[]): GroupProgress {
  return {
    id,
    name: id,
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
            startDate: "2026-10-12",
            archivePeriods: [],
            checkinDates,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PetReminderSync", () => {
  it("reminds only about hungry pets and skips groups that fail to load", async () => {
    groups.groups = [
      { id: "hungry", name: "Familia" },
      { id: "fed", name: "Amigos" },
      { id: "broken", name: "Trabajo" },
    ];
    repository.getProgress.mockImplementation(async (id: string) => {
      if (id === "broken") throw new Error("offline");
      return progress(id, id === "fed" ? ["2026-10-12"] : []);
    });

    render(<PetReminderSync />);

    await waitFor(() => expect(sync).toHaveBeenCalledWith([{ name: "Familia" }]));
  });

  it("waits until groups are loaded", () => {
    groups.hydrated = false;
    render(<PetReminderSync />);
    expect(repository.getProgress).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    groups.hydrated = true;
  });
});
