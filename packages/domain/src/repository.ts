import type {
  CreateHabitInput,
  Habit,
  HabitCheckin,
  HabitTrackerState,
  UpdateHabitInput,
  UserSettings,
} from "./entities";

export type ToggleCheckinResult = { completed: boolean; checkin: HabitCheckin | null };

export interface HabitRepository {
  getState(): HabitTrackerState;
  createHabit(input: CreateHabitInput): Habit;
  updateHabit(id: string, input: UpdateHabitInput): Habit;
  reorderHabits(orderedIds: string[]): Habit[];
  archiveHabit(id: string): Habit;
  restoreHabit(id: string): Habit;
  toggleCheckin(habitId: string, checkinDate: string): ToggleCheckinResult;
  updateSettings(settings: UserSettings): UserSettings;
}
