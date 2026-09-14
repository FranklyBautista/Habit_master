import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SupabaseHabitRepository } from "./supabase-habit-repository";

// SupabaseHabitRepository is plain TypeScript (only `import type` from
// @supabase/supabase-js and @habit-tracker/database), so it can be exercised
// against a hand-rolled fake client with no React Native / Expo runtime.
// These tests lock in the behaviour Fase 8 prioritises: snake_case <-> camelCase
// mapping through the domain schema, idempotent check-ins, and archived habits.

type QueryResult = { data: unknown; error: unknown };
type Step = { method: string; args: unknown[] };
type Interaction = { table: string; steps: Step[] };

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "is",
  "order",
  "limit",
  "maybeSingle",
  "single",
] as const;

// A thenable that records every chained call and resolves to whatever the
// test's `resolve` callback returns for that interaction. Mirrors the shape of
// a @supabase/postgrest-js builder closely enough for this repository.
class FakeQuery implements PromiseLike<QueryResult> {
  constructor(
    private readonly interaction: Interaction,
    private readonly resolve: (interaction: Interaction) => QueryResult,
  ) {
    for (const method of CHAIN_METHODS) {
      (this as Record<string, unknown>)[method] = (...args: unknown[]) => {
        this.interaction.steps.push({ method, args });
        return this;
      };
    }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.resolve(this.interaction))
      .then(onfulfilled, onrejected);
  }
}

