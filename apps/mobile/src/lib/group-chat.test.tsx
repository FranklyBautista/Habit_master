import type { GroupMessage, GroupMessagePage } from "@habit-tracker/domain";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGroupChat } from "./group-chat";
import { GroupStoreProvider } from "./group-store";

// El chat usa el repositorio del store de grupos; se sustituye por uno falso
// para comprobar ADR 0001 sin red. `react-native` (AppState), NetInfo y el
// cliente de Supabase no corren en jsdom y también se sustituyen.
const { repository, netInfo, appState } = vi.hoisted(() => ({
  repository: {
    getOverview: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
    subscribeToMessages: vi.fn(),
  },
  netInfo: {
    listeners: [] as ((state: { isConnected: boolean | null }) => void)[],
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
      netInfo.listeners.push(cb);
      return () => {
        netInfo.listeners = netInfo.listeners.filter((listener) => listener !== cb);
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
      getMessages = repository.getMessages;
      sendMessage = repository.sendMessage;
      deleteMessage = repository.deleteMessage;
      subscribeToMessages = repository.subscribeToMessages;
    },
  };
});

const { GroupAccessError } = await import("./supabase-group-repository");

function emitNetInfo(isConnected: boolean | null) {
  for (const listener of netInfo.listeners) listener({ isConnected });
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_ID = "22222222-2222-4222-8222-222222222222";

function message(index: number, overrides: Partial<GroupMessage> = {}): GroupMessage {
  return {
    id: `88888888-8888-4888-8888-${String(index).padStart(12, "0")}`,
    body: `Mensaje ${index}`,
    createdAt: `2026-10-12T10:${String(index).padStart(2, "0")}:00+00:00`,
    memberId: "33333333-3333-4333-8333-333333333333",
    authorName: "Beto",
    isMine: false,
    ...overrides,
  };
}

const unsubscribe = vi.fn();

function lastSignal(): () => void {
  const call = repository.subscribeToMessages.mock.calls.at(-1);
  if (!call) throw new Error("No realtime subscription.");
  return call[1] as () => void;
}

function page(messages: GroupMessage[], hasMore = false): GroupMessagePage {
  return { messages, hasMore };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function wrapper({ children }: PropsWithChildren) {
  return <GroupStoreProvider userId={USER_ID}>{children}</GroupStoreProvider>;
}

function renderChat(groupId = GROUP_ID) {
  return renderHook(() => useGroupChat(groupId), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  netInfo.listeners = [];
  appState.listeners = [];
  repository.getOverview.mockResolvedValue({
    groups: [],
    invitations: [],
    userCode: "H2M4R8TN",
    displayName: "Ana",
  });
  repository.getMessages.mockResolvedValue(page([message(1), message(2)]));
  repository.sendMessage.mockResolvedValue("ok");
  repository.deleteMessage.mockResolvedValue(undefined);
  unsubscribe.mockReset();
  repository.subscribeToMessages.mockReturnValue(unsubscribe);
});

describe("useGroupChat", () => {
  it("loads the latest page on mount", async () => {
    const { result } = renderChat();

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages.map((item) => item.body)).toEqual([
      "Mensaje 1",
      "Mensaje 2",
    ]);
    expect(repository.getMessages).toHaveBeenCalledWith(GROUP_ID);
  });

  it("does not show a sent message until the server confirms it and the page is refetched", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const write = deferred<string>();
    repository.sendMessage.mockReturnValueOnce(write.promise);
    repository.getMessages.mockResolvedValueOnce(
      page([message(1), message(2), message(3, { body: "Hola", isMine: true })]),
    );

    let sending!: Promise<unknown>;
    act(() => {
      sending = result.current.send("  Hola ");
    });
    await waitFor(() => expect(result.current.sending).toBe(true));
    expect(result.current.messages).toHaveLength(2);

    await act(async () => {
      write.resolve("ok");
      await sending;
    });
    expect(repository.sendMessage).toHaveBeenCalledWith(
      GROUP_ID,
      "Hola",
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(result.current.messages.at(-1)?.body).toBe("Hola");
    expect(result.current.sending).toBe(false);
  });

  it("shares one request between repeated sends", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await Promise.all([result.current.send("Hola"), result.current.send("Hola")]);
    });

    expect(repository.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("validates the draft before calling the server", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.send("   ")).resolves.toEqual({
      ok: false,
      error: "Escribe un mensaje.",
    });
    await expect(result.current.send("a".repeat(1001))).resolves.toEqual({
      ok: false,
      error: "El mensaje no puede tener más de 1000 caracteres.",
    });
    expect(repository.sendMessage).not.toHaveBeenCalled();
  });

  it("reuses the message id when the same text is retried after a failure", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    // El repositorio convierte los fallos de red en este mensaje genérico.
    repository.sendMessage.mockRejectedValueOnce(
      new Error("No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo."),
    );

    let first: unknown;
    await act(async () => {
      first = await result.current.send("Hola");
    });
    expect(first).toMatchObject({ ok: false });
    await act(async () => {
      await result.current.send("Hola");
    });
    await act(async () => {
      await result.current.send("Otro");
    });

    const ids = repository.sendMessage.mock.calls.map((call) => call[2]);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });

  it("returns the server rate limit message", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.sendMessage.mockRejectedValueOnce(
      new Error(
        "Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.",
      ),
    );

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.send("Hola");
    });

    expect(outcome).toEqual({
      ok: false,
      error:
        "Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.",
    });
  });

  it("deletes a message and then refetches", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.getMessages.mockResolvedValueOnce(page([message(1)]));

    await act(async () => {
      await result.current.deleteMessage(message(2).id);
    });

    expect(repository.deleteMessage).toHaveBeenCalledWith(message(2).id);
    expect(result.current.messages.map((item) => item.body)).toEqual(["Mensaje 1"]);
  });

  it("loads older pages with the cursor of the oldest message", async () => {
    repository.getMessages.mockResolvedValueOnce(page([message(3), message(4)], true));
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);
    repository.getMessages.mockResolvedValueOnce(page([message(1), message(2)]));

    await act(async () => {
      await result.current.loadOlder();
    });

    expect(repository.getMessages).toHaveBeenLastCalledWith(GROUP_ID, {
      createdAt: message(3).createdAt,
      id: message(3).id,
    });
    expect(result.current.messages).toHaveLength(4);
    expect(result.current.hasMore).toBe(false);
  });

  it("reports lost access after being removed from the group", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.sendMessage.mockRejectedValueOnce(
      new GroupAccessError("No formas parte de este grupo."),
    );

    await act(async () => {
      await result.current.send("Hola");
    });

    expect(result.current.notMember).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it("treats a malformed group id as a group you are not in", async () => {
    const { result } = renderChat("no-es-un-id");

    await waitFor(() => expect(result.current.notMember).toBe(true));
    expect(repository.getMessages).not.toHaveBeenCalled();
  });

  it("refetches when the app returns to the foreground and when the connection comes back", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const calls = repository.getMessages.mock.calls.length;

    await act(async () => {
      for (const listener of appState.listeners) listener("active");
    });
    expect(repository.getMessages.mock.calls.length).toBe(calls + 1);

    act(() => emitNetInfo(false));
    expect(result.current.online).toBe(false);
    await act(async () => emitNetInfo(true));
    expect(result.current.online).toBe(true);
    expect(repository.getMessages.mock.calls.length).toBe(calls + 2);
  });
});

