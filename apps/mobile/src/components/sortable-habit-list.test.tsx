import type { Habit } from "@habit-tracker/domain";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SortableHabitList } from "./sortable-habit-list";

// Same approach as reminder-time-modal.test.tsx: React Native primitives
// become host elements. Each accessibility action of a View is rendered as a
// button so the test can trigger it like a screen reader would.
type RNProps = {
  children?: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean };
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
};

vi.mock("react-native", () => {
  const View = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    accessibilityActions,
    onAccessibilityAction,
  }: RNProps) =>
    createElement(
      "div",
      {
        role: accessibilityRole,
        "aria-label": accessibilityLabel,
        "aria-disabled": accessibilityState?.disabled,
      },
      accessibilityActions?.map((action) =>
        createElement(
          "button",
          {
            key: action.name,
            "aria-label": `${accessibilityLabel}: ${action.label}`,
            onClick: () =>
              onAccessibilityAction?.({ nativeEvent: { actionName: action.name } }),
          },
          action.label,
        ),
      ),
      children,
    );
  class AnimatedValue {
    setValue() {}
  }
  return {
    View,
    Text: ({ children }: RNProps) => createElement("span", null, children),
    Animated: { View, Value: AnimatedValue },
    StyleSheet: { create: <T,>(styles: T) => styles },
    Platform: {
      OS: "android",
      select: (options: Record<string, unknown>) => options.default,
    },
    useColorScheme: () => "dark",
  };
});
vi.mock("lucide-react-native", () => ({ GripVertical: () => null }));

function makeHabit(index: number, name: string): Habit {
  return {
    id: `40000000-0000-4000-8000-00000000000${index}`,
    name,
    description: null,
    color: "#047857",
    icon: "sparkles",
    frequency: "daily",
    startDate: "2026-10-01",
    position: index,
    archivedAt: null,
    archivePeriods: [],
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
  };
}

const habits = [makeHabit(0, "Leer"), makeHabit(1, "Caminar"), makeHabit(2, "Meditar")];

function renderList({
  disabled = false,
  onMove = vi.fn(async () => true),
}: {
  disabled?: boolean;
  onMove?: (id: string, toIndex: number) => Promise<boolean>;
} = {}) {
  render(
    <SortableHabitList
      habits={habits}
      disabled={disabled}
      onMove={onMove}
      onDraggingChange={vi.fn()}
      renderRow={(habit) => <strong>{habit.name}</strong>}
    />,
  );
  return onMove;
}

describe("SortableHabitList (mobile)", () => {
  it("replaces the up/down buttons with one drag handle per habit", () => {
    renderList();

    expect(screen.getAllByRole("button", { name: /^Reordenar [^:]+$/ })).toHaveLength(
      3,
    );
    expect(screen.queryByRole("button", { name: /^Subir / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Bajar / })).toBeNull();
  });

  it("moves a habit with the handle's screen-reader actions", async () => {
    const onMove = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Reordenar Caminar: Subir" }));
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(habits[1].id, 0));
  });

  it("ignores moves past either end and while offline", () => {
    const onMove = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Reordenar Leer: Subir" }));
    fireEvent.click(screen.getByRole("button", { name: "Reordenar Meditar: Bajar" }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("disables the handles offline", () => {
    const onMove = vi.fn(async () => true);
    renderList({ disabled: true, onMove });

    const handle = screen.getByRole("button", { name: "Reordenar Caminar" });
    expect(handle).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reordenar Caminar: Subir" }));
    expect(onMove).not.toHaveBeenCalled();
  });
});
