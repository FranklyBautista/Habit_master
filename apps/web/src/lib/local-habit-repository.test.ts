import { describe, expect, it } from "vitest";

import { initialState } from "./initial-state";
import {
  habitStorageKey,
  LocalHabitRepository,
  type StorageDriver,
} from "./local-habit-repository";

class MemoryStorage implements StorageDriver {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createRepository() {
  let nextId = 10;
  const storage = new MemoryStorage();
  const repository = new LocalHabitRepository(storage, {
    initialState,
    now: () => new Date("2026-08-30T20:00:00.000Z"),
    createId: () => `30000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
  });
  return { repository, storage };
}

describe("LocalHabitRepository", () => {
  it("creates and edits a habit with a required name", () => {
    const { repository } = createRepository();
    expect(() =>
      repository.createHabit({
        name: "  ",
        description: null,
        color: "#047857",
        icon: "sparkles",
      }),
    ).toThrow();
    const habit = repository.createHabit({
      name: "Beber agua",
      description: null,
      color: "#0F766E",
      icon: "sparkles",
    });
    const updated = repository.updateHabit(habit.id, {
      name: "Tomar agua",
      description: "Después de despertar",
    });
    expect(updated).toMatchObject({
      name: "Tomar agua",
      description: "Después de despertar",
      startDate: "2026-08-30",
    });
  });

  it("reorders all active habits", () => {
    const { repository } = createRepository();
    const active = repository
      .getState()
      .habits.filter((habit) => !habit.archivedAt)
      .sort((a, b) => a.position - b.position);
    const reordered = repository.reorderHabits(
      active.map((habit) => habit.id).reverse(),
    );
    expect(reordered.map((habit) => habit.id)).toEqual(
      active.map((habit) => habit.id).reverse(),
    );
  });

  it("archives and restores without losing check-ins", () => {
    const { repository } = createRepository();
    const habitId = initialState.habits[0].id;
    repository.archiveHabit(habitId);
    expect(
      repository.getState().habits.find((habit) => habit.id === habitId)?.archivedAt,
    ).not.toBeNull();
    expect(
      repository.getState().checkins.some((checkin) => checkin.habitId === habitId),
    ).toBe(true);
    repository.restoreHabit(habitId);
    expect(
      repository.getState().habits.find((habit) => habit.id === habitId)?.archivedAt,
    ).toBeNull();
    expect(
      repository.getState().checkins.some((checkin) => checkin.habitId === habitId),
    ).toBe(true);
  });

  it("toggles a single idempotent check-in per habit and date", () => {
    const { repository } = createRepository();
    const habitId = initialState.habits[2].id;
    repository.toggleCheckin(habitId, "2026-08-30");
    let matching = repository
      .getState()
      .checkins.filter(
        (checkin) =>
          checkin.habitId === habitId && checkin.checkinDate === "2026-08-30",
      );
    expect(matching).toHaveLength(1);
    repository.toggleCheckin(habitId, "2026-08-30");
    matching = repository
      .getState()
      .checkins.filter(
        (checkin) =>
          checkin.habitId === habitId && checkin.checkinDate === "2026-08-30",
      );
    expect(matching).toHaveLength(0);
  });

  it("persists state so another repository instance can reload it", () => {
    const { repository, storage } = createRepository();
    repository.createHabit({
      name: "Estirar",
      description: null,
      color: "#7C3AED",
      icon: "footprints",
    });
    expect(storage.getItem(habitStorageKey)).not.toBeNull();
    const reloaded = new LocalHabitRepository(storage, { initialState });
    expect(reloaded.getState().habits.some((habit) => habit.name === "Estirar")).toBe(
      true,
    );
  });
});