describe("useGroupChat realtime", () => {
  it("subscribes to the group and closes the channel on unmount", async () => {
    const { result, unmount } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(repository.subscribeToMessages).toHaveBeenCalledWith(
      GROUP_ID,
      expect.any(Function),
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("refetches the page when a signal arrives instead of trusting the payload", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.getMessages.mockResolvedValueOnce(
      page([message(1), message(2), message(3, { body: "¡Hola!" })]),
    );

    await act(async () => {
      lastSignal()();
    });

    await waitFor(() => expect(result.current.messages.at(-1)?.body).toBe("¡Hola!"));
  });

  it("coalesces a burst of signals into one extra request", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const calls = repository.getMessages.mock.calls.length;
    const slow = deferred<GroupMessagePage>();
    repository.getMessages.mockReturnValueOnce(slow.promise);

    act(() => {
      const signal = lastSignal();
      signal();
      signal();
      signal();
      signal();
    });
    expect(repository.getMessages.mock.calls.length).toBe(calls + 1);

    await act(async () => {
      slow.resolve(page([message(1), message(2)]));
    });
    await waitFor(() =>
      expect(repository.getMessages.mock.calls.length).toBe(calls + 2),
    );
  });

  it("does not subscribe for a malformed group id", () => {
    renderChat("no-es-un-id");
    expect(repository.subscribeToMessages).not.toHaveBeenCalled();
  });
});
