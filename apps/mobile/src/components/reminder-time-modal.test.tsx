import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ReminderTimeModal } from "./reminder-time-modal";

// Same approach as connection-banner.test.tsx: React Native primitives become
// plain host elements so jsdom can render the modal and we can type into it.
type RNProps = {
  children?: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  visible?: boolean;
};

vi.mock("react-native", () => ({
  View: ({ children, accessibilityRole, accessibilityLabel }: RNProps) =>
    createElement(
      "div",
      { role: accessibilityRole, "aria-label": accessibilityLabel },
      children,
    ),
  Text: ({ children, accessibilityRole }: RNProps) =>
    createElement("span", { role: accessibilityRole }, children),
  Pressable: ({ children, onPress, disabled, accessibilityLabel }: RNProps) =>
    createElement(
      "button",
      { onClick: onPress, disabled, "aria-label": accessibilityLabel },
      children,
    ),
  TextInput: ({ accessibilityLabel, value, onChangeText }: RNProps) =>
    createElement("input", {
      "aria-label": accessibilityLabel,
      value,
      onChange: (event: { target: { value: string } }) =>
        onChangeText?.(event.target.value),
    }),
  Modal: ({ children, visible }: RNProps) =>
    visible ? createElement("div", null, children) : null,
  StyleSheet: { create: <T,>(styles: T) => styles },
  Platform: {
    OS: "android",
    select: (options: Record<string, unknown>) => options.default,
  },
  useColorScheme: () => "light",
}));
vi.mock("lucide-react-native", () => ({ Minus: () => null, Plus: () => null }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: RNProps) => createElement("div", null, children),
}));

function renderModal(initialTime = { hour: 20, minute: 0 }) {
  const onSave = vi.fn(async () => null as string | null);
  render(
    <ReminderTimeModal
      open
      initialTime={initialTime}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  return { onSave };
}

const hourInput = () => screen.getByLabelText("Hora, del 1 al 12") as HTMLInputElement;
const minuteInput = () =>
  screen.getByLabelText("Minutos, del 0 al 59") as HTMLInputElement;

describe("ReminderTimeModal", () => {
  it("starts from the reminder being edited, in 12-hour format", () => {
    renderModal({ hour: 21, minute: 5 });
    expect(hourInput().value).toBe("9");
    expect(minuteInput().value).toBe("05");
  });

  it("saves a time typed by hand", async () => {
    const { onSave } = renderModal();
    fireEvent.change(hourInput(), { target: { value: "7" } });
    fireEvent.change(minuteInput(), { target: { value: "45" } });
    fireEvent.click(screen.getByLabelText("a. m."));
    fireEvent.click(screen.getByLabelText("Guardar recordatorio"));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ hour: 7, minute: 45 }));
  });

  it("shows a validation error instead of saving an invalid time", () => {
    const { onSave } = renderModal();
    fireEvent.change(minuteInput(), { target: { value: "75" } });
    fireEvent.click(screen.getByLabelText("Guardar recordatorio"));

    expect(screen.getByRole("alert").textContent).toContain("del 0 al 59");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps the −/+ buttons and presets in sync with the inputs", async () => {
    const { onSave } = renderModal({ hour: 11, minute: 55 });
    fireEvent.click(screen.getByLabelText("Sumar una hora"));
    expect(hourInput().value).toBe("12");
    fireEvent.click(screen.getByLabelText("Sumar 5 minutos"));
    expect(minuteInput().value).toBe("00");
    fireEvent.click(screen.getByLabelText("Guardar recordatorio"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ hour: 12, minute: 0 }));

    fireEvent.click(screen.getByLabelText("Usar 9:30 p. m."));
    expect(hourInput().value).toBe("9");
    expect(minuteInput().value).toBe("30");
  });

  it("shows the error returned by onSave (e.g. duplicate time)", async () => {
    const onSave = vi.fn(async () => "Ya tienes un recordatorio a esa hora.");
    render(
      <ReminderTimeModal open initialTime={null} onClose={vi.fn()} onSave={onSave} />,
    );
    fireEvent.click(screen.getByLabelText("Guardar recordatorio"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Ya tienes"),
    );
  });
});
