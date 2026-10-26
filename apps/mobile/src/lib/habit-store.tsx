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

import { getDeviceTimeZone } from "@/lib/device-timezone";
import { supabase } from "@/lib/supabase/client";

import {
  applyQueue,
  type CheckinOp,
  enqueueCheckin,
  isCheckinCompleted,
  loadQueue,
  removeSent,
  saveQueue,
} from "./offline/checkin-queue";
import { isNetworkError } from "./offline/network-error";
import { saveCachedState } from "./offline/state-cache";
import { SupabaseHabitRepository } from "./supabase-habit-repository";

// Mirrors apps/web/src/lib/habit-store.tsx. Differences from the web version:
// no `importLocalData`/`discardLocalData` (mobile never had a local-only
// prototype to migrate from), revalidation triggers off `AppState`/`NetInfo`
// instead of `window` "focus"/"online" events, and check-ins work offline
// (ADR 0003): they go to a persisted queue shown on top of the last server
// state and are sent in one batch when the connection comes back. Every other
// mutation stays server-first (ADR 0001) and is refused while offline.
export type HabitSnapshot = HabitTrackerState & {
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  // Device connectivity as last reported by NetInfo. Starts optimistic (`true`)
  // and is corrected by the listener, which fires with the current state right
  // after it subscribes. Drives the banner, the offline queue and
  // sync-on-reconnect.
  online: boolean;
  // Check-ins waiting in the offline queue (already reflected in `checkins`).
  pendingCount: number;
  // The data comes from the on-device cache, not from a fresh server read.
  stale: boolean;
  // One-off message after a sync, e.g. queued check-ins the server rejected.
  notice: string | null;
};

type HabitActions = {
  refresh(): Promise<boolean>;
  createHabit(input: CreateHabitInput): Promise<boolean>;
  updateHabit(id: string, input: UpdateHabitInput): Promise<boolean>;
  // Lleva un hábito activo a `toIndex` (orden de `position`), como al soltarlo
  // tras arrastrarlo; los demás se desplazan.
  moveHabit(id: string, toIndex: number): Promise<boolean>;
  archiveHabit(id: string): Promise<boolean>;
  restoreHabit(id: string): Promise<boolean>;
  toggleToday(habitId: string): Promise<boolean>;
  updateSettings(settings: UserSettings): Promise<boolean>;
  dismissNotice(): void;
};

type HabitStoreValue = {
  snapshot: HabitSnapshot;
  actions: HabitActions;
};

const HabitStoreContext = createContext<HabitStoreValue | null>(null);

export const OFFLINE_MUTATION_ERROR =
  "Necesitas conexión para hacer este cambio. Sin conexión solo puedes marcar tus hábitos.";

function errorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  return "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.";
}

function rejectedNotice(count: number) {
  return count === 1
    ? "1 marca hecha sin conexión no se pudo guardar (más de 7 días o el hábito ya no existe)."
    : `${count} marcas hechas sin conexión no se pudieron guardar (más de 7 días o el hábito ya no existe).`;
}

