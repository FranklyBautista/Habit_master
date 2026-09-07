import type { Database } from "@habit-tracker/database";
import {
  type CreateHabitInput,
  type Habit,
  type HabitCheckin,
  type HabitTrackerState,
  habitTrackerStateSchema,
  type UpdateHabitInput,
  type UserSettings,
} from "@habit-tracker/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mirrors apps/web/src/lib/supabase-habit-repository.ts (already verified in
// Fase 6). Mobile has no local-data prototype to migrate from, so
// `importState` is intentionally omitted here.
type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type CheckinRow = Database["public"]["Tables"]["habit_checkins"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function mapHabit(row: HabitRow): Habit {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    const [profileResult, habitsResult, checkinsResult] = await Promise.all([
      this.client.from("profiles").select("*").eq("id", this.userId).maybeSingle(),
      this.client.from("habits").select("*").order("position"),
      this.client.from("habit_checkins").select("*").order("checkin_date"),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (habitsResult.error) throw habitsResult.error;
    if (checkinsResult.error) throw checkinsResult.error;

    const profile = profileResult.data ?? (await this.ensureProfile());

    return habitTrackerStateSchema.parse({
      version: 1,
      habits: habitsResult.data.map(mapHabit),
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
    const { count, error: countError } = await this.client
      .from("habits")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null);
    if (countError) throw countError;
    const { error } = await this.client.from("habits").insert({
      user_id: this.userId,
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      start_date: startDate,
      position: count ?? 0,
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
}
