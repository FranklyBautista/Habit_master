import type { HabitTrackerState } from "@habit-tracker/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

// LargeSecureStore has its own tests; here it is an in-memory map.
const { stored } = vi.hoisted(() => ({ stored: new Map<string, string>() }));

vi.mock("@/lib/supabase/large-secure-store", () => ({
  LargeSecureStore: class {
    getItem = async (key: string) => stored.get(key) ?? null;
    setItem = async (key: string, value: string) => {
      stored.set(key, value);
    };
    removeItem = async (key: string) => {
      stored.delete(key);
    };
  },
}));

const { clearCachedState, loadCachedState, saveCachedState } =
  await import("./state-cache");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY = `habit-tracker:state-cache:v1:${USER_ID}`;

const state: HabitTrackerState = {
  version: 1,
  settings: {
    displayName: "Frankly",
    timezone: "America/Santo_Domingo",
    locale: "es",
    weekStartsOn: 1,
  },
  habits: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Leer",
      description: null,
      color: "#0F766E",
      icon: "book-open",
      frequency: "daily",
      startDate: "2026-01-01",
      position: 0,
      archivedAt: null,
      archivePeriods: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  checkins: [],
};

describe("state cache", () => {
  beforeEach(() => {
    stored.clear();
  });

  it("round-trips the last server state per user", async () => {
    await saveCachedState(USER_ID, state);
    expect(await loadCachedState(USER_ID)).toEqual(state);
    expect(await loadCachedState("22222222-2222-4222-8222-222222222222")).toBeNull();
  });

  it("discards corrupt JSON", async () => {
    stored.set(KEY, "{not json");
    expect(await loadCachedState(USER_ID)).toBeNull();
  });

  it("discards a cache that no longer matches the schema", async () => {
    stored.set(KEY, JSON.stringify({ ...state, version: 2 }));
    expect(await loadCachedState(USER_ID)).toBeNull();
  });

  it("is removed on sign-out", async () => {
    await saveCachedState(USER_ID, state);
    await clearCachedState(USER_ID);
    expect(await loadCachedState(USER_ID)).toBeNull();
  });
});
