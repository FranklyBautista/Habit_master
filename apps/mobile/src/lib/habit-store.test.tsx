import type { Habit, HabitTrackerState } from "@habit-tracker/domain";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getTodaySnapshot,
  type HabitSnapshot,
  HabitStoreProvider,
  useHabitActions,
  useHabitStore,
} from "./habit-store";

// habit-store.tsx pulls in `react-native` (AppState), NetInfo and the Supabase
// browser client — none of which run under jsdom. Replace them, and inject a
// fake repository so the tests drive `mutate()` / `refresh()` directly.
type NetInfoState = { isConnected: boolean | null };

const { repository, netInfo } = vi.hoisted(() => ({
  repository: {
    getState: vi.fn(),
    setCheckin: vi.fn(),
  },
  netInfo: {
    listener: null as ((state: { isConnected: boolean | null }) => void) | null,
  },
}));

vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));
vi.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: (cb: (state: { isConnected: boolean | null }) => void) => {
      netInfo.listener = cb;
      return () => {
        netInfo.listener = null;
      };
    },
  },
}));

function emitNetInfo(state: NetInfoState) {
  if (!netInfo.listener) throw new Error("NetInfo listener not registered.");
  netInfo.listener(state);
}
vi.mock("./supabase-habit-repository", () => ({
  SupabaseHabitRepository: class {
    getState = repository.getState;
    setCheckin = repository.setCheckin;
  },
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TIMEZONE = "America/Santo_Domingo"; // UTC-4, no DST

const settings: HabitTrackerState["settings"] = {
  displayName: "Frankly",
  timezone: TIMEZONE,
  locale: "es",
  weekStartsOn: 1,
};

function makeHabit(overrides: Partial<Habit> & Pick<Habit, "id">): Habit {
  return {
    name: "Hábito",
    description: null,
    color: "#0F766E",
    icon: "sparkles",
    frequency: "daily",
    startDate: "2026-01-01",
    position: 0,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getTodaySnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T15:00:00.000Z")); // 11:00 in TIMEZONE
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const HABIT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const HABIT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const HABIT_ARCHIVED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const HABIT_FUTURE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  function snapshotWith(
    parts: Pick<HabitSnapshot, "habits" | "checkins">,
  ): HabitSnapshot {
    return {
      version: 1,
      settings,
      hydrated: true,
      syncing: false,
      error: null,
      online: true,
      ...parts,
    };
  }

  it("keeps only active habits for today, ordered by position", () => {
    const { today, activeHabits } = getTodaySnapshot(
      snapshotWith({
        habits: [
          makeHabit({ id: HABIT_A, position: 1 }),
          makeHabit({ id: HABIT_B, position: 0 }),
          makeHabit({
            id: HABIT_ARCHIVED,
            position: 2,
            archivedAt: "2026-05-01T00:00:00.000Z",
          }),
          makeHabit({ id: HABIT_FUTURE, position: 3, startDate: "2026-12-01" }),
        ],
        checkins: [],
      }),
    );

    expect(today).toBe("2026-09-09");
    expect(activeHabits.map((habit) => habit.id)).toEqual([HABIT_B, HABIT_A]);
  });

  it("marks a habit complete only from a check-in dated today", () => {
    const { completedIds } = getTodaySnapshot(
      snapshotWith({
        habits: [
          makeHabit({ id: HABIT_A, position: 0 }),
          makeHabit({ id: HABIT_B, position: 1 }),
        ],
        checkins: [
          {
            id: "e1111111-1111-4111-8111-111111111111",
            habitId: HABIT_A,
            checkinDate: "2026-09-09",
            completedAt: "2026-09-09T12:00:00.000Z",
          },
          {
            id: "e2222222-2222-4222-8222-222222222222",
            habitId: HABIT_B,
            checkinDate: "2026-09-08",
            completedAt: "2026-09-08T12:00:00.000Z",
          },
        ],
      }),
    );

    expect([...completedIds]).toEqual([HABIT_A]);
  });
});

describe("HabitStoreProvider actions", () => {
  const HABIT_ID = "22222222-2222-4222-8222-222222222222";

  const initialState: HabitTrackerState = {
    version: 1,
    settings,
    habits: [makeHabit({ id: HABIT_ID, position: 0 })],
    checkins: [],
  };

  function markedCheckin() {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
    }).format(new Date());
    return {
      id: "f1111111-1111-4111-8111-111111111111",
      habitId: HABIT_ID,
      checkinDate: date,
      completedAt: new Date().toISOString(),
    };
  }

  function wrapper({ children }: PropsWithChildren) {
    return (
      <HabitStoreProvider initialState={initialState} userId={USER_ID}>
        {children}
      </HabitStoreProvider>
    );
  }

  function renderStore() {
    return renderHook(
      () => ({ snapshot: useHabitStore(), actions: useHabitActions() }),
      { wrapper },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not reveal a check-in until the server write and re-fetch resolve", async () => {
    repository.setCheckin.mockResolvedValue(undefined);
    let resolveGetState: (state: HabitTrackerState) => void = () => {};
    repository.getState.mockImplementation(
      () =>
        new Promise<HabitTrackerState>((resolve) => {
          resolveGetState = resolve;
        }),
    );

    const { result } = renderStore();

    let togglePromise: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      togglePromise = result.current.actions.toggleToday(HABIT_ID);
      await waitFor(() => expect(repository.getState).toHaveBeenCalledTimes(1));
    });

    // Write dispatched, re-fetch in flight — but nothing is shown as done yet.
    expect(result.current.snapshot.syncing).toBe(true);
    expect(result.current.snapshot.checkins).toEqual([]);

    await act(async () => {
      resolveGetState({ ...initialState, checkins: [markedCheckin()] });
      await togglePromise;
    });

    expect(result.current.snapshot.checkins).toHaveLength(1);
    expect(result.current.snapshot.syncing).toBe(false);
    expect(result.current.snapshot.error).toBeNull();
  });

  it("dedupes concurrent toggles for the same habit and date", async () => {
    repository.setCheckin.mockResolvedValue(undefined);
    repository.getState.mockResolvedValue({
      ...initialState,
      checkins: [markedCheckin()],
    });

    const { result } = renderStore();

    await act(async () => {
      await Promise.all([
        result.current.actions.toggleToday(HABIT_ID),
        result.current.actions.toggleToday(HABIT_ID),
      ]);
    });

    expect(repository.setCheckin).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed write as a recoverable error without changing data", async () => {
    repository.setCheckin.mockRejectedValue(new Error("La red no responde."));
    repository.getState.mockResolvedValue(initialState);

    const { result } = renderStore();

    await act(async () => {
      await result.current.actions.toggleToday(HABIT_ID);
    });

    expect(result.current.snapshot.error).toBe("La red no responde.");
    expect(result.current.snapshot.syncing).toBe(false);
    expect(result.current.snapshot.checkins).toEqual([]);
  });

  it("re-fetches the whole state after a successful mutation", async () => {
    repository.setCheckin.mockResolvedValue(undefined);
    const serverState: HabitTrackerState = {
      ...initialState,
      checkins: [markedCheckin()],
    };
    repository.getState.mockResolvedValue(serverState);

    const { result } = renderStore();

    let ok = false;
    await act(async () => {
      ok = await result.current.actions.toggleToday(HABIT_ID);
    });

    expect(ok).toBe(true);
    expect(repository.getState).toHaveBeenCalledTimes(1);
    expect(result.current.snapshot.checkins).toEqual(serverState.checkins);
  });
});

