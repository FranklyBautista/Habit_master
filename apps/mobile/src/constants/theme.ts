/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

// Dirección visual (rama feat/rediseno-visual): superficies casi negras con un
// acento lima, inspirada en apps de progreso modernas. Reglas para no volver a
// tener texto negro sobre negro:
// - `tint` es el acento para TEXTO e ICONOS sobre superficies. En oscuro es el
//   lima; en claro un oliva, porque el lima sobre blanco no se lee.
// - `accent` es el RELLENO (botones, chips, celdas llenas) y siempre lleva
//   `onAccent` encima, nunca "white".
// - Ningún icono ni TextInput se queda sin color: el valor por defecto del
//   sistema es negro y desaparece en modo oscuro.
export const Colors = {
  light: {
    text: "#121214",
    // Page sits on a light grey so white surfaces (cards, inputs) read as
    // raised. Before, page and cards were both near-white and blended.
    background: "#F2F3EF",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7E9E2",
    textSecondary: "#5D6068",
    border: "#E1E3DC",
    tint: "#4D7C0F",
    accent: "#C6F432",
    onAccent: "#121214",
    accentSoft: "rgba(132, 204, 22, 0.16)",
    danger: "#DC2626",
    inverse: "#121214",
    onInverse: "#F5F5F7",
  },
  dark: {
    text: "#F5F5F7",
    background: "#0B0B0C",
    backgroundElement: "#161618",
    backgroundSelected: "#222225",
    textSecondary: "#9C9CA4",
    border: "#26262A",
    tint: "#C6F432",
    accent: "#C6F432",
    onAccent: "#0B0B0C",
    accentSoft: "rgba(198, 244, 50, 0.14)",
    danger: "#F87171",
    inverse: "#F5F5F7",
    onInverse: "#0B0B0C",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
