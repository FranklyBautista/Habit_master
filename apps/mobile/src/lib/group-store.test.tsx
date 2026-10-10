import type { GroupProgress } from "@habit-tracker/domain";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GroupStoreProvider,
  isDisplayNameRequiredError,
  useGroupActions,
  useGroupProgress,
  useGroups,
} from "./group-store";

// group-store.tsx usa `react-native` (AppState), NetInfo y el cliente de
// Supabase, que no corren en jsdom. Se sustituyen, y el repositorio es falso
// para controlar cada respuesta (mismo enfoque que habit-store.test.tsx).
const { repository, netInfo, appState } = vi.hoisted(() => ({
  repository: {
    getOverview: vi.fn(),
    getProgress: vi.fn(),
    createGroup: vi.fn(),
    inviteToGroup: vi.fn(),
    setSharedHabits: vi.fn(),
    leaveGroup: vi.fn(),
  },
  netInfo: {
    listener: null as ((state: { isConnected: boolean | null }) => void) | null,
  },
  appState: {
    listeners: [] as ((state: string) => void)[],
  },
}));

vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, cb: (state: string) => void) => {
      appState.listeners.push(cb);
      return {
        remove: () => {
          appState.listeners = appState.listeners.filter((listener) => listener !== cb);
        },
      };
    },
  },
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: (cb: (state: { isConnected: boolean | null }) => void) => {
      netInfo.listener = cb;
      return () => {
        netInfo.listener = null;
      };
    },
  },
}));
vi.mock("./supabase-group-repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("./supabase-group-repository")>();
  return {
    GroupAccessError: original.GroupAccessError,
    SupabaseGroupRepository: class {
      getOverview = repository.getOverview;
      getProgress = repository.getProgress;
      createGroup = repository.createGroup;
      inviteToGroup = repository.inviteToGroup;
      setSharedHabits = repository.setSharedHabits;
      leaveGroup = repository.leaveGroup;
    },
  };
});

const { GroupAccessError } = await import("./supabase-group-repository");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "99999999-9999-4999-8999-999999999999";

const emptyOverview = {
  groups: [],
  invitations: [],
  userCode: "H2M4R8TN",
  displayName: "Ana",
};
const familia = {
  id: GROUP_ID,
  name: "Familia",
  role: "owner" as const,
  memberCount: 1,
  joinedAt: "2026-10-10T10:00:00+00:00",
};
const progress: GroupProgress = {
  id: GROUP_ID,
  name: "Familia",
  myRole: "owner",
  members: [],
  pendingInvitations: [],
};

function wrapper({ children }: PropsWithChildren) {
  return <GroupStoreProvider userId={USER_ID}>{children}</GroupStoreProvider>;
}

