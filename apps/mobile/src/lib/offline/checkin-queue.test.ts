import type { Habit, HabitTrackerState } from "@habit-tracker/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

const {
  applyQueue,
  clearQueue,
  enqueueCheckin,
  isCheckinCompleted,
  loadQueue,
  removeSent,
  saveQueue,
} = await import("./checkin-queue");
const { isNetworkError } = await import("./network-error");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const HABIT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HABIT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeHabit(id: string): Habit {
  return {
    id,
    name: "Hábito",
    description: null,
    color: "#0F766E",
    icon: "sparkles",
    frequency: "daily",
    startDate: "2026-01-01",
    position: 0,
    archivedAt: null,
    archivePeriods: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const serverState: HabitTrackerState = {
  version: 1,
  settings: {
    displayName: "Frankly",
    timezone: "UTC",
    locale: "es",
    weekStartsOn: 1,
  },
  habits: [makeHabit(HABIT_A), makeHabit(HABIT_B)],
  checkins: [
    {
      id: "c1111111-1111-4111-8111-111111111111",
      habitId: HABIT_B,
      checkinDate: "2026-10-22",
      completedAt: "2026-10-22T10:00:00.000Z",
    },
  ],
};

describe("enqueueCheckin", () => {
  it("keeps one final state per habit and date", () => {
    let queue = enqueueCheckin(
      [],
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: true },
      serverState,
    );
    queue = enqueueCheckin(
      queue,
      { habitId: HABIT_A, checkinDate: "2026-10-22", completed: true },
      serverState,
    );
    expect(queue).toHaveLength(2);

    queue = enqueueCheckin(
      queue,
      { habitId: HABIT_B, checkinDate: "2026-10-22", completed: false },
      serverState,
    );
    expect(queue).toEqual([
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: true },
      { habitId: HABIT_A, checkinDate: "2026-10-22", completed: true },
      { habitId: HABIT_B, checkinDate: "2026-10-22", completed: false },
    ]);
  });

  it("drops the change when it goes back to what the server has", () => {
    const marked = enqueueCheckin(
      [],
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: true },
      serverState,
    );
    const undone = enqueueCheckin(
      marked,
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: false },
      serverState,
    );
    expect(undone).toEqual([]);
  });
});

describe("isCheckinCompleted", () => {
  it("prefers the queued state over the server one", () => {
    const queue = [{ habitId: HABIT_B, checkinDate: "2026-10-22", completed: false }];
    expect(isCheckinCompleted(serverState, [], HABIT_B, "2026-10-22")).toBe(true);
    expect(isCheckinCompleted(serverState, queue, HABIT_B, "2026-10-22")).toBe(false);
  });
});

describe("removeSent", () => {
  it("keeps changes made while the batch was in flight", () => {
    const sent = [{ habitId: HABIT_A, checkinDate: "2026-10-23", completed: true }];
    const newer = enqueueCheckin(
      sent,
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: false },
      { ...serverState, checkins: [] },
    );
    // Undone back to the server state: nothing left to send.
    expect(removeSent(newer, sent)).toEqual([]);

    const other = { habitId: HABIT_B, checkinDate: "2026-10-23", completed: true };
    expect(removeSent([...sent, other], sent)).toEqual([other]);
  });
});

describe("applyQueue", () => {
  it("shows queued marks and unmarks on top of the server state", () => {
    const shown = applyQueue(serverState, [
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: true },
      { habitId: HABIT_B, checkinDate: "2026-10-22", completed: false },
    ]);
    expect(
      shown.checkins.map((checkin) => [checkin.habitId, checkin.checkinDate]),
    ).toEqual([[HABIT_A, "2026-10-23"]]);
    expect(shown.checkins[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("ignores queued check-ins of habits that no longer exist", () => {
    const shown = applyQueue(serverState, [
      {
        habitId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        checkinDate: "2026-10-23",
        completed: true,
      },
    ]);
    expect(shown.checkins).toEqual(serverState.checkins);
  });

  it("returns the same state when nothing is queued", () => {
    expect(applyQueue(serverState, [])).toBe(serverState);
  });
});

describe("queue storage", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("round-trips the queue per user and removes it when empty", async () => {
    const queue = [{ habitId: HABIT_A, checkinDate: "2026-10-23", completed: true }];
    await saveQueue(USER_ID, queue);
    expect(await loadQueue(USER_ID)).toEqual(queue);
    expect(await loadQueue("another-user")).toEqual([]);

    await saveQueue(USER_ID, []);
    expect(storage.size).toBe(0);
  });

  it("discards a corrupt stored queue", async () => {
    storage.set(`habit-tracker:checkin-queue:v1:${USER_ID}`, "{not json");
    expect(await loadQueue(USER_ID)).toEqual([]);
    storage.set(`habit-tracker:checkin-queue:v1:${USER_ID}`, '[{"habitId":1}]');
    expect(await loadQueue(USER_ID)).toEqual([]);
  });

  it("clears the queue on sign-out", async () => {
    await saveQueue(USER_ID, [
      { habitId: HABIT_A, checkinDate: "2026-10-23", completed: true },
    ]);
    await clearQueue(USER_ID);
    expect(await loadQueue(USER_ID)).toEqual([]);
  });
});

describe("isNetworkError", () => {
  it("recognises requests that never reached the server", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
    expect(
      isNetworkError({ message: "TypeError: Network request failed", code: "" }),
    ).toBe(true);
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not treat server answers as network errors", () => {
    expect(
      isNetworkError({ message: "new row violates row-level security", code: "42501" }),
    ).toBe(false);
    expect(isNetworkError(new Error("La red no responde."))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
