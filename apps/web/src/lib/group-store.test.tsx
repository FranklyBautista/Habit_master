import type { GroupProgress, GroupSummary } from "@habit-tracker/domain";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GroupStoreProvider,
  useGroupActions,
  useGroupProgress,
  useGroups,
} from "./group-store";

// El store crea un cliente del navegador y un SupabaseGroupRepository; se
// sustituye el repositorio por uno falso para probar ADR 0001 sin red: cada
// acción espera al servidor, después vuelve a pedir el resumen y nunca cambia el
// estado antes de confirmarlo.
const { repository, GroupAccessError } = vi.hoisted(() => {
  class GroupAccessError extends Error {}
  return {
    GroupAccessError,
    repository: {
      getOverview: vi.fn(),
      getProgress: vi.fn(),
      createGroup: vi.fn(),
      renameGroup: vi.fn(),
      deleteGroup: vi.fn(),
      inviteToGroup: vi.fn(),
      cancelInvitation: vi.fn(),
      respondInvitation: vi.fn(),
      setSharedHabits: vi.fn(),
      removeMember: vi.fn(),
      transferOwnership: vi.fn(),
      leaveGroup: vi.fn(),
      regenerateUserCode: vi.fn(),
    },
  };
});

vi.mock("./supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("./supabase-group-repository", () => ({
  GroupAccessError,
  SupabaseGroupRepository: class {
    getOverview = repository.getOverview;
    getProgress = repository.getProgress;
    createGroup = repository.createGroup;
    renameGroup = repository.renameGroup;
    deleteGroup = repository.deleteGroup;
    inviteToGroup = repository.inviteToGroup;
    cancelInvitation = repository.cancelInvitation;
    respondInvitation = repository.respondInvitation;
    setSharedHabits = repository.setSharedHabits;
    removeMember = repository.removeMember;
    transferOwnership = repository.transferOwnership;
    leaveGroup = repository.leaveGroup;
    regenerateUserCode = repository.regenerateUserCode;
  },
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

const familia: GroupSummary = {
  id: GROUP_ID,
  name: "Familia",
  role: "owner",
  memberCount: 1,
  joinedAt: "2026-10-01T12:00:00+00:00",
};

const progress: GroupProgress = {
  id: GROUP_ID,
  name: "Familia",
  myRole: "owner",
  members: [],
  pendingInvitations: [],
};

function overview(groups: GroupSummary[] = []) {
  return { groups, invitations: [], userCode: "H2M4R8TN", displayName: "Ana" };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function wrapper({ children }: PropsWithChildren) {
  return <GroupStoreProvider userId={USER_ID}>{children}</GroupStoreProvider>;
}

function renderStore() {
  return renderHook(() => ({ snapshot: useGroups(), actions: useGroupActions() }), {
    wrapper,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.getOverview.mockResolvedValue(overview());
  repository.getProgress.mockResolvedValue(progress);
});

describe("GroupStoreProvider", () => {
  it("loads the overview on mount", async () => {
    const { result } = renderStore();

    expect(result.current.snapshot.hydrated).toBe(false);
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    expect(result.current.snapshot.userCode).toBe("H2M4R8TN");
    expect(result.current.snapshot.displayName).toBe("Ana");
    expect(result.current.snapshot.groups).toEqual([]);
  });

  it("does not show a new group until the server confirms and the overview is refetched", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    const write = deferred<string>();
    repository.createGroup.mockReturnValue(write.promise);
    repository.getOverview.mockResolvedValue(overview([familia]));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.actions.createGroup({ name: " Familia ", habitIds: [] });
    });
    expect(result.current.snapshot.groups).toEqual([]);
    expect(repository.createGroup).toHaveBeenCalledWith("Familia", [], undefined);

    await act(async () => {
      write.resolve(GROUP_ID);
      await expect(pending).resolves.toEqual({ ok: true, data: GROUP_ID });
    });
    expect(result.current.snapshot.groups).toEqual([familia]);
    expect(result.current.snapshot.revision).toBe(1);
  });

  it("returns the server message when an action fails, without touching the state", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.inviteToGroup.mockRejectedValue(
      new Error(
        "Has enviado 20 invitaciones en las últimas 24 horas. Inténtalo más tarde.",
      ),
    );

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.inviteToGroup(GROUP_ID, "CCCC-3333");
    });

    expect(outcome).toEqual({
      ok: false,
      error:
        "Has enviado 20 invitaciones en las últimas 24 horas. Inténtalo más tarde.",
    });
    expect(result.current.snapshot.revision).toBe(0);
    expect(repository.getOverview).toHaveBeenCalledTimes(1);
  });

  it("shows a generic message for network failures", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.leaveGroup.mockRejectedValue(new TypeError("Failed to fetch"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.leaveGroup(GROUP_ID);
    });

    expect(outcome).toEqual({
      ok: false,
      error: "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    });
  });

  it("rejects an invalid code or name without calling the server", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    let invite: unknown;
    let create: unknown;
    await act(async () => {
      invite = await result.current.actions.inviteToGroup(GROUP_ID, "UUUU-1234");
      create = await result.current.actions.createGroup({ name: "   ", habitIds: [] });
    });

    expect(invite).toEqual({ ok: false, error: "Código no válido." });
    expect(create).toEqual({ ok: false, error: "Escribe un nombre." });
    expect(repository.inviteToGroup).not.toHaveBeenCalled();
    expect(repository.createGroup).not.toHaveBeenCalled();
  });

  it("does not send the same action twice while it is in flight", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    const write = deferred<"sent">();
    repository.inviteToGroup.mockReturnValue(write.promise);

    let first!: Promise<unknown>;
    let second: unknown;
    await act(async () => {
      first = result.current.actions.inviteToGroup(GROUP_ID, "CCCC3333");
      second = await result.current.actions.inviteToGroup(GROUP_ID, "CCCC3333");
    });
    expect(second).toMatchObject({ ok: false });
    expect(repository.inviteToGroup).toHaveBeenCalledTimes(1);

    await act(async () => {
      write.resolve("sent");
      await expect(first).resolves.toEqual({ ok: true, data: "sent" });
    });
  });

  it("revalidates the overview on focus and online", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(repository.getOverview).toHaveBeenCalledTimes(3));
  });
});

describe("useGroupProgress", () => {
  function renderProgress() {
    return renderHook(
      () => ({ view: useGroupProgress(GROUP_ID), actions: useGroupActions() }),
      { wrapper },
    );
  }

  it("loads the group progress", async () => {
    const { result } = renderProgress();

    await waitFor(() => expect(result.current.view.loading).toBe(false));
    expect(result.current.view.progress).toEqual(progress);
    expect(repository.getProgress).toHaveBeenCalledWith(GROUP_ID);
  });

  it("marks the caller as no longer a member on GroupAccessError", async () => {
    repository.getProgress.mockRejectedValue(
      new GroupAccessError("No formas parte de este grupo."),
    );
    const { result } = renderProgress();

    await waitFor(() => expect(result.current.view.loading).toBe(false));
    expect(result.current.view.notMember).toBe(true);
    expect(result.current.view.progress).toBeNull();
    expect(result.current.view.error).toBeNull();
  });

  it("refetches after any confirmed group action", async () => {
    const { result } = renderProgress();
    await waitFor(() => expect(result.current.view.loading).toBe(false));
    expect(repository.getProgress).toHaveBeenCalledTimes(1);
    repository.setSharedHabits.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.actions.setSharedHabits(GROUP_ID, []);
    });

    await waitFor(() => expect(repository.getProgress).toHaveBeenCalledTimes(2));
  });
});
