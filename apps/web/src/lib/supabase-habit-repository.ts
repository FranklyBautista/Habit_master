import type { Database } from "@habit-tracker/database";
import {
  type ArchivePeriod,
  type CreateHabitInput,
  type Habit,
  type HabitCheckin,
  type HabitTrackerState,
  habitTrackerStateSchema,
  type UpdateHabitInput,
  type UserSettings,
} from "@habit-tracker/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type CheckinRow = Database["public"]["Tables"]["habit_checkins"]["Row"];
type ArchivePeriodRow = Database["public"]["Tables"]["habit_archive_periods"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function mapHabit(row: HabitRow, archivePeriods: ArchivePeriod[]): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color as Habit["color"],
    icon: row.icon as Habit["icon"],
    frequency: "daily",
    startDate: row.start_date,
    position: row.position,
    archivedAt: row.archived_at,
    archivePeriods,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Agrupa el historial de archivado (lo escribe un trigger al restaurar, ver
// la migración 20260924120000) por hábito.
function groupArchivePeriods(rows: ArchivePeriodRow[]): Map<string, ArchivePeriod[]> {
  const byHabit = new Map<string, ArchivePeriod[]>();
  for (const row of rows) {
    const periods = byHabit.get(row.habit_id) ?? [];
    periods.push({ archivedAt: row.archived_at, restoredAt: row.restored_at });
    byHabit.set(row.habit_id, periods);
  }
  return byHabit;
}

function mapCheckin(row: CheckinRow): HabitCheckin {
  return {
    id: row.id,
    habitId: row.habit_id,
    checkinDate: row.checkin_date,
    completedAt: row.completed_at,
  };
}

export class SupabaseHabitRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async getState(): Promise<HabitTrackerState> {
    // `maybeSingle()`, not `single()`: a signed-in user with no `profiles`
    // row (the row-creation trigger only fires on `auth.users` insert, so
    // any account that predates the trigger — or a future edge case where
    // it fails to fire — has none) must not crash the whole dashboard.
    // `ensureProfile()` below creates the missing row on the fly instead.
    const [profileResult, habitsResult, checkinsResult, periodsResult] =
      await Promise.all([
        this.client.from("profiles").select("*").eq("id", this.userId).maybeSingle(),
        this.client.from("habits").select("*").order("position"),
        this.client.from("habit_checkins").select("*").order("checkin_date"),
        this.client.from("habit_archive_periods").select("*").order("archived_at"),
      ]);

    if (profileResult.error) throw profileResult.error;
    if (habitsResult.error) throw habitsResult.error;
    if (checkinsResult.error) throw checkinsResult.error;
    if (periodsResult.error) throw periodsResult.error;

    const profile = profileResult.data ?? (await this.ensureProfile());
    const archivePeriods = groupArchivePeriods(periodsResult.data);

    return habitTrackerStateSchema.parse({
      version: 1,
      habits: habitsResult.data.map((row) =>
        mapHabit(row, archivePeriods.get(row.id) ?? []),
      ),
      checkins: checkinsResult.data.map(mapCheckin),
      settings: {
        displayName: profile.display_name ?? "Tú",
        timezone: profile.timezone,
        locale: "es",
        weekStartsOn: 1,
      },
    });
  }

  private async ensureProfile(): Promise<ProfileRow> {
    const { data, error } = await this.client
      .from("profiles")
      .upsert({ id: this.userId }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async createHabit(input: CreateHabitInput, startDate: string): Promise<void> {
    // Derived from the highest active position, not a count: archiving a
    // middle habit shrinks the count without shifting the remaining
    // positions down, so a count-based next position collides with an
    // existing one. Same pattern setArchived's restore path already uses.
    const { data: lastActive, error: lastActiveError } = await this.client
      .from("habits")
      .select("position")
      .is("archived_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastActiveError) throw lastActiveError;
    const { error } = await this.client.from("habits").insert({
      user_id: this.userId,
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      start_date: startDate,
      position: lastActive ? lastActive.position + 1 : 0,
    });
    if (error) throw error;
  }

  async updateHabit(id: string, input: UpdateHabitInput): Promise<void> {
    const { error } = await this.client
      .from("habits")
      .update({
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
      })
      .eq("id", id);
    if (error) throw error;
  }

  async reorderHabits(orderedIds: string[]): Promise<void> {
    const results = await Promise.all(
      orderedIds.map((id, position) =>
        this.client.from("habits").update({ position }).eq("id", id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }

  async setArchived(id: string, archived: boolean, position?: number): Promise<void> {
    const { error } = await this.client
      .from("habits")
      .update({
        archived_at: archived ? new Date().toISOString() : null,
        ...(position === undefined ? {} : { position }),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async setCheckin(habitId: string, checkinDate: string, completed: boolean) {
    if (completed) {
      const { error } = await this.client.from("habit_checkins").upsert(
        {
          habit_id: habitId,
          user_id: this.userId,
          checkin_date: checkinDate,
        },
        { onConflict: "habit_id,checkin_date", ignoreDuplicates: true },
      );
      if (error) throw error;
      return;
    }

    const { error } = await this.client
      .from("habit_checkins")
      .delete()
      .eq("habit_id", habitId)
      .eq("checkin_date", checkinDate);
    if (error) throw error;
  }

  async updateSettings(settings: UserSettings): Promise<void> {
    const { error } = await this.client
      .from("profiles")
      .update({
        display_name: settings.displayName,
        timezone: settings.timezone,
        locale: settings.locale,
        week_starts_on: settings.weekStartsOn,
      })
      .eq("id", this.userId);
    if (error) throw error;
  }

  async importState(state: HabitTrackerState): Promise<void> {
    const validState = habitTrackerStateSchema.parse(state);
    const { error: profileError } = await this.client
      .from("profiles")
      .update({
        display_name: validState.settings.displayName,
        timezone: validState.settings.timezone,
      })
      .eq("id", this.userId);
    if (profileError) throw profileError;

    if (validState.habits.length) {
      const { error } = await this.client.from("habits").upsert(
        validState.habits.map((habit) => ({
          id: habit.id,
          user_id: this.userId,
          name: habit.name,
          description: habit.description,
          color: habit.color,
          icon: habit.icon,
          frequency: habit.frequency,
          start_date: habit.startDate,
          position: habit.position,
          archived_at: habit.archivedAt,
          created_at: habit.createdAt,
          updated_at: habit.updatedAt,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    if (validState.checkins.length) {
      const { error } = await this.client.from("habit_checkins").upsert(
        validState.checkins.map((checkin) => ({
          id: checkin.id,
          habit_id: checkin.habitId,
          user_id: this.userId,
          checkin_date: checkin.checkinDate,
          completed_at: checkin.completedAt,
        })),
        { onConflict: "habit_id,checkin_date", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
  }
}
