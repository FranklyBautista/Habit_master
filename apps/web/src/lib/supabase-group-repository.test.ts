import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { GroupAccessError, SupabaseGroupRepository } from "./supabase-group-repository";

// Repositorio de grupos (ADR 0002) con un cliente falso: las RPC devuelven
// snake_case y el repositorio lo pasa a camelCase validando con el dominio.

type QueryResult = { data: unknown; error: unknown };
type Step = { method: string; args: unknown[] };
type Interaction = { table: string; steps: Step[] };

const CHAIN_METHODS = ["select", "eq", "maybeSingle", "single"] as const;

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
    rpc(name: string, params?: unknown) {
      const interaction: Interaction = {
        table: `rpc:${name}`,
        steps: [{ method: "rpc", args: [params] }],
      };
      interactions.push(interaction);
      return new FakeQuery(interaction, resolve);
    },
  };
  return { client: client as unknown as SupabaseClient, interactions };
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const MEMBER_ME = "33333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "44444444-4444-4444-8444-444444444444";
const HABIT_ID = "55555555-5555-4555-8555-555555555555";
const INVITATION_ID = "66666666-6666-4666-8666-666666666666";

const progressJson = {
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
          checkin_dates: ["2026-10-09", "2026-10-10"],
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
          start_date: "2026-10-01",
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
      expires_at: "2026-10-17T15:00:00.123456+00:00",
    },
  ],
};

function repositoryWith(resolve: (interaction: Interaction) => QueryResult) {
  const { client, interactions } = createFakeClient(resolve);
  return { repository: new SupabaseGroupRepository(client, USER_ID), interactions };
}

