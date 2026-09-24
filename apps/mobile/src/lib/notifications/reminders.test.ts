import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const scheduled = new Set<string>();
const notifications = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
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
vi.stubGlobal("__DEV__", false);

const {
  getReminderSettings,
  hasReminderPermission,
  parseStoredSettings,
  requestReminderPermission,
  saveReminderSettings,
} = await import("./reminders");

type ScheduleRequest = {
  identifier: string;
  trigger: { hour: number; minute: number };
};
const scheduledRequests = () =>
  notifications.scheduleNotificationAsync.mock.calls.map(
    ([request]) => request as ScheduleRequest,
  );

beforeEach(() => {
  storage.clear();
  scheduled.clear();
  vi.clearAllMocks();
  // Fake OS scheduler: keeps track of which identifiers are pending.
  notifications.getAllScheduledNotificationsAsync.mockImplementation(async () =>
    [...scheduled].map((identifier) => ({ identifier })),
  );
  notifications.cancelScheduledNotificationAsync.mockImplementation(
    async (identifier: string) => void scheduled.delete(identifier),
  );
  notifications.scheduleNotificationAsync.mockImplementation(
    async ({ identifier }: { identifier: string }) => {
      scheduled.add(identifier);
      return identifier;
    },
  );
});

describe("parseStoredSettings", () => {
  it("defaults to disabled with one reminder at 20:00", () => {
    expect(parseStoredSettings(null)).toEqual({
      enabled: false,
      reminders: [{ id: "default", hour: 20, minute: 0 }],
    });
  });

  it("migrates the single-reminder format", () => {
    expect(
      parseStoredSettings(JSON.stringify({ enabled: true, hour: 8, minute: 30 })),
    ).toEqual({ enabled: true, reminders: [{ id: "default", hour: 8, minute: 30 }] });
  });

  it("falls back to the default on corrupt or out-of-range data", () => {
    expect(parseStoredSettings("{not json").enabled).toBe(false);
    expect(
      parseStoredSettings(
        JSON.stringify({
          enabled: true,
          reminders: [{ id: "a", hour: 25, minute: 0 }],
        }),
      ).enabled,
    ).toBe(false);
  });
});

describe("saveReminderSettings", () => {
  it("schedules one daily notification per reminder on the Android channel", async () => {
    await saveReminderSettings({
      enabled: true,
      reminders: [
        { id: "b", hour: 21, minute: 30 },
        { id: "a", hour: 8, minute: 0 },
      ],
    });

    expect(scheduledRequests()).toEqual([
      expect.objectContaining({
        identifier: "habit-tracker-reminder-a",
        trigger: { type: "daily", channelId: "reminders", hour: 8, minute: 0 },
      }),
      expect.objectContaining({
        identifier: "habit-tracker-reminder-b",
        trigger: { type: "daily", channelId: "reminders", hour: 21, minute: 30 },
      }),
    ]);
    await expect(getReminderSettings()).resolves.toMatchObject({ enabled: true });
  });

  it("replaces previous reminders, including the legacy single one", async () => {
    scheduled.add("habit-tracker-daily-reminder");
    scheduled.add("someone-else");
    await saveReminderSettings({
      enabled: true,
      reminders: [
        { id: "a", hour: 8, minute: 0 },
        { id: "b", hour: 9, minute: 0 },
      ],
    });
    await saveReminderSettings({
      enabled: true,
      reminders: [{ id: "b", hour: 9, minute: 0 }],
    });

    expect([...scheduled].sort()).toEqual(["habit-tracker-reminder-b", "someone-else"]);
  });

  it("only cancels when disabled", async () => {
    scheduled.add("habit-tracker-reminder-a");
    await saveReminderSettings({
      enabled: false,
      reminders: [{ id: "a", hour: 8, minute: 0 }],
    });

    expect(scheduled.size).toBe(0);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("rejects invalid settings without touching the schedule", async () => {
    scheduled.add("habit-tracker-reminder-a");
    await expect(
      saveReminderSettings({ enabled: true, reminders: [] }),
    ).rejects.toThrow();
    expect([...scheduled]).toEqual(["habit-tracker-reminder-a"]);
  });

  it("applies rapid consecutive changes in the order they were requested", async () => {
    let releaseFirst!: () => void;
    notifications.getAllScheduledNotificationsAsync.mockImplementationOnce(
      () => new Promise((resolve) => (releaseFirst = () => resolve([]))),
    );

    const first = saveReminderSettings({
      enabled: true,
      reminders: [{ id: "a", hour: 8, minute: 0 }],
    });
    const second = saveReminderSettings({
      enabled: true,
      reminders: [{ id: "a", hour: 9, minute: 0 }],
    });
    await vi.waitFor(() =>
      expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledOnce(),
    );
    // El segundo cambio no puede empezar mientras el primero siga en curso.
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    releaseFirst();
    await Promise.all([first, second]);

    expect(scheduledRequests().map((r) => r.trigger.hour)).toEqual([8, 9]);
  });

  it("keeps processing after a failed change", async () => {
    notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error("boom"));
    const settings = { enabled: true, reminders: [{ id: "a", hour: 8, minute: 0 }] };

    await expect(saveReminderSettings(settings)).rejects.toThrow("boom");
    await expect(saveReminderSettings(settings)).resolves.toBeUndefined();
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
