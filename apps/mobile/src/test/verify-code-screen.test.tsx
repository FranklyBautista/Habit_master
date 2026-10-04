import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VerifyCodeScreen from "@/app/(auth)/verificar";

// Lives outside src/app on purpose: Expo Router turns every .tsx under src/app
// into a route, test files included. Same host-element approach as
// connection-banner.test.tsx for the React Native primitives.
type RNProps = {
  children?: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
};

const { auth, router, params } = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn() },
  router: { replace: vi.fn() },
  params: { current: {} as { email?: string; type?: string } },
}));

vi.mock("react-native", () => ({
  Pressable: ({ children, onPress, disabled, accessibilityLabel }: RNProps) =>
    createElement(
      "button",
      { onClick: onPress, disabled, "aria-label": accessibilityLabel },
      children,
    ),
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: ({ children }: RNProps) =>
    createElement("div", { "data-testid": "view" }, children),
  TextInput: ({ accessibilityLabel, value, onChangeText }: RNProps) =>
    createElement("input", {
      "aria-label": accessibilityLabel,
      value,
      onChange: (event: { target: { value: string } }) =>
        onChangeText?.(event.target.value),
    }),
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: RNProps) => createElement("div", null, children),
}));
vi.mock("@/components/themed-view", () => ({
  ThemedView: ({ children }: RNProps) => createElement("div", null, children),
}));
vi.mock("@/components/themed-text", () => ({
  ThemedText: ({ children, accessibilityRole }: RNProps) =>
    createElement("span", { role: accessibilityRole }, children),
}));
vi.mock("@/lib/auth/form-styles", () => ({ authFormStyles: {} }));
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ backgroundElement: "#fff", border: "#ccc", tint: "#0a0" }),
}));
vi.mock("@/constants/theme", () => ({ Spacing: { two: 8 } }));
vi.mock("@/lib/auth/redirect", () => ({
  getMobileAuthRedirect: (next: string) => `habittracker://auth/confirm?next=${next}`,
}));
vi.mock("@/lib/supabase/client", () => ({ supabase: { auth } }));
vi.mock("expo-router", () => ({
  Link: ({ children }: RNProps) => createElement("a", null, children),
  useLocalSearchParams: () => params.current,
  useRouter: () => router,
}));

const codeInput = () => screen.getByLabelText("Código de verificación");
const verifyButton = () => screen.getByLabelText("Verificar código");
const resendButton = () =>
  screen.getByLabelText("Reenviar código") as HTMLButtonElement;

function renderScreen(type: string, email = "ana@example.com") {
  params.current = { email, type };
  render(<VerifyCodeScreen />);
}

describe("VerifyCodeScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.resend.mockResolvedValue({ error: null });
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a signup code and enters the app", async () => {
    renderScreen("signup");
    fireEvent.change(codeInput(), { target: { value: " 123456 " } });
    fireEvent.click(verifyButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(app)"));
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "ana@example.com",
      token: "123456",
      type: "signup",
    });
  });

  it("sends a verified recovery code to the new-password screen", async () => {
    renderScreen("recovery");
    fireEvent.change(codeInput(), { target: { value: "654321" } });
    fireEvent.click(verifyButton());

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/(auth)/actualizar-contrasena"),
    );
    expect(auth.verifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({ type: "recovery" }),
    );
  });

  it("shows one digit per box and ignores non-digits and extra characters", () => {
    renderScreen("signup");
    fireEvent.change(codeInput(), { target: { value: "1a2 3-4567890" } });

    expect((codeInput() as HTMLInputElement).value).toBe("123456");
    const boxes = screen
      .getAllByTestId("view")
      .filter((view) => view.children.length === 1 && view.textContent?.length === 1);
    expect(boxes.map((box) => box.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("rejects a malformed code without calling Supabase", () => {
    renderScreen("signup");
    fireEvent.change(codeInput(), { target: { value: "12ab" } });
    fireEvent.click(verifyButton());

    expect(screen.getByRole("alert").textContent).toContain("código de 6 dígitos");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("explains an expired or wrong code and stays on the screen", async () => {
    auth.verifyOtp.mockResolvedValue({
      error: { message: "Token has expired or is invalid" },
    });
    renderScreen("signup");
    fireEvent.change(codeInput(), { target: { value: "000000" } });
    fireEvent.click(verifyButton());

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("ha caducado"),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("only allows resending after the cooldown, then restarts it", async () => {
    vi.useFakeTimers();
    renderScreen("signup");
    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).toContain("60 s");

    for (let second = 0; second < 60; second++) {
      act(() => vi.advanceTimersByTime(1000));
    }
    expect(resendButton().disabled).toBe(false);

    await act(async () => {
      fireEvent.click(resendButton());
    });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ana@example.com",
      options: { emailRedirectTo: "habittracker://auth/confirm?next=/(app)" },
    });
    expect(screen.getByText("Te enviamos un código nuevo.")).toBeTruthy();
    expect(resendButton().disabled).toBe(true);
  });

  it("resends a recovery code through the password-reset email", async () => {
    vi.useFakeTimers();
    renderScreen("recovery");
    for (let second = 0; second < 60; second++) {
      act(() => vi.advanceTimersByTime(1000));
    }
    await act(async () => {
      fireEvent.click(resendButton());
    });

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("ana@example.com", {
      redirectTo: "habittracker://auth/confirm?next=/(auth)/actualizar-contrasena",
    });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("refuses to verify without an email or a known type", () => {
    renderScreen("magiclink");
    expect(screen.getByText("No se pudo abrir la verificación.")).toBeTruthy();
    expect(screen.queryByLabelText("Código de verificación")).toBeNull();
  });
});
