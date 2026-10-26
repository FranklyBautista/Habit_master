import type { Habit } from "@habit-tracker/domain";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SortableHabitList } from "./sortable-habit-list";

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

function renderList(onMove = vi.fn().mockResolvedValue(true)) {
  render(
    <SortableHabitList
      habits={habits}
      onMove={onMove}
      renderRow={(habit) => <strong>{habit.name}</strong>}
    />,
  );
  return onMove;
}

function rowNames() {
  return screen.getAllByRole("listitem").map((row) => row.textContent);
}

describe("SortableHabitList", () => {
  it("has no up/down buttons, only a drag handle per habit", () => {
    renderList();

    expect(screen.queryByRole("button", { name: /^Subir/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Bajar/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Reordenar / })).toHaveLength(3);
  });

  it("moves the focused habit with the arrow keys and keeps focus on its handle", async () => {
    const user = userEvent.setup();
    let finishSave: (saved: boolean) => void = () => {};
    const onMove = renderList(
      vi.fn(() => new Promise<boolean>((resolve) => (finishSave = resolve))),
    );

    screen.getByRole("button", { name: "Reordenar Caminar" }).focus();
    await user.keyboard("{ArrowUp}");

    expect(onMove).toHaveBeenCalledWith(habits[1].id, 0);
    // Mientras se guarda, la lista se queda como la dejó el usuario.
    expect(rowNames()).toEqual(["Caminar", "Leer", "Meditar"]);
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Reordenar Caminar" })).toHaveFocus();
    finishSave(true);
    await waitFor(() =>
      expect(screen.getByText("Caminar: posición 1 de 3.")).toBeInTheDocument(),
    );
  });

  it("returns to the server order when saving fails", async () => {
    const user = userEvent.setup();
    renderList(vi.fn().mockResolvedValue(false));

    screen.getByRole("button", { name: "Reordenar Leer" }).focus();
    await user.keyboard("{End}");

    await waitFor(() =>
      expect(screen.getByText("No se pudo mover Leer.")).toBeInTheDocument(),
    );
    expect(rowNames()).toEqual(["Leer", "Caminar", "Meditar"]);
  });

  it("ignores moves past either end", async () => {
    const user = userEvent.setup();
    const onMove = renderList();

    screen.getByRole("button", { name: "Reordenar Leer" }).focus();
    await user.keyboard("{ArrowUp}{Home}");
    screen.getByRole("button", { name: "Reordenar Meditar" }).focus();
    await user.keyboard("{ArrowDown}");

    expect(onMove).not.toHaveBeenCalled();
  });
});
