import type { GroupInvitation, GroupMemberProgress } from "@habit-tracker/domain";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { Alert, Share } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupsCard } from "./groups-card";
import { MemberProgressCard } from "./member-progress-card";
import { UserCodeSection } from "./user-code-section";

type Props = { children?: ReactNode; accessibilityRole?: string };

const { groups, groupActions, router } = vi.hoisted(() => ({
  groups: {
    snapshot: {
      hydrated: true,
      syncing: false,
      error: null as string | null,
      groups: [] as { id: string; name: string }[],
      invitations: [] as GroupInvitation[],
      userCode: "H2M4R8TN" as string | null,
      displayName: "Ana" as string | null,
      revision: 0,
    },
  },
  groupActions: { regenerateUserCode: vi.fn() },
  router: { push: vi.fn() },
}));

vi.mock(
  "react-native",
  async () => (await import("./rn-host-mock")).reactNativeHostMock,
);
vi.mock("lucide-react-native", () => ({
  Check: () => null,
  ChevronLeft: () => null,
  ChevronRight: () => null,
  Share2: () => null,
  Users: () => null,
}));
vi.mock("expo-router", () => ({ router }));
// group-ui (botones y errores compartidos) importa estos módulos nativos.
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: Props) => createElement("div", null, children),
}));
vi.mock("@/components/themed-view", () => ({
  ThemedView: ({ children }: Props) => createElement("div", null, children),
}));
vi.mock("@/components/card", () => ({
  Card: ({ children }: Props) => createElement("section", null, children),
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
  }),
}));
vi.mock("@/constants/theme", () => ({
  Spacing: { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 },
  MaxContentWidth: 800,
}));
vi.mock("@/lib/group-store", () => ({
  useGroups: () => groups.snapshot,
  useGroupActions: () => groupActions,
}));

function member(overrides: Partial<GroupMemberProgress> = {}): GroupMemberProgress {
  return {
    memberId: "11111111-1111-4111-8111-111111111111",
    displayName: "Sam",
    role: "member",
    isMe: false,
    today: "2026-10-10",
    habits: [
      {
        habitId: null,
        name: "Caminar",
        color: "#0369A1",
        icon: "footprints",
        startDate: "2026-10-01",
        archivePeriods: [],
        checkinDates: ["2026-10-09", "2026-10-10"],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  groups.snapshot = {
    ...groups.snapshot,
    hydrated: true,
    groups: [],
    invitations: [],
    userCode: "H2M4R8TN",
  };
});

describe("MemberProgressCard", () => {
  it("shows today's status as text, the streak and a text alternative for 7 days", () => {
    render(<MemberProgressCard member={member({ role: "owner" })} />);
    expect(screen.getByText("Sam · dueño")).toBeInTheDocument();
    expect(screen.getByText("✓ hoy")).toBeInTheDocument();
    expect(screen.getByText("racha de 2 días")).toBeInTheDocument();
    expect(screen.getByLabelText("Últimos 7 días: 2 de 7 días")).toBeInTheDocument();
  });

  it("marks a pending habit with ✗ and text, never colour alone", () => {
    const pending = member();
    pending.habits[0].checkinDates = ["2026-10-09"];
    render(<MemberProgressCard member={pending} />);
    expect(screen.getByText("✗ hoy")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("lets me check in my own shared habit from the group", () => {
    const onToggleHabit = vi.fn();
    const mine = member({ isMe: true, displayName: "Ana" });
    mine.habits[0] = {
      ...mine.habits[0],
      habitId: "22222222-2222-4222-8222-222222222222",
      checkinDates: [],
    };
    render(<MemberProgressCard member={mine} onToggleHabit={onToggleHabit} />);
    expect(screen.getByText("Ana (tú)")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", { name: "Marcar Caminar hoy" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    fireEvent.click(checkbox);
    expect(onToggleHabit).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
  });

  it("explains when a member does not share habits yet", () => {
    render(<MemberProgressCard member={member({ habits: [] })} />);
    expect(screen.getByText("Aún no comparte hábitos.")).toBeInTheDocument();
  });
});

describe("GroupsCard", () => {
  it("renders nothing until the groups are loaded", () => {
    groups.snapshot = { ...groups.snapshot, hydrated: false };
    const { container } = render(<GroupsCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("invites to create a group when there are none", () => {
    render(<GroupsCard />);
    fireEvent.click(
      screen.getByRole("button", { name: "Comparte hábitos con tu gente" }),
    );
    expect(router.push).toHaveBeenCalledWith("/grupos/nuevo");
  });

  it("shows new invitations and the groups, and opens the list", () => {
    groups.snapshot = {
      ...groups.snapshot,
      groups: [{ id: "g1", name: "Familia" }],
      invitations: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          groupId: "44444444-4444-4444-8444-444444444444",
          groupName: "Gimnasio",
          inviterName: "Sam",
          memberCount: 3,
          expiresAt: "2026-10-17T10:00:00+00:00",
        },
      ],
    };
    render(<GroupsCard />);
    expect(screen.getByText("1 nueva")).toBeInTheDocument();
    expect(screen.getByText("Familia")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Grupos, 1 invitación nueva" }));
    expect(router.push).toHaveBeenCalledWith("/grupos");
  });
});

describe("UserCodeSection", () => {
  it("shows the code as XXXX-XXXX and shares it with the native sheet", () => {
    render(<UserCodeSection />);
    expect(screen.getByText("H2M4-R8TN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compartir mi código" }));
    expect(Share.share).toHaveBeenCalledWith({
      message: expect.stringContaining("H2M4-R8TN"),
    });
  });

  it("asks for confirmation before regenerating and shows a server error", async () => {
    groupActions.regenerateUserCode.mockResolvedValue({
      ok: false,
      error: "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    });
    render(<UserCodeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Generar un código nuevo" }));
    expect(groupActions.regenerateUserCode).not.toHaveBeenCalled();

    const buttons = vi.mocked(Alert.alert).mock.calls[0][2] ?? [];
    const confirm = buttons.find((button) => button.text === "Generar");
    await act(async () => {
      confirm?.onPress?.();
    });
    expect(groupActions.regenerateUserCode).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
  });
});
