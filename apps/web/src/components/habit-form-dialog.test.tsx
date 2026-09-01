import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HabitFormDialog } from "./habit-form-dialog";

const actionMocks = vi.hoisted(() => ({
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
}));

vi.mock("@/lib/habit-store", () => ({ useHabitActions: () => actionMocks }));

function renderForm() {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<HabitFormDialog open habit={null} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}

function submitForm() {
  const dialog = screen.getByRole("dialog");
  const form = dialog.querySelector("form");
  if (!form) throw new Error("No se encontró el formulario de hábito.");
  fireEvent.submit(form);
}

describe("HabitFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.createHabit.mockResolvedValue(true);
    actionMocks.updateHabit.mockResolvedValue(true);
  });

  it("creates a valid habit and reports success", async () => {
    const user = userEvent.setup();
    const { onClose, onSaved } = renderForm();

    await user.type(screen.getByLabelText("Nombre"), "Tomar agua");
    await user.type(screen.getByLabelText("Descripción"), "Al despertar");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Crear hábito",
      }),
    );

    expect(actionMocks.createHabit).toHaveBeenCalledWith({
      name: "Tomar agua",
      description: "Al despertar",
      color: "#047857",
      icon: "sparkles",
    });
    expect(onSaved).toHaveBeenCalledWith("Hábito creado y añadido a Hoy.");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows an actionable error for an empty name", () => {
    renderForm();
    submitForm();

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe un nombre.");
    expect(actionMocks.createHabit).not.toHaveBeenCalled();
  });

  it("rejects names longer than sixty characters", () => {
    renderForm();
    const name = screen.getByLabelText("Nombre");
    fireEvent.change(name, { target: { value: "a".repeat(61) } });
    submitForm();

    expect(name).toHaveAttribute("maxlength", "60");
    expect(screen.getByRole("alert")).toHaveTextContent("Usa 60 caracteres o menos.");
    expect(actionMocks.createHabit).not.toHaveBeenCalled();
  });

  it("cancels without submitting the form", async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(actionMocks.createHabit).not.toHaveBeenCalled();
  });
});
