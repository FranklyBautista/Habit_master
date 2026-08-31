"use client";

import {
  type CreateHabitInput,
  getLocalDateKey,
  type HabitTrackerState,
  isHabitActiveOnDate,
  type UpdateHabitInput,
  type UserSettings,
} from "@habit-tracker/domain";
import { useEffect, useSyncExternalStore } from "react";

import { initialState } from "./initial-state";
import { LocalHabitRepository } from "./local-habit-repository";

export type HabitSnapshot = HabitTrackerState & { hydrated: boolean };

const serverSnapshot: HabitSnapshot = { ...initialState, hydrated: false };
let snapshot: HabitSnapshot = serverSnapshot;
let repository: LocalHabitRepository | null = null;
const listeners = new Set<() => void>();

function getRepository() {
  if (!repository)
    repository = new LocalHabitRepository(window.localStorage, { initialState });
  return repository;
}

function publish(state: HabitTrackerState) {
  snapshot = { ...state, hydrated: true };
  listeners.forEach((listener) => listener());
}

function mutate(operation: (currentRepository: LocalHabitRepository) => void) {
  const currentRepository = getRepository();
  operation(currentRepository);
  publish(currentRepository.getState());
}

export const habitActions = {
  hydrate() {
    if (snapshot.hydrated) return;
    publish(getRepository().getState());
  },
  createHabit(input: CreateHabitInput) {
    mutate((currentRepository) => currentRepository.createHabit(input));
  },
  updateHabit(id: string, input: UpdateHabitInput) {
    mutate((currentRepository) => currentRepository.updateHabit(id, input));
  },
  moveHabit(id: string, direction: -1 | 1) {
    const active = snapshot.habits
      .filter((habit) => !habit.archivedAt)
      .sort((a, b) => a.position - b.position);
    const currentIndex = active.findIndex((habit) => habit.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= active.length) return;
    const reordered = [...active];
    [reordered[currentIndex], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[currentIndex],
    ];
    mutate((currentRepository) =>
      currentRepository.reorderHabits(reordered.map((habit) => habit.id)),
    );
  },
  archiveHabit(id: string) {
    mutate((currentRepository) => currentRepository.archiveHabit(id));
  },
  restoreHabit(id: string) {
    mutate((currentRepository) => currentRepository.restoreHabit(id));
  },
  toggleToday(habitId: string) {
    const dateKey = getLocalDateKey(new Date(), snapshot.settings.timezone);
    mutate((currentRepository) => currentRepository.toggleCheckin(habitId, dateKey));
  },
  updateSettings(settings: UserSettings) {
    mutate((currentRepository) => currentRepository.updateSettings(settings));
  },
};

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

export function useHabitStore(): HabitSnapshot {
  const currentSnapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => serverSnapshot,
  );

  useEffect(() => {
    habitActions.hydrate();
  }, []);

  return currentSnapshot;
}