export function HabitStoreProvider({
  children,
  initialState,
  userId,
  stale = false,
}: PropsWithChildren<{
  initialState: HabitTrackerState;
  userId: string;
  // `initialState` came from the on-device cache because the server could
  // not be reached (see app/(app)/_layout.tsx).
  stale?: boolean;
}>) {
  const [snapshot, setSnapshot] = useState<HabitSnapshot>({
    ...initialState,
    hydrated: true,
    syncing: false,
    error: null,
    online: true,
    pendingCount: 0,
    stale,
    notice: null,
  });
  const snapshotRef = useRef(snapshot);
  const wasOnlineRef = useRef(true);
  const pendingCheckins = useRef(new Set<string>());
  // Last state confirmed by the server (or the cache it came from). What is
  // shown is this plus the offline queue on top.
  const serverStateRef = useRef<HabitTrackerState>(initialState);
  const queueRef = useRef<CheckinOp[]>([]);
  const flushRef = useRef<Promise<void> | null>(null);
  // fetchState() (triggered independently by AppState/NetInfo) and mutate()
  // both call repository.getState() and commit whatever comes back. Without
  // this, two overlapping calls can resolve out of order — a refresh
  // started before a mutation's own post-write getState() can resolve
  // after it and silently overwrite the fresher, post-mutation snapshot.
  // Guarding each commit against the latest issued request id makes only
  // the most recently *started* call allowed to write the snapshot (and
  // its syncing/error state); anything superseded is discarded quietly.
  const requestIdRef = useRef(0);
  // Zona del teléfono que ya se intentó guardar desde la última vez que la app
  // pasó a primer plano: evita reintentar en bucle si la escritura falla.
  const attemptedTimeZoneRef = useRef<string | null>(null);
  const repository = useMemo(
    () => new SupabaseHabitRepository(supabase, userId),
    [userId],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const commitServerState = useCallback(
    (state: HabitTrackerState) => {
      serverStateRef.current = state;
      void saveCachedState(userId, state);
      setSnapshot((current) => ({
        ...applyQueue(state, queueRef.current),
        hydrated: true,
        syncing: false,
        error: null,
        online: current.online,
        pendingCount: queueRef.current.length,
        stale: false,
        notice: current.notice,
      }));
    },
    [userId],
  );

  const setQueue = useCallback(
    (queue: CheckinOp[]) => {
      queueRef.current = queue;
      saveQueue(userId, queue).catch((reason: unknown) => {
        console.warn("Could not persist the offline check-in queue", reason);
      });
      setSnapshot((current) => ({
        ...current,
        ...applyQueue(serverStateRef.current, queue),
        pendingCount: queue.length,
      }));
    },
    [userId],
  );

  const fetchState = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setSnapshot((current) => ({ ...current, syncing: true, error: null }));
    try {
      const state = await repository.getState();
      if (requestIdRef.current !== requestId) return true;
      commitServerState(state);
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
  }, [commitServerState, repository]);

  // Sends the queue in one batch. Ops queued while the batch is in flight
  // stay in the queue (removeSent compares by reference) for the next one.
  const flushQueue = useCallback((): Promise<void> => {
    if (flushRef.current) return flushRef.current;
    const sent = queueRef.current;
    if (sent.length === 0) return Promise.resolve();
    const run = (async () => {
      setSnapshot((current) => ({ ...current, syncing: true, error: null }));
      try {
        const { rejected } = await repository.syncCheckins(sent);
        setQueue(removeSent(queueRef.current, sent));
        if (rejected > 0) {
          setSnapshot((current) => ({ ...current, notice: rejectedNotice(rejected) }));
        }
      } catch (reason) {
        // The queue is kept either way; a network error just waits for the
        // next reconnect, anything else is worth showing.
        setSnapshot((current) => ({
          ...current,
          syncing: false,
          error: isNetworkError(reason) ? null : errorMessage(reason),
        }));
        throw reason;
      }
    })().finally(() => {
      flushRef.current = null;
    });
    flushRef.current = run;
    return run;
  }, [repository, setQueue]);

  // Queue first, then re-read: a re-read that doesn't include the queued
  // check-ins yet would only be overlaid again, but sending first means the
  // snapshot ends up confirmed by the server.
  const synchronize = useCallback(async () => {
    try {
      while (queueRef.current.length > 0) await flushQueue();
    } catch {
      return false;
    }
    return fetchState();
  }, [fetchState, flushQueue]);

  const mutate = useCallback(
    async (
      operation: () => Promise<void>,
      { onNetworkError }: { onNetworkError?: () => void } = {},
    ) => {
      if (!snapshotRef.current.online) {
        setSnapshot((current) => ({ ...current, error: OFFLINE_MUTATION_ERROR }));
        return false;
      }
      const requestId = ++requestIdRef.current;
      setSnapshot((current) => ({ ...current, syncing: true, error: null }));
      try {
        await operation();
        const state = await repository.getState();
        // A newer request already committed a fresher snapshot (which, since
        // the server is the source of truth, already reflects this write) —
        // the mutation itself still succeeded, just don't clobber it.
        if (requestIdRef.current !== requestId) return true;
        commitServerState(state);
        return true;
      } catch (reason) {
        // NetInfo said online but the request never arrived (weak signal,
        // captive portal): a check-in goes to the queue instead of failing.
        if (onNetworkError && isNetworkError(reason)) {
          onNetworkError();
          if (requestIdRef.current === requestId) {
            setSnapshot((current) => ({ ...current, syncing: false }));
          }
          return true;
        }
        if (requestIdRef.current !== requestId) return false;
        setSnapshot((current) => ({
          ...current,
          syncing: false,
          error: errorMessage(reason),
        }));
        return false;
      }
    },
    [commitServerState, repository],
  );

  const actions = useMemo<HabitActions>(
    () => ({
      refresh: synchronize,
      createHabit(input) {
        const current = snapshotRef.current;
        const startDate = getLocalDateKey(new Date(), current.settings.timezone);
        return mutate(() => repository.createHabit(input, startDate));
      },
      updateHabit(id, input) {
        return mutate(() => repository.updateHabit(id, input));
      },
      moveHabit(id, toIndex) {
        const active = snapshotRef.current.habits
          .filter((habit) => !habit.archivedAt)
          .sort((a, b) => a.position - b.position);
        const currentIndex = active.findIndex((habit) => habit.id === id);
        if (
          currentIndex < 0 ||
          toIndex < 0 ||
          toIndex >= active.length ||
          toIndex === currentIndex
        ) {
          return Promise.resolve(false);
        }
        const reordered = [...active];
        const [moved] = reordered.splice(currentIndex, 1);
        reordered.splice(toIndex, 0, moved);
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
        // From the refs, not the rendered snapshot: two quick offline taps
        // must see each other before React re-renders.
        const completed = isCheckinCompleted(
          serverStateRef.current,
          queueRef.current,
          habitId,
          date,
        );
        const queueToggle = () => {
          setQueue(
            enqueueCheckin(
              queueRef.current,
              { habitId, checkinDate: date, completed: !completed },
              serverStateRef.current,
            ),
          );
        };
        try {
          // With something already queued, this toggle joins the queue so
          // the server receives the changes in the order they were made.
          if (!current.online || queueRef.current.length > 0) {
            queueToggle();
            if (current.online) void synchronize();
            return true;
          }
          return await mutate(() => repository.setCheckin(habitId, date, !completed), {
            onNetworkError: queueToggle,
          });
        } finally {
          pendingCheckins.current.delete(key);
        }
      },
      updateSettings(settings) {
        return mutate(() => repository.updateSettings(settings));
      },
      dismissNotice() {
        setSnapshot((current) => ({ ...current, notice: null }));
      },
    }),
    [mutate, repository, setQueue, synchronize],
  );

  // Queue left over from a previous session (the app was closed offline).
  // Anything queued since mount is newer and wins over the stored copy.
  useEffect(() => {
    let cancelled = false;
    void loadQueue(userId).then((stored) => {
      if (cancelled) return;
      const queued = queueRef.current;
      const merged = [
        ...stored.filter(
          (op) =>
            !queued.some(
              (newer) =>
                newer.habitId === op.habitId && newer.checkinDate === op.checkinDate,
            ),
        ),
        ...queued,
      ];
      if (merged.length !== queued.length) setQueue(merged);
      if (snapshotRef.current.online && (merged.length > 0 || stale)) {
        void synchronize();
      }
    });
    return () => {
      cancelled = true;
    };
    // Only on mount: `stale` describes the initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const revalidate = () => void synchronize();
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      // Al volver a la app (p. ej. tras un viaje) se vuelve a comparar la zona.
      attemptedTimeZoneRef.current = null;
      revalidate();
    });
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      // `isConnected` is `boolean | null` — treat "unknown" (null) as online so
      // a slow first probe doesn't flash the offline banner.
      const online = state.isConnected !== false;
      setSnapshot((current) =>
        current.online === online ? current : { ...current, online },
      );
      // Ref too: mutate() and toggleToday() read it before the next render.
      snapshotRef.current = { ...snapshotRef.current, online };
      // Re-fetch only when connectivity is actually regained, not on every
      // network change (e.g. wifi -> cellular) while already online.
      if (online && !wasOnlineRef.current) revalidate();
      wasOnlineRef.current = online;
    });
    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, [synchronize]);

  // El perfil sigue la zona horaria del teléfono; no hay selector. Se guarda
  // como cualquier otra escritura (servidor primero y re-consulta, ADR 0001).
  const { settings, online } = snapshot;
  useEffect(() => {
    const deviceTimeZone = getDeviceTimeZone();
    if (!deviceTimeZone || !online || settings.timezone === deviceTimeZone) return;
    if (attemptedTimeZoneRef.current === deviceTimeZone) return;
    attemptedTimeZoneRef.current = deviceTimeZone;
    void mutate(() => repository.updateTimezone(deviceTimeZone));
  }, [mutate, online, repository, settings]);

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