function renderStore() {
  return renderHook(() => ({ snapshot: useGroups(), actions: useGroupActions() }), {
    wrapper,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  appState.listeners = [];
  repository.getOverview.mockResolvedValue(emptyOverview);
  repository.getProgress.mockResolvedValue(progress);
});

describe("isDisplayNameRequiredError", () => {
  it("recognises the server message that asks for a display name", () => {
    expect(
      isDisplayNameRequiredError(
        "Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.",
      ),
    ).toBe(true);
    expect(isDisplayNameRequiredError("Código no válido.")).toBe(false);
  });
});

describe("GroupStoreProvider", () => {
  it("loads the overview on mount", async () => {
    const { result } = renderStore();
    expect(result.current.snapshot.hydrated).toBe(false);
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    expect(result.current.snapshot.userCode).toBe("H2M4R8TN");
    expect(result.current.snapshot.displayName).toBe("Ana");
    expect(result.current.snapshot.revision).toBe(0);
  });

  it("waits for the server and re-fetches before showing a new group (no optimistic UI)", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    const write = deferred<string>();
    repository.createGroup.mockReturnValue(write.promise);
    repository.getOverview.mockResolvedValue({ ...emptyOverview, groups: [familia] });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.actions.createGroup({ name: " Familia ", habitIds: [] });
    });
    expect(result.current.snapshot.groups).toEqual([]);

    await act(async () => {
      write.resolve(GROUP_ID);
      await expect(pending).resolves.toEqual({ ok: true, data: GROUP_ID });
    });
    expect(repository.createGroup).toHaveBeenCalledWith("Familia", [], undefined);
    expect(result.current.snapshot.groups).toEqual([familia]);
    expect(result.current.snapshot.revision).toBe(1);
  });

  it("returns the server message and leaves data untouched when a write fails", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.getOverview.mockClear();
    repository.leaveGroup.mockRejectedValue(
      new Error("Transfiere la propiedad a otro miembro antes de salir."),
    );

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.leaveGroup(GROUP_ID);
    });

    expect(outcome).toEqual({
      ok: false,
      error: "Transfiere la propiedad a otro miembro antes de salir.",
    });
    expect(repository.getOverview).not.toHaveBeenCalled();
    expect(result.current.snapshot.revision).toBe(0);
  });

  it("rejects an invalid code without calling the RPC", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.inviteToGroup(GROUP_ID, "xyz");
    });

    expect(outcome).toEqual({ ok: false, error: "Código no válido." });
    expect(repository.inviteToGroup).not.toHaveBeenCalled();
  });

  it("validates the group name before calling the RPC", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.createGroup({ name: "   ", habitIds: [] });
    });

    expect(outcome).toEqual({ ok: false, error: "Escribe un nombre." });
    expect(repository.createGroup).not.toHaveBeenCalled();
  });

  it("sends a concurrent duplicate of the same action only once", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.setSharedHabits.mockResolvedValue(undefined);

    await act(async () => {
      await Promise.all([
        result.current.actions.setSharedHabits(GROUP_ID, []),
        result.current.actions.setSharedHabits(GROUP_ID, []),
      ]);
    });

    expect(repository.setSharedHabits).toHaveBeenCalledTimes(1);
  });

  it("re-fetches only when connectivity is regained", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.getOverview.mockClear();

    act(() => netInfo.listener?.({ isConnected: true }));
    expect(repository.getOverview).not.toHaveBeenCalled();

    act(() => netInfo.listener?.({ isConnected: false }));
    expect(repository.getOverview).not.toHaveBeenCalled();

    await act(async () => netInfo.listener?.({ isConnected: true }));
    expect(repository.getOverview).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when the app returns to the foreground", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));
    repository.getOverview.mockClear();

    await act(async () => {
      for (const listener of appState.listeners) listener("active");
    });
    expect(repository.getOverview).toHaveBeenCalledTimes(1);
  });

  it("keeps the newest overview when an older refresh resolves later", async () => {
    const { result } = renderStore();
    await waitFor(() => expect(result.current.snapshot.hydrated).toBe(true));

    const stale = deferred<typeof emptyOverview>();
    repository.getOverview.mockReturnValueOnce(stale.promise);
    repository.getOverview.mockResolvedValueOnce({
      ...emptyOverview,
      groups: [familia],
    });

    await act(async () => {
      const first = result.current.actions.refresh();
      await result.current.actions.refresh();
      stale.resolve(emptyOverview);
      await first;
    });
    expect(result.current.snapshot.groups).toEqual([familia]);
  });
});

describe("useGroupProgress", () => {
  function renderProgress() {
    return renderHook(
      () => ({ group: useGroupProgress(GROUP_ID), actions: useGroupActions() }),
      { wrapper },
    );
  }

  it("loads the progress and reloads it after a mutation", async () => {
    const { result } = renderProgress();
    await waitFor(() => expect(result.current.group.progress).toEqual(progress));
    expect(repository.getProgress).toHaveBeenCalledWith(GROUP_ID);
    const calls = repository.getProgress.mock.calls.length;

    repository.setSharedHabits.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.actions.setSharedHabits(GROUP_ID, []);
    });
    await waitFor(() =>
      expect(repository.getProgress.mock.calls.length).toBeGreaterThan(calls),
    );
  });

  it("reports notMember when the server denies access", async () => {
    repository.getProgress.mockRejectedValue(new GroupAccessError());
    const { result } = renderProgress();
    await waitFor(() => expect(result.current.group.loading).toBe(false));
    expect(result.current.group).toMatchObject({
      progress: null,
      notMember: true,
      error: null,
    });
  });

  it("surfaces other errors without marking the user as an ex-member", async () => {
    repository.getProgress.mockRejectedValue(
      new Error("No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo."),
    );
    const { result } = renderProgress();
    await waitFor(() => expect(result.current.group.loading).toBe(false));
    expect(result.current.group.notMember).toBe(false);
    expect(result.current.group.error).toBe(
      "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    );
  });
});
