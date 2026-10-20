import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorage = new Map<string, string>();
const setColorScheme = vi.fn();

vi.mock("react-native", () => ({ Appearance: { setColorScheme } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStorage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStorage.set(key, value);
    }),
  },
}));

const { applyStoredColorScheme, getColorSchemePreference, saveColorSchemePreference } =
  await import("./color-scheme-preference");

const KEY = "habit-tracker:color-scheme";

describe("color scheme preference", () => {
  beforeEach(() => {
    asyncStorage.clear();
    setColorScheme.mockClear();
  });

  it("follows the system when nothing is stored", async () => {
    expect(await getColorSchemePreference()).toBeNull();
    await applyStoredColorScheme();
    expect(setColorScheme).not.toHaveBeenCalled();
  });

  it("applies and persists the chosen scheme", async () => {
    await saveColorSchemePreference("dark");
    expect(setColorScheme).toHaveBeenCalledWith("dark");
    expect(asyncStorage.get(KEY)).toBe("dark");

    setColorScheme.mockClear();
    await applyStoredColorScheme();
    expect(setColorScheme).toHaveBeenCalledWith("dark");
  });

  it("ignores an unknown stored value", async () => {
    asyncStorage.set(KEY, "sepia");
    expect(await getColorSchemePreference()).toBeNull();
    await applyStoredColorScheme();
    expect(setColorScheme).not.toHaveBeenCalled();
  });
});
