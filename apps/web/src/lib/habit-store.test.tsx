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
  useLocalDataMigration,
} from "./habit-store";
import { habitStorageKey } from "./local-habit-repository";

// El store crea un cliente de Supabase del navegador y un
// SupabaseHabitRepository; se sustituyen por un repositorio falso para probar
// `mutate()` / `refresh()` sin red (ADR 0001: sin UI optimista, el servidor es
// la fuente de verdad y cada escritura va seguida de un getState completo).
const { repository } = vi.hoisted(() => ({
  repository: {
    getState: vi.fn(),
    setCheckin: vi.fn(),
    reorderHabits: vi.fn(),
    setArchived: vi.fn(),
    importState: vi.fn(),
  },
}));

vi.mock("./supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("./supabase-habit-repository", () => ({
  SupabaseHabitRepository: class {
    getState = repository.getState;
    setCheckin = repository.setCheckin;
    reorderHabits = repository.reorderHabits;
    setArchived = repository.setArchived;
    importState = repository.importState;
  },
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TIMEZONE = "America/Santo_Domingo"; // UTC-4, sin horario de verano
const HABIT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HABIT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HABIT_ARCHIVED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const HABIT_FUTURE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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
    archivePeriods: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeState(parts: Partial<HabitTrackerState> = {}): HabitTrackerState {
  return {
    version: 1,
    habits: [
      makeHabit({ id: HABIT_A, position: 0 }),
      makeHabit({ id: HABIT_B, position: 1 }),
    ],
    checkins: [],
    settings,
    ...parts,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderStore(initialState = makeState()) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <HabitStoreProvider initialState={initialState} userId={USER_ID}>
      {children}
    </HabitStoreProvider>
  );
  return renderHook(
    () => ({
      snapshot: useHabitStore(),
      actions: useHabitActions(),
      migration: useLocalDataMigration(),
    }),
    { wrapper },
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-09T15:00:00.000Z")); // 11:00 en TIMEZONE
  for (const mock of Object.values(repository)) mock.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getTodaySnapshot", () => {
  function snapshotWith(
    parts: Pick<HabitSnapshot, "habits" | "checkins">,
  ): HabitSnapshot {
    return {
      version: 1,
      settings,
      hydrated: true,
      syncing: false,
      error: null,
      ...parts,
    };
  }

  it("keeps only habits active today, ordered by position", () => {
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
        habits: [makeHabit({ id: HABIT_A }), makeHabit({ id: HABIT_B, position: 1 })],
        checkins: [
          {
            id: "e1111111-1111-4111-8111-111111111111",
            habitId: HABIT_A,
            checkinDate: "2026-09-09",
            completedAt: "2026-09-09T14:00:00.000Z",
          },
          {
            id: "e2222222-2222-4222-8222-222222222222",
            habitId: HABIT_B,
            checkinDate: "2026-09-08",
            completedAt: "2026-09-08T14:00:00.000Z",
          },
        ],
      }),
    );

    expect([...completedIds]).toEqual([HABIT_A]);
  });
});

describe("HabitStoreProvider mutations", () => {
  it("does not show a check-in until the server confirms it and the state is re-fetched", async () => {
    const write = deferred<void>();
    repository.setCheckin.mockReturnValue(write.promise);
    const confirmed = makeState({
      checkins: [
        {
          id: "e1111111-1111-4111-8111-111111111111",
          habitId: HABIT_A,
          checkinDate: "2026-09-09",
          completedAt: "2026-09-09T15:00:00.000Z",
        },
      ],
    });
    repository.getState.mockResolvedValue(confirmed);
    const { result } = renderStore();

    let toggle!: Promise<boolean>;
    act(() => {
      toggle = result.current.actions.toggleToday(HABIT_A);
    });
    expect(repository.setCheckin).toHaveBeenCalledWith(HABIT_A, "2026-09-09", true);
    expect(result.current.snapshot.syncing).toBe(true);
    expect(result.current.snapshot.checkins).toEqual([]);

    await act(async () => {
      write.resolve();
      await expect(toggle).resolves.toBe(true);
    });
    expect(repository.getState).toHaveBeenCalledTimes(1);
    expect(result.current.snapshot.checkins).toEqual(confirmed.checkins);
    expect(result.current.snapshot.syncing).toBe(false);
  });

  it("ignores a second toggle of the same habit while the first is in flight", async () => {
    const write = deferred<void>();
    repository.setCheckin.mockReturnValue(write.promise);
    repository.getState.mockResolvedValue(makeState());
    const { result } = renderStore();

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.actions.toggleToday(HABIT_A);
      second = result.current.actions.toggleToday(HABIT_A);
    });
    await expect(second).resolves.toBe(false);

    await act(async () => {
      write.resolve();
      await first;
    });
    expect(repository.setCheckin).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmed data and shows a recoverable error when a write fails", async () => {
    repository.setCheckin.mockRejectedValue(new Error("Failed to fetch"));
    const initial = makeState();
    const { result } = renderStore(initial);

    await act(async () => {
      await expect(result.current.actions.toggleToday(HABIT_A)).resolves.toBe(false);
    });

    expect(result.current.snapshot.error).toBe("Failed to fetch");
    expect(result.current.snapshot.syncing).toBe(false);
    expect(result.current.snapshot.checkins).toEqual(initial.checkins);
    expect(repository.getState).not.toHaveBeenCalled();
  });

  it("uses a generic Spanish message for non-Error failures", async () => {
    repository.setCheckin.mockRejectedValue({ code: "unknown" });
    const { result } = renderStore();

    await act(async () => {
      await result.current.actions.toggleToday(HABIT_A);
    });

    expect(result.current.snapshot.error).toBe(
      "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    );
  });

  it("sends the full swapped list of active habits when moving one", async () => {
    repository.reorderHabits.mockResolvedValue(undefined);
    repository.getState.mockResolvedValue(makeState());
    const { result } = renderStore(
      makeState({
        habits: [
          makeHabit({ id: HABIT_A, position: 0 }),
          makeHabit({ id: HABIT_B, position: 1 }),
          makeHabit({
            id: HABIT_ARCHIVED,
            position: 0,
            archivedAt: "2026-05-01T00:00:00.000Z",
          }),
        ],
      }),
    );

    await act(async () => {
      await result.current.actions.moveHabit(HABIT_B, -1);
    });

    expect(repository.reorderHabits).toHaveBeenCalledWith([HABIT_B, HABIT_A]);
  });

  it("does nothing when moving past either end", async () => {
    const { result } = renderStore();

    await act(async () => {
      await expect(result.current.actions.moveHabit(HABIT_A, -1)).resolves.toBe(false);
      await expect(result.current.actions.moveHabit(HABIT_B, 1)).resolves.toBe(false);
    });

    expect(repository.reorderHabits).not.toHaveBeenCalled();
  });

  it("restores a habit after the highest active position", async () => {
    repository.setArchived.mockResolvedValue(undefined);
    repository.getState.mockResolvedValue(makeState());
    const { result } = renderStore(
      makeState({
        habits: [
          makeHabit({ id: HABIT_A, position: 0 }),
          makeHabit({ id: HABIT_B, position: 4 }),
          makeHabit({
            id: HABIT_ARCHIVED,
            position: 9,
            archivedAt: "2026-05-01T00:00:00.000Z",
          }),
        ],
      }),
    );

    await act(async () => {
      await result.current.actions.restoreHabit(HABIT_ARCHIVED);
    });

    expect(repository.setArchived).toHaveBeenCalledWith(HABIT_ARCHIVED, false, 5);
  });
});

