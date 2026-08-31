import {
  type CreateHabitInput,
  createHabitInputSchema,
  getLocalDateKey,
  type Habit,
  type HabitRepository,
  type HabitTrackerState,
  habitTrackerStateSchema,
  type ToggleCheckinResult,
  type UpdateHabitInput,
  updateHabitInputSchema,
  type UserSettings,
  userSettingsSchema,
} from "@habit-tracker/domain";

export const habitStorageKey = "habit-tracker:v1";

export interface StorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type RepositoryOptions = {
  initialState: HabitTrackerState;
  now?: () => Date;
  createId?: () => string;
};

function cloneState(state: HabitTrackerState): HabitTrackerState {
  return JSON.parse(JSON.stringify(state)) as HabitTrackerState;
}

export class LocalHabitRepository implements HabitRepository {
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(
    private readonly storage: StorageDriver,
    private readonly options: RepositoryOptions,
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  getState(): HabitTrackerState {
    const stored = this.storage.getItem(habitStorageKey);
    if (!stored) return cloneState(this.options.initialState);
    try {
      return habitTrackerStateSchema.parse(JSON.parse(stored));
    } catch {
      return cloneState(this.options.initialState);
    }
  }

  createHabit(input: CreateHabitInput): Habit {
    const validInput = createHabitInputSchema.parse(input);
    const state = this.getState();
    const timestamp = this.now().toISOString();
    const habit: Habit = {
      ...validInput,
      id: this.createId(),
      frequency: "daily",
      startDate: getLocalDateKey(this.now(), state.settings.timezone),
      position: state.habits.filter((item) => !item.archivedAt).length,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.habits.push(habit);
    this.save(state);
    return habit;
  }

  updateHabit(id: string, input: UpdateHabitInput): Habit {
    const validInput = updateHabitInputSchema.parse(input);
    const state = this.getState();
    const index = this.findHabitIndex(state, id);
    const habit = {
      ...state.habits[index],
      ...validInput,
      updatedAt: this.now().toISOString(),
    };
    state.habits[index] = habit;
    this.save(state);
    return habit;
  }

  reorderHabits(orderedIds: string[]): Habit[] {
    const state = this.getState();
    const active = state.habits.filter((habit) => !habit.archivedAt);
    if (
      new Set(orderedIds).size !== active.length ||
      active.some((habit) => !orderedIds.includes(habit.id))
    ) {
      throw new Error("El orden debe incluir todos los hábitos activos una sola vez.");
    }
    const positions = new Map(orderedIds.map((id, position) => [id, position]));
    state.habits = state.habits.map((habit) =>
      positions.has(habit.id)
        ? {
            ...habit,
            position: positions.get(habit.id)!,
            updatedAt: this.now().toISOString(),
          }
        : habit,
    );
    this.save(state);
    return state.habits
      .filter((habit) => !habit.archivedAt)
      .sort((a, b) => a.position - b.position);
  }

  archiveHabit(id: string): Habit {
    return this.setArchivedAt(id, this.now().toISOString());
  }

  restoreHabit(id: string): Habit {
    const state = this.getState();
    const maxPosition = Math.max(
      -1,
      ...state.habits
        .filter((habit) => !habit.archivedAt)
        .map((habit) => habit.position),
    );
    const index = this.findHabitIndex(state, id);
    const habit = {
      ...state.habits[index],
      archivedAt: null,
      position: maxPosition + 1,
      updatedAt: this.now().toISOString(),
    };
    state.habits[index] = habit;
    this.save(state);
    return habit;
  }

  toggleCheckin(habitId: string, checkinDate: string): ToggleCheckinResult {
    const state = this.getState();
    this.findHabitIndex(state, habitId);
    const existingIndex = state.checkins.findIndex(
      (checkin) => checkin.habitId === habitId && checkin.checkinDate === checkinDate,
    );
    if (existingIndex >= 0) {
      state.checkins.splice(existingIndex, 1);
      this.save(state);
      return { completed: false, checkin: null };
    }
    const checkin = {
      id: this.createId(),
      habitId,
      checkinDate,
      completedAt: this.now().toISOString(),
    };
    state.checkins.push(checkin);
    this.save(state);
    return { completed: true, checkin };
  }

  updateSettings(settings: UserSettings): UserSettings {
    const validSettings = userSettingsSchema.parse(settings);
    const state = this.getState();
    state.settings = validSettings;
    this.save(state);
    return validSettings;
  }

  private setArchivedAt(id: string, archivedAt: string): Habit {
    const state = this.getState();
    const index = this.findHabitIndex(state, id);
    const habit = { ...state.habits[index], archivedAt, updatedAt: archivedAt };
    state.habits[index] = habit;
    this.save(state);
    return habit;
  }

  private findHabitIndex(state: HabitTrackerState, id: string): number {
    const index = state.habits.findIndex((habit) => habit.id === id);
    if (index < 0) throw new Error("No se encontró el hábito.");
    return index;
  }

  private save(state: HabitTrackerState): void {
    const validState = habitTrackerStateSchema.parse(state);
    this.storage.setItem(habitStorageKey, JSON.stringify(validState));
  }
}
