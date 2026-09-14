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
  // Device connectivity as last reported by NetInfo. Starts optimistic (`true`)
  // and is corrected by the listener, which fires with the current state right
  // after it subscribes. The server stays the source of truth (ADR 0001) — this
  // only drives the "sin conexión" banner and re-fetch-on-reconnect.
  online: boolean;
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
    online: true,
  });
  const snapshotRef = useRef(snapshot);
  const wasOnlineRef = useRef(true);
  const pendingCheckins = useRef(new Set<string>());
  // refresh() (triggered independently by AppState/NetInfo) and mutate()
  // both call repository.getState() and commit whatever comes back. Without
  // this, two overlapping calls can resolve out of order — a refresh
  // started before a mutation's own post-write getState() can resolve
  // after it and silently overwrite the fresher, post-mutation snapshot.
  // Guarding each commit against the latest issued request id makes only
  // the most recently *started* call allowed to write the snapshot (and
  // its syncing/error state); anything superseded is discarded quietly.
  const requestIdRef = useRef(0);
  const repository = useMemo(
    () => new SupabaseHabitRepository(supabase, userId),
    [userId],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setSnapshot((current) => ({ ...current, syncing: true, error: null }));
    try {
      const state = await repository.getState();
      if (requestIdRef.current !== requestId) return true;
      setSnapshot((current) => ({
        ...state,
        hydrated: true,
        syncing: false,
        error: null,
        online: current.online,
      }));
      return true;
    } catch (reason) {
      if (requestIdRef.current !== requestId) return false;
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
      const requestId = ++requestIdRef.current;
      setSnapshot((current) => ({ ...current, syncing: true, error: null }));
      try {
        await operation();
        const state = await repository.getState();
        // A newer request already committed a fresher snapshot (which, since
        // the server is the source of truth, already reflects this write) —
        // the mutation itself still succeeded, just don't clobber it.
        if (requestIdRef.current !== requestId) return true;
        setSnapshot((current) => ({
          ...state,
          hydrated: true,
          syncing: false,
          error: null,
          online: current.online,
        }));
        return true;
      } catch (reason) {
        if (requestIdRef.current !== requestId) return false;
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
      // `isConnected` is `boolean | null` — treat "unknown" (null) as online so
      // a slow first probe doesn't flash the offline banner.
      const online = state.isConnected !== false;
      setSnapshot((current) =>
        current.online === online ? current : { ...current, online },
      );
      // Re-fetch only when connectivity is actually regained, not on every
      // network change (e.g. wifi -> cellular) while already online.
      if (online && !wasOnlineRef.current) revalidate();
      wasOnlineRef.current = online;
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
