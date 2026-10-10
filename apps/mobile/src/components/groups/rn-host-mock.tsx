import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

// Solo para tests: sustituye las primitivas de React Native por elementos host
// bajo jsdom (mismo enfoque que connection-banner.test.tsx), conservando lo que
// se puede afirmar — texto, rol, etiqueta accesible, estado y pulsaciones.
// Uso: vi.mock("react-native", async () => (await import("./rn-host-mock")).reactNativeHostMock)

type HostProps = {
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityState?: { checked?: boolean; disabled?: boolean; busy?: boolean };
  onPress?: () => void;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
};

function renderChildren(children: HostProps["children"]) {
  return typeof children === "function" ? children({ pressed: false }) : children;
}

function host(tag: string) {
  return function Host({ children, accessibilityRole, accessibilityLabel }: HostProps) {
    return createElement(
      tag,
      { role: accessibilityRole, "aria-label": accessibilityLabel },
      renderChildren(children),
    );
  };
}

export const reactNativeHostMock = {
  View: host("div"),
  Text: host("span"),
  ScrollView: host("div"),
  ActivityIndicator: () => createElement("progress"),
  Pressable: ({
    children,
    onPress,
    disabled,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
  }: HostProps) =>
    createElement(
      "button",
      {
        onClick: onPress,
        disabled,
        role: accessibilityRole === "checkbox" ? "checkbox" : undefined,
        "aria-checked":
          accessibilityRole === "checkbox"
            ? Boolean(accessibilityState?.checked)
            : undefined,
        "aria-label": accessibilityLabel,
      },
      renderChildren(children),
    ),
  TextInput: ({ accessibilityLabel, value, onChangeText }: HostProps) =>
    createElement("input", {
      "aria-label": accessibilityLabel,
      value,
      onChange: (event: { target: { value: string } }) =>
        onChangeText?.(event.target.value),
    }),
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: <T,>(styles: T) => styles,
  },
  Platform: {
    OS: "android",
    select: (options: Record<string, unknown>) => options.default,
  },
  Share: { share: vi.fn() },
  Alert: { alert: vi.fn() },
  useColorScheme: () => "light",
};