describe("HabitStoreProvider revalidation", () => {
  it("re-fetches the state on window focus and when the connection returns", async () => {
    repository.getState.mockResolvedValue(makeState());
    renderStore();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });

    expect(repository.getState).toHaveBeenCalledTimes(2);
  });

  it("does not let an older refresh overwrite the result of a newer mutation", async () => {
    const staleRefresh = deferred<HabitTrackerState>();
    const renamed = makeState({
      habits: [makeHabit({ id: HABIT_A, name: "Después" })],
    });
    repository.getState
      .mockReturnValueOnce(staleRefresh.promise)
      .mockResolvedValueOnce(renamed);
    repository.setArchived.mockResolvedValue(undefined);
    const { result } = renderStore();

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      await result.current.actions.archiveHabit(HABIT_B);
    });
    await act(async () => {
      staleRefresh.resolve(
        makeState({ habits: [makeHabit({ id: HABIT_A, name: "Antes" })] }),
      );
    });

    expect(result.current.snapshot.habits.map((habit) => habit.name)).toEqual([
      "Después",
    ]);
  });
});

describe("HabitStoreProvider local data import", () => {
  const localState = JSON.stringify(
    makeState({
      checkins: [
        {
          id: "e1111111-1111-4111-8111-111111111111",
          habitId: HABIT_A,
          checkinDate: "2026-09-01",
          completedAt: "2026-09-01T15:00:00.000Z",
        },
      ],
    }),
  );

  it("imports valid local data and then forgets it", async () => {
    window.localStorage.setItem(habitStorageKey, localState);
    repository.importState.mockResolvedValue(undefined);
    repository.getState.mockResolvedValue(makeState());
    const { result } = renderStore();
    await waitFor(() => expect(result.current.migration.localDataAvailable).toBe(true));

    await act(async () => {
      await expect(result.current.actions.importLocalData()).resolves.toBe(true);
    });

    expect(repository.importState).toHaveBeenCalledWith(JSON.parse(localState));
    expect(window.localStorage.getItem(habitStorageKey)).toBeNull();
    expect(result.current.migration.localDataAvailable).toBe(false);
  });

  it("rejects orphan check-ins with a Spanish message and keeps the local data", async () => {
    const orphan = JSON.stringify(
      makeState({ habits: [], checkins: JSON.parse(localState).checkins }),
    );
    window.localStorage.setItem(habitStorageKey, orphan);
    const { result } = renderStore();

    await act(async () => {
      await expect(result.current.actions.importLocalData()).resolves.toBe(false);
    });

    expect(result.current.snapshot.error).toBe(
      "No se pudieron importar los datos locales. Hay check-ins de un hábito que no existe.",
    );
    expect(repository.importState).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(habitStorageKey)).toBe(orphan);
  });

  it("reports corrupt local JSON without throwing", async () => {
    window.localStorage.setItem(habitStorageKey, "{not json");
    const { result } = renderStore();

    await act(async () => {
      await expect(result.current.actions.importLocalData()).resolves.toBe(false);
    });

    expect(result.current.snapshot.error).toBe(
      "No se pudieron importar los datos locales. No tienen un formato válido.",
    );
  });

  it("keeps the local data when the server rejects the import", async () => {
    window.localStorage.setItem(habitStorageKey, localState);
    repository.importState.mockRejectedValue(
      new Error(
        "Esta cuenta ya tiene registros: el historial local solo se puede importar en una cuenta nueva.",
      ),
    );
    const { result } = renderStore();

    await act(async () => {
      await expect(result.current.actions.importLocalData()).resolves.toBe(false);
    });

    expect(result.current.snapshot.error).toBe(
      "Esta cuenta ya tiene registros: el historial local solo se puede importar en una cuenta nueva.",
    );
    expect(window.localStorage.getItem(habitStorageKey)).toBe(localState);
  });
});
