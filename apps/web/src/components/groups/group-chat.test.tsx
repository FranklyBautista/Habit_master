import type { GroupMessage } from "@habit-tracker/domain";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupChat } from "./group-chat";

type ChatState = {
  messages: GroupMessage[];
  hasMore: boolean;
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  notMember: boolean;
  online: boolean;
  sending: boolean;
  deletingId: string | null;
  checkedAt: number;
};

const chat = vi.hoisted(() => ({
  state: {} as ChatState,
  refresh: vi.fn(),
  loadOlder: vi.fn(),
  send: vi.fn(),
  deleteMessage: vi.fn(),
}));

vi.mock("@/lib/group-chat", () => ({
  useGroupChat: () => ({
    ...chat.state,
    refresh: chat.refresh,
    loadOlder: chat.loadOlder,
    send: chat.send,
    deleteMessage: chat.deleteMessage,
  }),
}));

const GROUP_ID = "22222222-2222-4222-8222-222222222222";

function message(index: number, overrides: Partial<GroupMessage> = {}): GroupMessage {
  return {
    id: `88888888-8888-4888-8888-${String(index).padStart(12, "0")}`,
    body: `Mensaje ${index}`,
    createdAt: `2026-10-12T09:${String(index).padStart(2, "0")}:00+00:00`,
    memberId: "33333333-3333-4333-8333-333333333333",
    authorName: "Sam",
    isMine: false,
    ...overrides,
  };
}

function renderChat() {
  return render(<GroupChat groupId={GROUP_ID} timezone="UTC" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  chat.state = {
    messages: [],
    hasMore: false,
    loading: false,
    loadingOlder: false,
    error: null,
    notMember: false,
    online: true,
    sending: false,
    deletingId: null,
    checkedAt: Date.parse("2026-10-12T15:00:00Z"),
  };
  chat.send.mockResolvedValue({ ok: true, data: undefined });
});

describe("GroupChat", () => {
  it("shows a loading state", () => {
    chat.state.loading = true;
    renderChat();
    expect(screen.getByLabelText("Cargando mensajes")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("invites to write the first message when the chat is empty", () => {
    renderChat();
    expect(
      screen.getByText("Aún no hay mensajes. Escribe el primero."),
    ).toBeInTheDocument();
  });

  it("shows a load error with a retry", async () => {
    const user = userEvent.setup();
    chat.state.error = "No se pudo sincronizar.";
    renderChat();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos cargar los mensajes",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(chat.refresh).toHaveBeenCalled();
  });

  it("lists messages with author and time, marking my own and former members", () => {
    chat.state.messages = [
      message(1, { authorName: "Antiguo miembro", memberId: null }),
      message(12, { isMine: true, authorName: "Ana", body: "Hecho, 5 días" }),
    ];
    renderChat();
    const list = screen.getByRole("list", { name: "Mensajes" });
    expect(list).toHaveTextContent("Antiguo miembro09:01Mensaje 1");
    expect(list).toHaveTextContent("Tú09:12Hecho, 5 días");
  });

  it("offers older messages when there are more", async () => {
    const user = userEvent.setup();
    chat.state.messages = [message(1)];
    chat.state.hasMore = true;
    renderChat();
    await user.click(screen.getByRole("button", { name: "Cargar anteriores" }));
    expect(chat.loadOlder).toHaveBeenCalled();
  });

  it("sends with Enter, keeps Shift+Enter for new lines and clears after the server confirms", async () => {
    const user = userEvent.setup();
    renderChat();
    const input = screen.getByLabelText("Mensaje");

    await user.type(input, "Hola{Shift>}{Enter}{/Shift}equipo");
    expect(input).toHaveValue("Hola\nequipo");
    expect(screen.getByText("11/1000")).toBeInTheDocument();
    await user.type(input, "{Enter}");

    expect(chat.send).toHaveBeenCalledWith("Hola\nequipo");
    expect(input).toHaveValue("");
  });

  it("keeps the draft and shows the server error when sending fails", async () => {
    const user = userEvent.setup();
    chat.send.mockResolvedValue({
      ok: false,
      error:
        "Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.",
    });
    renderChat();
    const input = screen.getByLabelText("Mensaje");

    await user.type(input, "Hola");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Has enviado 10 mensajes");
    expect(input).toHaveValue("Hola");
  });

  it("does not send messages over 1000 characters", async () => {
    const user = userEvent.setup();
    renderChat();
    const input = screen.getByLabelText("Mensaje");

    await user.click(input);
    await user.paste("a".repeat(1001));

    expect(screen.getByText("1001/1000 · Demasiado largo")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).toBeDisabled();
  });

  it("disables writing while offline", () => {
    chat.state.online = false;
    renderChat();
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");
    expect(screen.getByLabelText("Mensaje")).toBeDisabled();
  });

  it("announces only messages that arrive after the first load", () => {
    chat.state.messages = [message(1)];
    const { rerender } = renderChat();
    const live = document.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("");

    chat.state.messages = [message(1), message(2, { body: "¡Ánimo!" })];
    rerender(<GroupChat groupId={GROUP_ID} timezone="UTC" />);
    expect(live).toHaveTextContent("Nuevo mensaje de Sam: ¡Ánimo!");
  });

  it("explains that you are no longer in the group", () => {
    chat.state.notMember = true;
    renderChat();
    expect(
      screen.getByRole("heading", { name: "Ya no formas parte de este grupo" }),
    ).toBeInTheDocument();
  });
});
