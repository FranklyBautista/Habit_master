import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("exposes its label and changes with pointer input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Checkbox
        label="Beber agua"
        description="Al despertar"
        defaultChecked={false}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /Beber agua/ });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("can be toggled with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Caminar" defaultChecked={false} />);

    const checkbox = screen.getByRole("checkbox", { name: "Caminar" });
    checkbox.focus();
    await user.keyboard("[Space]");

    expect(checkbox).toBeChecked();
  });
});
