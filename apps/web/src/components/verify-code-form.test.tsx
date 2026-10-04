import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(auth)/actions", () => ({
  verifyCode: vi.fn(async () => ({})),
  resendCode: vi.fn(async () => ({ message: "Te enviamos un código nuevo." })),
}));

const { VerifyCodeForm } = await import("./verify-code-form");

describe("VerifyCodeForm", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends the email and type along with the code", () => {
    const { container } = render(
      <VerifyCodeForm email="ana@example.test" type="recovery" />,
    );

    expect(container.querySelector('input[name="email"]')).toHaveValue(
      "ana@example.test",
    );
    expect(container.querySelector('input[name="type"]')).toHaveValue("recovery");
    expect(screen.getByLabelText("Código de verificación")).toHaveAttribute(
      "name",
      "code",
    );
  });

  it("holds the resend button until the cooldown runs out", () => {
    render(<VerifyCodeForm email="ana@example.test" type="signup" />);

    const resend = screen.getByRole("button", { name: /Reenviar código en 60 s/ });
    expect(resend).toBeDisabled();

    act(() => vi.advanceTimersByTime(1_000));
    expect(
      screen.getByRole("button", { name: /Reenviar código en 59 s/ }),
    ).toBeDisabled();

    for (let second = 0; second < 59; second += 1) {
      act(() => vi.advanceTimersByTime(1_000));
    }
    expect(screen.getByRole("button", { name: "Reenviar código" })).toBeEnabled();
  });
});