describe("HabitStoreProvider connectivity", () => {
  const HABIT_ID = "22222222-2222-4222-8222-222222222222";
  const initialState: HabitTrackerState = {
    version: 1,
    settings,
    habits: [makeHabit({ id: HABIT_ID, position: 0 })],
    checkins: [],
  };

  function renderStore() {
    return renderHook(() => useHabitStore(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <HabitStoreProvider initialState={initialState} userId={USER_ID}>
          {children}
        </HabitStoreProvider>
      ),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    repository.getState.mockResolvedValue(initialState);
  });

  it("starts online and flips to offline when NetInfo reports no connection", async () => {
    const { result } = renderStore();
    expect(result.current.online).toBe(true);

    await act(async () => {
      emitNetInfo({ isConnected: false });
    });

    expect(result.current.online).toBe(false);
  });

  it("treats an unknown (null) connection state as online", async () => {
    const { result } = renderStore();

    await act(async () => {
      emitNetInfo({ isConnected: null });
    });

    expect(result.current.online).toBe(true);
  });

  it("re-fetches state when connectivity is regained, not on every event", async () => {
    const { result } = renderStore();

    await act(async () => {
      emitNetInfo({ isConnected: true });
    });
    expect(repository.getState).not.toHaveBeenCalled();

    await act(async () => {
      emitNetInfo({ isConnected: false });
    });
    await act(async () => {
      emitNetInfo({ isConnected: true });
    });

    expect(result.current.online).toBe(true);
    expect(repository.getState).toHaveBeenCalledTimes(1);
  });
});
