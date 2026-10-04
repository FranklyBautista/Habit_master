import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { OtpCodeInput } from "./otp-code-input";

function OtpHarness() {
  const [code, setCode] = useState("");
  return (
    <>
      <label htmlFor="code">Código de verificación</label>
      <OtpCodeInput id="code" name="code" length={6} value={code} onChange={setCode} />
    </>
  );
}

function cells(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".otp-cell")).map(
    (cell) => cell.textContent,
  );
}

describe("OtpCodeInput", () => {
  it("exposes one labelled field and hides the decorative boxes", () => {
    const { container } = render(<OtpHarness />);

    const input = screen.getByLabelText("Código de verificación");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(container.querySelector(".otp-cells")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(cells(container)).toHaveLength(6);
  });

  it("draws each typed digit in its own box and ignores non-digits", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpHarness />);

    await user.type(screen.getByLabelText("Código de verificación"), "1a2 3");

    expect(screen.getByLabelText("Código de verificación")).toHaveValue("123");
    expect(cells(container)).toEqual(["1", "2", "3", "", "", ""]);
  });

  it("keeps only the first six digits of a pasted code", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpHarness />);

    await user.click(screen.getByLabelText("Código de verificación"));
    await user.paste(" 123-456-789 ");

    expect(screen.getByLabelText("Código de verificación")).toHaveValue("123456");
    expect(cells(container)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("deletes the last digit with backspace", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpHarness />);

    await user.type(screen.getByLabelText("Código de verificación"), "1234{Backspace}");

    expect(cells(container)).toEqual(["1", "2", "3", "", "", ""]);
  });

  it("highlights the box for the next digit only while focused", async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpHarness />);
    const active = () => container.querySelectorAll(".otp-cell[data-active]");

    expect(active()).toHaveLength(0);
    await user.type(screen.getByLabelText("Código de verificación"), "12");
    expect(active()).toHaveLength(1);
    expect(container.querySelectorAll(".otp-cell")[2]).toHaveAttribute("data-active");

    await user.tab();
    expect(active()).toHaveLength(0);
  });
});
