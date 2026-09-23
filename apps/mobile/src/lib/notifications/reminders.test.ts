import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const notifications = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => notifications);
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => void storage.set(key, value)),
  },
}));

const {
  getReminderPreference,
  hasReminderPermission,
  requestReminderPermission,
  setReminderPreference,
} = await import("./reminders");

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

describe("getReminderPreference", () => {
  it("defaults to disabled at 20:00 when nothing is stored", async () => {
    await expect(getReminderPreference()).resolves.toEqual({
      enabled: false,
      hour: 20,
      minute: 0,
    });
  });

  it("falls back to the default when the stored value is corrupt", async () => {
    storage.set("habit-tracker:reminder", "{not json");
    await expect(getReminderPreference()).resolves.toMatchObject({ enabled: false });
  });

  it("round-trips a saved preference", async () => {
    await setReminderPreference({ enabled: false, hour: 8, minute: 0 });
    await expect(getReminderPreference()).resolves.toEqual({
      enabled: false,
      hour: 8,
      minute: 0,
    });
  });
});

describe("setReminderPreference", () => {
  it("replaces the single daily reminder on the Android channel", async () => {
    await setReminderPreference({ enabled: true, hour: 21, minute: 30 });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "habit-tracker-daily-reminder",
    );
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "reminders",
      expect.any(Object),
    );
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "habit-tracker-daily-reminder",
        trigger: { type: "daily", channelId: "reminders", hour: 21, minute: 30 },
      }),
    );
  });

  it("only cancels when disabled", async () => {
    await setReminderPreference({ enabled: false, hour: 20, minute: 0 });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledOnce();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe("permissions", () => {
  it("does not prompt when permission is already granted", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true });

    await expect(requestReminderPermission()).resolves.toBe(true);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("creates the Android channel before prompting and reports a denial", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(requestReminderPermission()).resolves.toBe(false);
    const channelOrder =
      notifications.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const promptOrder =
      notifications.requestPermissionsAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(promptOrder!);
  });

  it("hasReminderPermission reflects the OS permission without prompting", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(hasReminderPermission()).resolves.toBe(false);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
