import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionBanner } from "./connection-banner";

// Render the banner under jsdom by swapping the React Native primitives it uses
// for plain host elements. Enough to assert what the person actually sees:
// which message, and whether "Reintentar" is offered.
type RNProps = {
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  style?: unknown;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityLiveRegion?: string;
  onPress?: () => void;
  disabled?: boolean;
};

function renderChildren(children: RNProps["children"]) {
  return typeof children === "function" ? children({ pressed: false }) : children;
}

const { store } = vi.hoisted(() => ({
  store: {
    snapshot: { online: true, error: null as string | null, syncing: false },
    actions: { refresh: vi.fn() },
  },
}));

vi.mock("react-native", () => ({
  View: ({ children, accessibilityRole, accessibilityLabel }: RNProps) =>
    createElement(
      "div",
      { role: accessibilityRole, "aria-label": accessibilityLabel },
      renderChildren(children),
    ),
  Text: ({ children }: RNProps) =>
    createElement("span", null, renderChildren(children)),
  Pressable: ({ children, onPress, disabled, accessibilityLabel }: RNProps) =>
    createElement(
      "button",
      { onClick: onPress, disabled, "aria-label": accessibilityLabel },
      renderChildren(children),
    ),
  StyleSheet: { create: <T,>(styles: T) => styles },
  Platform: {
    OS: "web",
    select: (options: Record<string, unknown>) => options.default,
  },
  useColorScheme: () => "light",
}));
vi.mock("lucide-react-native", () => ({
  CloudOff: () => null,
  RefreshCw: () => null,
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/lib/habit-store", () => ({
  useHabitStore: () => store.snapshot,
  useHabitActions: () => store.actions,
}));

describe("ConnectionBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.snapshot = { online: true, error: null, syncing: false };
  });

  it("renders nothing while online with no sync error", () => {
    const { container } = render(<ConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an offline notice without a retry action", () => {
    store.snapshot = { online: false, error: null, syncing: false };
    render(<ConnectionBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the sync error with a working retry button", () => {
    store.snapshot = { online: true, error: "No se pudo sincronizar.", syncing: false };
    render(<ConnectionBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo sincronizar.");
    screen.getByRole("button", { name: "Reintentar sincronización" }).click();
    expect(store.actions.refresh).toHaveBeenCalledOnce();
  });

  it("disables the retry button while a retry is in flight", () => {
    store.snapshot = { online: true, error: "Falló.", syncing: true };
    render(<ConnectionBanner />);

    const button = screen.getByRole("button", { name: "Reintentar sincronización" });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Reintentando…");
  });
});
