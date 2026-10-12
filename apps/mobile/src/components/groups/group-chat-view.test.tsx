import type { GroupMessage } from "@habit-tracker/domain";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { AccessibilityInfo, Alert } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupChatView } from "./group-chat-view";

type Props = { children?: ReactNode; accessibilityRole?: string };
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

const { chat, router } = vi.hoisted(() => ({
  chat: {
    state: {} as ChatState,
    refresh: vi.fn(),
    loadOlder: vi.fn(),
    send: vi.fn(),
    deleteMessage: vi.fn(),
  },
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock(
  "react-native",
  async () => (await import("./rn-host-mock")).reactNativeHostMock,
);
vi.mock("lucide-react-native", () => ({
  ChevronLeft: () => null,
  SendHorizontal: () => null,
}));
vi.mock("expo-router", () => ({ router }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: Props) => createElement("div", null, children),
}));
vi.mock("@/components/themed-view", () => ({
  ThemedView: ({ children }: Props) => createElement("div", null, children),
}));
vi.mock("@/components/themed-text", () => ({
  ThemedText: ({ children, accessibilityRole }: Props) =>
    createElement("span", { role: accessibilityRole }, children),
}));
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    text: "#000",
    textSecondary: "#555",
    backgroundElement: "#fff",
    border: "#ccc",
    tint: "#0a0",
    accent: "#cf3",
    onAccent: "#000",
    accentSoft: "#efe",
    danger: "#c00",
  }),
}));
vi.mock("@/constants/theme", () => ({
  Spacing: { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 },
  MaxContentWidth: 800,
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
  return render(<GroupChatView groupId={GROUP_ID} timezone="UTC" />);
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

describe("GroupChatView", () => {
  it("shows the loading, empty and error states", () => {
    chat.state.loading = true;
    const { rerender } = renderChat();
    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();

    chat.state.loading = false;
    rerender(<GroupChatView groupId={GROUP_ID} timezone="UTC" />);
    expect(screen.getByText("Aún no hay mensajes.")).toBeInTheDocument();

    chat.state.error = "No se pudo sincronizar.";
    rerender(<GroupChatView groupId={GROUP_ID} timezone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(chat.refresh).toHaveBeenCalled();
  });

  it("labels each message with author, time and text", () => {
    chat.state.messages = [
      message(1, { authorName: "Antiguo miembro", memberId: null }),
      message(12, { isMine: true, authorName: "Ana", body: "Hecho" }),
    ];
    renderChat();
    expect(
      screen.getByLabelText("Antiguo miembro, 09:01: Mensaje 1"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tú, 09:12: Hecho")).toBeInTheDocument();
  });

  it("loads older messages on demand", () => {
    chat.state.messages = [message(1)];
    chat.state.hasMore = true;
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "Cargar anteriores" }));
    expect(chat.loadOlder).toHaveBeenCalled();
  });

  it("sends the draft and clears it after the server confirms", async () => {
    renderChat();
    fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: "Hola" } });
    expect(screen.getByText("4/1000")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    });

    expect(chat.send).toHaveBeenCalledWith("Hola");
    expect(screen.getByLabelText("Mensaje")).toHaveValue("");
  });

  it("keeps the draft and shows the rate limit error", async () => {
    chat.send.mockResolvedValue({
      ok: false,
      error:
        "Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.",
    });
    renderChat();
    fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: "Hola" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Has enviado 10 mensajes");
    expect(screen.getByLabelText("Mensaje")).toHaveValue("Hola");
  });

  it("blocks messages over 1000 characters and writing while offline", () => {
    const { rerender } = renderChat();
    fireEvent.change(screen.getByLabelText("Mensaje"), {
      target: { value: "a".repeat(1001) },
    });
    expect(screen.getByText("1001/1000 · Demasiado largo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).toBeDisabled();

    chat.state.online = false;
    rerender(<GroupChatView groupId={GROUP_ID} timezone="UTC" />);
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toBeDisabled();
  });

  it("announces messages from others that arrive after the first load", () => {
    chat.state.messages = [message(1)];
    const { rerender } = renderChat();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

    chat.state.messages = [message(1), message(2, { body: "¡Ánimo!" })];
    rerender(<GroupChatView groupId={GROUP_ID} timezone="UTC" />);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Nuevo mensaje de Sam: ¡Ánimo!",
    );
  });

  it("sends people who were removed back to Grupos", () => {
    chat.state.notMember = true;
    renderChat();
    expect(screen.getByText("Ya no formas parte de este grupo.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ir a Grupos" }));
    expect(router.replace).toHaveBeenCalledWith("/grupos");
  });

  it("asks before deleting my own message on long press", async () => {
    chat.deleteMessage.mockResolvedValue({ ok: true, data: undefined });
    chat.state.messages = [message(1), message(12, { isMine: true, body: "Hecho" })];
    renderChat();

    // Solo el propio es pulsable.
    expect(
      screen.queryByRole("button", { name: /Sam, 09:01/ }),
    ).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByRole("button", { name: "Tú, 09:12: Hecho" }));
    expect(chat.deleteMessage).not.toHaveBeenCalled();
    const [title, , buttons] = vi.mocked(Alert.alert).mock.calls[0];
    expect(title).toBe("¿Borrar este mensaje?");

    await act(async () => {
      buttons?.find((button) => button.text === "Borrar")?.onPress?.();
    });
    expect(chat.deleteMessage).toHaveBeenCalledWith(message(12).id);
  });

  it("shows why a delete failed", async () => {
    chat.deleteMessage.mockResolvedValue({
      ok: false,
      error: "Este mensaje ya no está disponible.",
    });
    chat.state.messages = [message(12, { isMine: true, body: "Hecho" })];
    renderChat();

    fireEvent.contextMenu(screen.getByRole("button", { name: "Tú, 09:12: Hecho" }));
    const buttons = vi.mocked(Alert.alert).mock.calls[0][2];
    await act(async () => {
      buttons?.find((button) => button.text === "Borrar")?.onPress?.();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este mensaje ya no está disponible.",
    );
  });
});
