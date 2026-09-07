import {
  type CreateHabitInput,
  getLocalDateKey,
  type HabitTrackerState,
  isHabitActiveOnDate,
  type UpdateHabitInput,
  type UserSettings,
} from "@habit-tracker/domain";
import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase/client";

import { SupabaseHabitRepository } from "./supabase-habit-repository";

// Mirrors apps/web/src/lib/habit-store.tsx. Two differences from the web
// version: no `importLocalData`/`discardLocalData` (mobile never had a
// local-only prototype to migrate from), and revalidation triggers off
// `AppState`/`NetInfo` instead of `window` "focus"/"online" events.
export type HabitSnapshot = HabitTrackerState & {
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
};

type HabitActions = {
  refresh(): Promise<boolean>;
  createHabit(input: CreateHabitInput): Promise<boolean>;
  updateHabit(id: string, input: UpdateHabitInput): Promise<boolean>;
  moveHabit(id: string, direction: -1 | 1): Promise<boolean>;
  archiveHabit(id: string): Promise<boolean>;
  restoreHabit(id: string): Promise<boolean>;
  toggleToday(habitId: string): Promise<boolean>;
  updateSettings(settings: UserSettings): Promise<boolean>;
};

type HabitStoreValue = {
  snapshot: HabitSnapshot;
  actions: HabitActions;
};

const HabitStoreContext = createContext<HabitStoreValue | null>(null);

function errorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  return "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.";
}

export function HabitStoreProvider({
  children,
  initialState,
  userId,
}: PropsWithChildren<{
  initialState: HabitTrackerState;
  userId: string;
}>) {
  const [snapshot, setSnapshot] = useState<HabitSnapshot>({
    ...initialState,
    hydrated: true,
    syncing: false,
    error: null,
  });
  const snapshotRef = useRef(snapshot);
  const pendingCheckins = useRef(new Set<string>());
  const repository = useMemo(
    () => new SupabaseHabitRepository(supabase, userId),
    [userId],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const refresh = useCallback(async () => {
    setSnapshot((current) => ({ ...current, syncing: true, error: null }));
    try {
      const state = await repository.getState();
      setSnapshot({ ...state, hydrated: true, syncing: false, error: null });
      return true;
    } catch (reason) {
      setSnapshot((current) => ({
        ...current,
        syncing: false,
        error: errorMessage(reason),
      }));
      return false;
    }
  }, [repository]);

  const mutate = useCallback(
    async (operation: () => Promise<void>) => {
      setSnapshot((current) => ({ ...current, syncing: true, error: null }));
      try {
        await operation();
        const state = await repository.getState();
        setSnapshot({ ...state, hydrated: true, syncing: false, error: null });
        return true;
      } catch (reason) {
        setSnapshot((current) => ({
          ...current,
          syncing: false,
          error: errorMessage(reason),
        }));
        return false;
      }
    },
    [repository],
  );

  const actions = useMemo<HabitActions>(
    () => ({
      refresh,
      createHabit(input) {
        const current = snapshotRef.current;
        const startDate = getLocalDateKey(new Date(), current.settings.timezone);
        return mutate(() => repository.createHabit(input, startDate));
      },
      updateHabit(id, input) {
        return mutate(() => repository.updateHabit(id, input));
      },
      moveHabit(id, direction) {
        const active = snapshotRef.current.habits
          .filter((habit) => !habit.archivedAt)
          .sort((a, b) => a.position - b.position);
        const currentIndex = active.findIndex((habit) => habit.id === id);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= active.length) {
          return Promise.resolve(false);
        }
        const reordered = [...active];
        [reordered[currentIndex], reordered[nextIndex]] = [
          reordered[nextIndex],
          reordered[currentIndex],
        ];
        return mutate(() =>
          repository.reorderHabits(reordered.map((habit) => habit.id)),
        );
      },
      archiveHabit(id) {
        return mutate(() => repository.setArchived(id, true));
      },
      restoreHabit(id) {
        const maxPosition = Math.max(
          -1,
          ...snapshotRef.current.habits
            .filter((habit) => !habit.archivedAt)
            .map((habit) => habit.position),
        );
        return mutate(() => repository.setArchived(id, false, maxPosition + 1));
      },
      async toggleToday(habitId) {
        const current = snapshotRef.current;
        const date = getLocalDateKey(new Date(), current.settings.timezone);
        const key = `${habitId}:${date}`;
        if (pendingCheckins.current.has(key)) return false;
        pendingCheckins.current.add(key);
        const completed = current.checkins.some(
          (checkin) => checkin.habitId === habitId && checkin.checkinDate === date,
        );
        try {
          return await mutate(() => repository.setCheckin(habitId, date, !completed));
        } finally {
          pendingCheckins.current.delete(key);
        }
      },
      updateSettings(settings) {
        return mutate(() => repository.updateSettings(settings));
      },
    }),
    [mutate, refresh, repository],
  );

  useEffect(() => {
    const revalidate = () => void refresh();
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") revalidate();
    });
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) revalidate();
    });
    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, [refresh]);

  const value = useMemo(() => ({ snapshot, actions }), [actions, snapshot]);

  return (
    <HabitStoreContext.Provider value={value}>{children}</HabitStoreContext.Provider>
  );
}

function useHabitStoreContext() {
  const context = useContext(HabitStoreContext);
  if (!context) throw new Error("HabitStoreProvider no está disponible.");
  return context;
}

export function useHabitStore() {
  return useHabitStoreContext().snapshot;
}

export function useHabitActions() {
  return useHabitStoreContext().actions;
}

export function getTodaySnapshot(currentSnapshot: HabitSnapshot) {
  const today = getLocalDateKey(new Date(), currentSnapshot.settings.timezone);
  const activeHabits = currentSnapshot.habits
    .filter(
      (habit) =>
        isHabitActiveOnDate(habit, today, currentSnapshot.settings.timezone) &&
        !habit.archivedAt,
    )
    .sort((a, b) => a.position - b.position);
  const completedIds = new Set(
    currentSnapshot.checkins
      .filter((checkin) => checkin.checkinDate === today)
      .map((checkin) => checkin.habitId),
  );
  return { today, activeHabits, completedIds };
}