describe("SupabaseGroupRepository", () => {
  it("maps the overview from snake_case and reads the caller user code", async () => {
    const { repository, interactions } = repositoryWith((interaction) => {
      if (interaction.table === "rpc:get_my_groups") {
        return {
          data: [
            {
              id: GROUP_ID,
              name: "Familia",
              role: "owner",
              member_count: 2,
              joined_at: "2026-10-01T12:00:00+00:00",
            },
          ],
          error: null,
        };
      }
      if (interaction.table === "rpc:get_my_invitations") {
        return {
          data: [
            {
              id: INVITATION_ID,
              group_id: GROUP_ID,
              group_name: "Gimnasio",
              inviter_name: null,
              member_count: 3,
              expires_at: "2026-10-17T15:00:00+00:00",
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
          role: "owner",
          memberCount: 2,
          joinedAt: "2026-10-01T12:00:00+00:00",
        },
      ],
      invitations: [
        {
          id: INVITATION_ID,
          groupId: GROUP_ID,
          groupName: "Gimnasio",
          inviterName: null,
          memberCount: 3,
          expiresAt: "2026-10-17T15:00:00+00:00",
        },
      ],
      userCode: "H2M4R8TN",
      displayName: null,
    });
    const profileQuery = interactions.find((item) => item.table === "profiles");
    expect(profileQuery?.steps).toContainEqual({
      method: "select",
      args: ["user_code, display_name"],
    });
    expect(profileQuery?.steps).toContainEqual({ method: "eq", args: ["id", USER_ID] });
  });

  it("maps group progress to camelCase domain types", async () => {
    const { repository } = repositoryWith(() => ({ data: progressJson, error: null }));

    const progress = await repository.getProgress(GROUP_ID);

    expect(progress.myRole).toBe("owner");
    expect(progress.members[0]).toEqual({
      memberId: MEMBER_ME,
      displayName: "Ana",
      role: "owner",
      isMe: true,
      today: "2026-10-10",
      habits: [
        {
          habitId: HABIT_ID,
          name: "Meditar",
          color: "#047857",
          icon: "brain",
          startDate: "2026-09-01",
          archivePeriods: [{ from: "2026-09-10", to: "2026-09-12" }],
          checkinDates: ["2026-10-09", "2026-10-10"],
        },
      ],
    });
    expect(progress.members[1].habits[0].habitId).toBeNull();
    expect(progress.pendingInvitations).toEqual([
      {
        id: INVITATION_ID,
        userCode: "CCCC3333",
        expiresAt: "2026-10-17T15:00:00.123456+00:00",
      },
    ]);
  });

  it("rejects progress that does not match the contract", async () => {
    const { repository } = repositoryWith(() => ({
      data: { ...progressJson, my_role: "admin" },
      error: null,
    }));

    await expect(repository.getProgress(GROUP_ID)).rejects.toThrow();
  });

  it("turns a 42501 into GroupAccessError", async () => {
    const { repository } = repositoryWith(() => ({
      data: null,
      error: { code: "42501", message: "No formas parte de este grupo." },
    }));

    const failure = repository.getProgress(GROUP_ID);
    await expect(failure).rejects.toBeInstanceOf(GroupAccessError);
    await expect(failure).rejects.toThrow("No formas parte de este grupo.");
  });

  it("keeps the Spanish message of a business rule error", async () => {
    const { repository } = repositoryWith(() => ({
      data: null,
      error: {
        code: "P0001",
        message:
          "Este grupo ya tiene 10 miembros e invitaciones pendientes, el máximo.",
      },
    }));

    const failure = repository.inviteToGroup(GROUP_ID, "CCCC3333");
    await expect(failure).rejects.not.toBeInstanceOf(GroupAccessError);
    await expect(failure).rejects.toThrow("Este grupo ya tiene 10 miembros");
  });

  it("sends a normalized user code and returns the invite result", async () => {
    const { repository, interactions } = repositoryWith(() => ({
      data: "already_invited",
      error: null,
    }));

    await expect(repository.inviteToGroup(GROUP_ID, " cccc-3333 ")).resolves.toBe(
      "already_invited",
    );
    expect(interactions[0]).toEqual({
      table: "rpc:invite_to_group",
      steps: [{ method: "rpc", args: [{ group_id: GROUP_ID, user_code: "CCCC3333" }] }],
    });
  });

  it("calls the group RPCs with their parameter names", async () => {
    const { repository, interactions } = repositoryWith((interaction) =>
      interaction.table === "rpc:create_group"
        ? { data: GROUP_ID, error: null }
        : { data: null, error: null },
    );

    await expect(repository.createGroup("Familia", [HABIT_ID])).resolves.toBe(GROUP_ID);
    await repository.respondInvitation(INVITATION_ID, true, [HABIT_ID], "Beto");
    await repository.respondInvitation(INVITATION_ID, false);
    await repository.setSharedHabits(GROUP_ID, []);
    await repository.removeMember(GROUP_ID, MEMBER_OTHER);
    await repository.transferOwnership(GROUP_ID, MEMBER_OTHER);
    await repository.leaveGroup(GROUP_ID);

    expect(interactions.map((item) => [item.table, item.steps[0].args[0]])).toEqual([
      ["rpc:create_group", { group_name: "Familia", habit_ids: [HABIT_ID] }],
      [
        "rpc:respond_invitation",
        {
          invitation_id: INVITATION_ID,
          accept: true,
          habit_ids: [HABIT_ID],
          new_display_name: "Beto",
        },
      ],
      ["rpc:respond_invitation", { invitation_id: INVITATION_ID, accept: false }],
      ["rpc:set_shared_habits", { group_id: GROUP_ID, habit_ids: [] }],
      ["rpc:remove_member", { group_id: GROUP_ID, member_id: MEMBER_OTHER }],
      ["rpc:transfer_ownership", { group_id: GROUP_ID, member_id: MEMBER_OTHER }],
      ["rpc:leave_group", { group_id: GROUP_ID }],
    ]);
  });

  it("returns the regenerated user code", async () => {
    const { repository } = repositoryWith(() => ({ data: "7K3P9QXA", error: null }));

    await expect(repository.regenerateUserCode()).resolves.toBe("7K3P9QXA");
  });
});

// Chat (C5): la RPC devuelve del más reciente al más antiguo; el repositorio
// pide uno de más para saber si hay otra página y devuelve orden de lectura.
const MESSAGE_ID = "77777777-7777-4777-8777-777777777777";

function messageRow(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `88888888-8888-4888-8888-${String(index).padStart(12, "0")}`,
    body: `Mensaje ${index}`,
    created_at: `2026-10-12T10:${String(index).padStart(2, "0")}:00.123456+00:00`,
    member_id: MEMBER_OTHER,
    author_name: "Beto",
    is_mine: false,
    ...overrides,
  };
}

describe("SupabaseGroupRepository chat", () => {
  it("maps a page to reading order and asks for one extra message", async () => {
    const { repository, interactions } = repositoryWith(() => ({
      data: [
        messageRow(3, { member_id: null, author_name: "Antiguo miembro" }),
        messageRow(2, { is_mine: true, member_id: MEMBER_ME, author_name: "Ana" }),
        messageRow(1),
      ],
      error: null,
    }));

    const page = await repository.getMessages(GROUP_ID, null, 2);

    expect(page.hasMore).toBe(true);
    expect(page.messages.map((message) => message.body)).toEqual([
      "Mensaje 2",
      "Mensaje 3",
    ]);
    expect(page.messages[1]).toEqual({
      id: "88888888-8888-4888-8888-000000000003",
      body: "Mensaje 3",
      createdAt: "2026-10-12T10:03:00.123456+00:00",
      memberId: null,
      authorName: "Antiguo miembro",
      isMine: false,
    });
    expect(interactions[0]).toEqual({
      table: "rpc:get_group_messages",
      steps: [{ method: "rpc", args: [{ group_id: GROUP_ID, page_size: 3 }] }],
    });
  });

  it("passes the cursor for older pages and reports the last page", async () => {
    const { repository, interactions } = repositoryWith(() => ({
      data: [messageRow(1)],
      error: null,
    }));

    const page = await repository.getMessages(GROUP_ID, {
      createdAt: "2026-10-12T10:02:00.123456+00:00",
      id: MESSAGE_ID,
    });

    expect(page.hasMore).toBe(false);
    expect(interactions[0].steps[0].args[0]).toEqual({
      group_id: GROUP_ID,
      page_size: 51,
      before_created_at: "2026-10-12T10:02:00.123456+00:00",
      before_id: MESSAGE_ID,
    });
  });

  it("rejects messages that do not match the contract", async () => {
    const { repository } = repositoryWith(() => ({
      data: [messageRow(1, { author_name: "" })],
      error: null,
    }));

    await expect(repository.getMessages(GROUP_ID)).rejects.toThrow();
  });

  it("sends with the app-generated id and deletes by id", async () => {
    const { repository, interactions } = repositoryWith((interaction) =>
      interaction.table === "rpc:send_group_message"
        ? { data: MESSAGE_ID, error: null }
        : { data: null, error: null },
    );

    await expect(repository.sendMessage(GROUP_ID, "Hola", MESSAGE_ID)).resolves.toBe(
      MESSAGE_ID,
    );
    await repository.deleteMessage(MESSAGE_ID);

    expect(interactions.map((item) => [item.table, item.steps[0].args[0]])).toEqual([
      [
        "rpc:send_group_message",
        { group_id: GROUP_ID, body: "Hola", message_id: MESSAGE_ID },
      ],
      ["rpc:delete_group_message", { message_id: MESSAGE_ID }],
    ]);
  });

  it("keeps the rate limit message and maps lost access", async () => {
    const limited = repositoryWith(() => ({
      data: null,
      error: {
        code: "P0001",
        message:
          "Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.",
      },
    }));
    await expect(
      limited.repository.sendMessage(GROUP_ID, "Hola", MESSAGE_ID),
    ).rejects.toThrow("Has enviado 10 mensajes en el último minuto.");

    const removed = repositoryWith(() => ({
      data: null,
      error: { code: "42501", message: "No formas parte de este grupo." },
    }));
    await expect(removed.repository.getMessages(GROUP_ID)).rejects.toBeInstanceOf(
      GroupAccessError,
    );
  });
});

// Tiempo real (C5): canal falso que guarda los manejadores registrados.
function createRealtimeRepository() {
  type Handler = (payload: Record<string, unknown>) => void;
  const handlers: { type: string; filter: unknown; handler: Handler }[] = [];
  let statusCallback: ((status: string) => void) | null = null;
  const removeChannel = vi.fn().mockResolvedValue("ok");
  const channelNames: string[] = [];
  const channel = {
    on(type: string, filter: unknown, handler: Handler) {
      handlers.push({ type, filter, handler });
      return channel;
    },
    subscribe(callback: (status: string) => void) {
      statusCallback = callback;
      return channel;
    },
  };
  const client = {
    channel(name: string) {
      channelNames.push(name);
      return channel;
    },
    removeChannel,
  };
  const repository = new SupabaseGroupRepository(
    client as unknown as SupabaseClient,
    USER_ID,
  );
  const emit = (type: string, payload: Record<string, unknown> = {}) => {
    for (const item of handlers.filter((entry) => entry.type === type)) {
      item.handler(payload);
    }
  };
  const status = (value: string) => statusCallback?.(value);
  return { repository, handlers, channel, channelNames, removeChannel, emit, status };
}

describe("SupabaseGroupRepository realtime", () => {
  it("listens only to new messages of the group and treats them as a signal", () => {
    const realtime = createRealtimeRepository();
    const onSignal = vi.fn();

    realtime.repository.subscribeToMessages(GROUP_ID, onSignal);

    expect(realtime.channelNames[0]).toMatch(`group-messages:${GROUP_ID}:`);
    expect(
      realtime.handlers.find((item) => item.type === "postgres_changes")?.filter,
    ).toEqual({
      event: "INSERT",
      schema: "public",
      table: "group_messages",
      filter: `group_id=eq.${GROUP_ID}`,
    });
    realtime.emit("postgres_changes", { new: { id: "x", group_id: GROUP_ID } });
    expect(onSignal).toHaveBeenCalledTimes(1);
  });

  it("signals when Postgres changes are ready and after reconnecting, not on the first subscribe", () => {
    const realtime = createRealtimeRepository();
    const onSignal = vi.fn();
    realtime.repository.subscribeToMessages(GROUP_ID, onSignal);

    realtime.status("SUBSCRIBED");
    expect(onSignal).not.toHaveBeenCalled();
    realtime.emit("system", { extension: "postgres_changes", status: "ok" });
    expect(onSignal).toHaveBeenCalledTimes(1);
    realtime.emit("system", { extension: "postgres_changes", status: "error" });
    realtime.status("CHANNEL_ERROR");
    expect(onSignal).toHaveBeenCalledTimes(1);
    realtime.status("SUBSCRIBED");
    expect(onSignal).toHaveBeenCalledTimes(2);
  });

  it("removes the channel when unsubscribing", () => {
    const realtime = createRealtimeRepository();
    const unsubscribe = realtime.repository.subscribeToMessages(GROUP_ID, vi.fn());

    unsubscribe();

    expect(realtime.removeChannel).toHaveBeenCalledWith(realtime.channel);
  });
});
