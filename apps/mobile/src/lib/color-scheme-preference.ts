import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

const STORAGE_KEY = "habit-tracker:color-scheme";

export type ColorSchemePreference = "light" | "dark";

function parsePreference(value: string | null): ColorSchemePreference | null {
  return value === "light" || value === "dark" ? value : null;
}

// Sin preferencia guardada la app sigue el modo del sistema
// (`userInterfaceStyle: "automatic"` en app.json).
export async function getColorSchemePreference(): Promise<ColorSchemePreference | null> {
  return parsePreference(await AsyncStorage.getItem(STORAGE_KEY));
}

// Appearance.setColorScheme cambia lo que devuelve useColorScheme() en toda la
// app, así que cada pantalla que lee el tema se repinta sin más cambios.
export async function applyStoredColorScheme(): Promise<void> {
  const stored = await getColorSchemePreference();
  if (stored) Appearance.setColorScheme(stored);
}

export async function saveColorSchemePreference(
  scheme: ColorSchemePreference,
): Promise<void> {
  Appearance.setColorScheme(scheme);
  await AsyncStorage.setItem(STORAGE_KEY, scheme);
}