function createFakeClient(resolve: (interaction: Interaction) => QueryResult) {
  const interactions: Interaction[] = [];
  const client = {
    from(table: string) {
      const interaction: Interaction = { table, steps: [] };
      interactions.push(interaction);
      return new FakeQuery(interaction, resolve);
    },
  };
  return { client: client as unknown as SupabaseClient, interactions };
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const HABIT_ID = "22222222-2222-4222-8222-222222222222";
const CHECKIN_ID = "33333333-3333-4333-8333-333333333333";

const profileRow = {
  id: USER_ID,
  display_name: "Frankly",
  timezone: "America/Santo_Domingo",
  locale: "es",
  week_starts_on: 1,
  created_at: "2026-09-01T12:00:00.000Z",
  updated_at: "2026-09-01T12:00:00.000Z",
};

const habitRow = {
  id: HABIT_ID,
  user_id: USER_ID,
  name: "Beber agua",
  description: null,
  color: "#0F766E",
  icon: "sparkles",
  frequency: "daily",
  start_date: "2026-09-01",
  position: 0,
  archived_at: null,
  created_at: "2026-09-01T12:00:00.000Z",
  updated_at: "2026-09-01T12:00:00.000Z",
};

const checkinRow = {
  id: CHECKIN_ID,
  habit_id: HABIT_ID,
  user_id: USER_ID,
  checkin_date: "2026-09-02",
  completed_at: "2026-09-02T09:00:00.000Z",
  note: null,
};

function hasStep(interaction: Interaction, method: string) {
  return interaction.steps.some((step) => step.method === method);
}

function isProfileSelect(interaction: Interaction) {
  return interaction.table === "profiles" && hasStep(interaction, "maybeSingle");
}

function isHabitsPositionLookup(interaction: Interaction) {
  return interaction.table === "habits" && hasStep(interaction, "is");
}

function isHabitsSelect(interaction: Interaction) {
  return (
    interaction.table === "habits" &&
    interaction.steps[0]?.method === "select" &&
    !hasStep(interaction, "is")
  );
}

function isCheckinsSelect(interaction: Interaction) {
  return (
    interaction.table === "habit_checkins" && interaction.steps[0]?.method === "select"
  );
}

describe("SupabaseHabitRepository.getState", () => {
  it("maps snake_case rows to camelCase domain types through the schema", async () => {
    const { client } = createFakeClient((interaction) => {
      if (isProfileSelect(interaction)) return { data: profileRow, error: null };
      if (isHabitsSelect(interaction)) return { data: [habitRow], error: null };
      if (isCheckinsSelect(interaction)) return { data: [checkinRow], error: null };
      throw new Error(`Unexpected interaction: ${JSON.stringify(interaction)}`);
    });

    const state = await new SupabaseHabitRepository(client, USER_ID).getState();

    expect(state.habits).toEqual([
      {
        id: HABIT_ID,
        name: "Beber agua",
        description: null,
        color: "#0F766E",
        icon: "sparkles",
        frequency: "daily",
        startDate: "2026-09-01",
        position: 0,
        archivedAt: null,
        createdAt: "2026-09-01T12:00:00.000Z",
        updatedAt: "2026-09-01T12:00:00.000Z",
      },
    ]);
    expect(state.checkins).toEqual([
      {
        id: CHECKIN_ID,
        habitId: HABIT_ID,
        checkinDate: "2026-09-02",
        completedAt: "2026-09-02T09:00:00.000Z",
      },
    ]);
    expect(state.settings).toEqual({
      displayName: "Frankly",
      timezone: "America/Santo_Domingo",
      locale: "es",
      weekStartsOn: 1,
    });
  });

  it("rejects when a query returns an error", async () => {
    const { client } = createFakeClient((interaction) => {
      if (isProfileSelect(interaction)) return { data: profileRow, error: null };
      if (isHabitsSelect(interaction)) {
        return { data: null, error: new Error("permission denied for table habits") };
      }
      if (isCheckinsSelect(interaction)) return { data: [], error: null };
      throw new Error("unexpected");
    });

    await expect(
      new SupabaseHabitRepository(client, USER_ID).getState(),
    ).rejects.toThrow("permission denied for table habits");
  });

  it("upserts a profile row when none exists yet", async () => {
    const { client, interactions } = createFakeClient((interaction) => {
      if (isProfileSelect(interaction)) return { data: null, error: null };
      if (interaction.table === "profiles" && hasStep(interaction, "upsert")) {
        return {
          data: { ...profileRow, display_name: null },
          error: null,
        };
      }
      if (isHabitsSelect(interaction)) return { data: [], error: null };
      if (isCheckinsSelect(interaction)) return { data: [], error: null };
      throw new Error("unexpected");
    });

    const state = await new SupabaseHabitRepository(client, USER_ID).getState();

    expect(
      interactions.some(
        (interaction) =>
          interaction.table === "profiles" && hasStep(interaction, "upsert"),
      ),
    ).toBe(true);
    // display_name null falls back to the placeholder, timezone is preserved.
    expect(state.settings.displayName).toBe("Tú");
    expect(state.settings.timezone).toBe("America/Santo_Domingo");
  });
});

describe("SupabaseHabitRepository mutations", () => {
  const createInput = {
    name: "Leer",
    description: null,
    color: "#047857" as const,
    icon: "book-open" as const,
  };

  it("derives a new habit position from the highest active position", async () => {
    const { client, interactions } = createFakeClient((interaction) => {
      if (isHabitsPositionLookup(interaction)) {
        return { data: { position: 4 }, error: null };
      }
      return { data: null, error: null };
    });

    await new SupabaseHabitRepository(client, USER_ID).createHabit(
      createInput,
      "2026-09-09",
    );

    const insert = interactions
      .flatMap((interaction) => interaction.steps)
      .find((step) => step.method === "insert");
    expect(insert?.args[0]).toMatchObject({ position: 5, start_date: "2026-09-09" });
  });

  it("inserts the first habit at position 0", async () => {
    const { client, interactions } = createFakeClient((interaction) => {
      if (isHabitsPositionLookup(interaction)) return { data: null, error: null };
      return { data: null, error: null };
    });

    await new SupabaseHabitRepository(client, USER_ID).createHabit(
      createInput,
      "2026-09-09",
    );

    const insert = interactions
      .flatMap((interaction) => interaction.steps)
      .find((step) => step.method === "insert");
    expect(insert?.args[0]).toMatchObject({ position: 0 });
  });

  it("marks a check-in with an idempotent upsert on (habit_id, checkin_date)", async () => {
    const { client, interactions } = createFakeClient(() => ({
      data: null,
      error: null,
    }));

    await new SupabaseHabitRepository(client, USER_ID).setCheckin(
      HABIT_ID,
      "2026-09-09",
      true,
    );

    expect(interactions).toHaveLength(1);
    const [interaction] = interactions;
    expect(interaction.table).toBe("habit_checkins");
    const upsert = interaction.steps.find((step) => step.method === "upsert");
    expect(upsert?.args[0]).toEqual({
      habit_id: HABIT_ID,
      user_id: USER_ID,
      checkin_date: "2026-09-09",
    });
    expect(upsert?.args[1]).toEqual({
      onConflict: "habit_id,checkin_date",
      ignoreDuplicates: true,
    });
  });

  it("unmarks a check-in with a filtered delete", async () => {
    const { client, interactions } = createFakeClient(() => ({
      data: null,
      error: null,
    }));

    await new SupabaseHabitRepository(client, USER_ID).setCheckin(
      HABIT_ID,
      "2026-09-09",
      false,
    );

    const [interaction] = interactions;
    expect(interaction.steps.map((step) => step.method)).toEqual([
      "delete",
      "eq",
      "eq",
    ]);
    expect(interaction.steps[1].args).toEqual(["habit_id", HABIT_ID]);
    expect(interaction.steps[2].args).toEqual(["checkin_date", "2026-09-09"]);
  });

  it("archives with a timestamp and restores by clearing archived_at", async () => {
    const { client, interactions } = createFakeClient(() => ({
      data: null,
      error: null,
    }));
    const repository = new SupabaseHabitRepository(client, USER_ID);

    await repository.setArchived(HABIT_ID, true);
    await repository.setArchived(HABIT_ID, false, 3);

    const [archive, restore] = interactions;
    const archivePayload = archive.steps.find((step) => step.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(typeof archivePayload.archived_at).toBe("string");
    expect(archivePayload).not.toHaveProperty("position");

    const restorePayload = restore.steps.find((step) => step.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(restorePayload).toEqual({ archived_at: null, position: 3 });
  });
});
