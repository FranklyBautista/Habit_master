import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { GroupAccessError, SupabaseGroupRepository } from "./supabase-group-repository";

// SupabaseGroupRepository es TypeScript puro: se prueba contra un cliente
// falso hecho a mano, como supabase-habit-repository.test.ts.

type QueryResult = { data: unknown; error: unknown };
type Interaction = { name: string; args: unknown[] };

const CHAIN_METHODS = ["select", "eq", "maybeSingle"] as const;

class FakeQuery implements PromiseLike<QueryResult> {
  constructor(
    private readonly interaction: Interaction,
    private readonly resolve: (interaction: Interaction) => QueryResult,
  ) {
    for (const method of CHAIN_METHODS) {
      (this as Record<string, unknown>)[method] = (...args: unknown[]) => {
        this.interaction.args.push({ [method]: args });
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

function createRepository(resolve: (interaction: Interaction) => QueryResult) {
  const interactions: Interaction[] = [];
  const client = {
    from(table: string) {
      const interaction: Interaction = { name: `table:${table}`, args: [] };
      interactions.push(interaction);
      return new FakeQuery(interaction, resolve);
    },
    rpc(name: string, params?: unknown) {
      const interaction: Interaction = { name: `rpc:${name}`, args: [params] };
      interactions.push(interaction);
      return new FakeQuery(interaction, resolve);
    },
  };
  const repository = new SupabaseGroupRepository(
    client as unknown as SupabaseClient<never>,
    USER_ID,
  );
  return { repository, interactions };
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "99999999-9999-4999-8999-999999999999";
const MEMBER_ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HABIT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const INVITATION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const rawProgress = {
  id: GROUP_ID,
  name: "Familia",
  my_role: "owner",
  members: [
    {
      member_id: MEMBER_ME,
      display_name: "Ana",
      role: "owner",
      is_me: true,
      today: "2026-10-10",
      habits: [
        {
          habit_id: HABIT_ID,
          name: "Meditar",
          color: "#047857",
          icon: "brain",
          start_date: "2026-09-01",
          archive_periods: [{ from: "2026-09-10", to: "2026-09-12" }],
          checkin_dates: ["2026-10-08", "2026-10-09"],
        },
      ],
    },
    {
      member_id: MEMBER_OTHER,
      display_name: "Beto",
      role: "member",
      is_me: false,
      today: "2026-10-11",
      habits: [
        {
          habit_id: null,
          name: "Caminar",
          color: "#7C3AED",
          icon: "footprints",
          start_date: "2026-09-01",
          archive_periods: [],
          checkin_dates: [],
        },
      ],
    },
  ],
  pending_invitations: [
    {
      id: INVITATION_ID,
      user_code: "CCCC3333",
      expires_at: "2026-10-17T10:00:00+00:00",
    },
  ],
};

describe("SupabaseGroupRepository", () => {
  it("maps the group progress JSON to camelCase through the domain schema", async () => {
    const { repository, interactions } = createRepository(() => ({
      data: rawProgress,
      error: null,
    }));

    const progress = await repository.getProgress(GROUP_ID);

    expect(interactions).toEqual([
      { name: "rpc:get_group_progress", args: [{ group_id: GROUP_ID }] },
    ]);
    expect(progress.myRole).toBe("owner");
    expect(progress.members[0]).toMatchObject({
      memberId: MEMBER_ME,
      displayName: "Ana",
      isMe: true,
      today: "2026-10-10",
    });
    expect(progress.members[0].habits[0]).toEqual({
      habitId: HABIT_ID,
      name: "Meditar",
      color: "#047857",
      icon: "brain",
      startDate: "2026-09-01",
      archivePeriods: [{ from: "2026-09-10", to: "2026-09-12" }],
      checkinDates: ["2026-10-08", "2026-10-09"],
    });
    expect(progress.members[1].habits[0].habitId).toBeNull();
    expect(progress.pendingInvitations).toEqual([
      {
        id: INVITATION_ID,
        userCode: "CCCC3333",
        expiresAt: "2026-10-17T10:00:00+00:00",
      },
    ]);
  });

  it("rejects a progress payload that does not match the schema", async () => {
    const { repository } = createRepository(() => ({
      data: { ...rawProgress, my_role: "admin" },
      error: null,
    }));
    await expect(repository.getProgress(GROUP_ID)).rejects.toThrow();
  });

  it("maps the overview: groups, invitations and the user code", async () => {
    const { repository } = createRepository(({ name }) => {
      if (name === "rpc:get_my_groups") {
        return {
          data: [
            {
              id: GROUP_ID,
              name: "Familia",
              role: "member",
              member_count: 3,
              joined_at: "2026-10-01T10:00:00+00:00",
            },
          ],
          error: null,
        };
      }
      if (name === "rpc:get_my_invitations") {
        return {
          data: [
            {
              id: INVITATION_ID,
              group_id: GROUP_ID,
              group_name: "Gimnasio",
              inviter_name: null,
              member_count: 2,
              expires_at: "2026-10-17T10:00:00+00:00",
            },
          ],
          error: null,
        };
      }
      return { data: { user_code: "H2M4R8TN", display_name: null }, error: null };
    });

    await expect(repository.getOverview()).resolves.toEqual({
      groups: [
        {
          id: GROUP_ID,
          name: "Familia",
          role: "member",
          memberCount: 3,
          joinedAt: "2026-10-01T10:00:00+00:00",
        },
      ],
      invitations: [
        {
          id: INVITATION_ID,
          groupId: GROUP_ID,
          groupName: "Gimnasio",
          inviterName: null,
          memberCount: 2,
          expiresAt: "2026-10-17T10:00:00+00:00",
        },
      ],
      userCode: "H2M4R8TN",
      displayName: null,
    });
  });

  it("turns a 42501 response into GroupAccessError", async () => {
    const { repository } = createRepository(() => ({
      data: null,
      error: { code: "42501", message: "No formas parte de este grupo." },
    }));
    const failure = repository.getProgress(GROUP_ID);
    await expect(failure).rejects.toBeInstanceOf(GroupAccessError);
    await expect(failure).rejects.toThrow("No formas parte de este grupo.");
  });

  it("keeps the Spanish message of business errors and hides the rest", async () => {
    const business = createRepository(() => ({
      data: null,
      error: { code: "P0001", message: "Código no válido." },
    }));
    await expect(
      business.repository.inviteToGroup(GROUP_ID, "ZZZZ9999"),
    ).rejects.toThrow("Código no válido.");

    const network = createRepository(() => ({
      data: null,
      error: { message: "TypeError: Failed to fetch" },
    }));
    await expect(network.repository.leaveGroup(GROUP_ID)).rejects.toThrow(
      "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    );
  });

  it("sends the RPC parameters the migration expects", async () => {
    const { repository, interactions } = createRepository(({ name }) => ({
      data: name === "rpc:invite_to_group" ? "already_invited" : GROUP_ID,
      error: null,
    }));

    await repository.createGroup("Familia", [HABIT_ID], "Ana");
    await repository.createGroup("Solo", []);
    await expect(repository.inviteToGroup(GROUP_ID, "cccc-3333")).resolves.toBe(
      "already_invited",
    );
    await repository.respondInvitation(INVITATION_ID, false);

    expect(interactions.map(({ name, args }) => [name, args[0]])).toEqual([
      [
        "rpc:create_group",
        { group_name: "Familia", habit_ids: [HABIT_ID], new_display_name: "Ana" },
      ],
      ["rpc:create_group", { group_name: "Solo", habit_ids: [] }],
      ["rpc:invite_to_group", { group_id: GROUP_ID, user_code: "cccc-3333" }],
      [
        "rpc:respond_invitation",
        { invitation_id: INVITATION_ID, accept: false, habit_ids: [] },
      ],
    ]);
  });
});
