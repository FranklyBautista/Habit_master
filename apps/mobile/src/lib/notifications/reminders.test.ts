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
  getNextTriggerDateAsync: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", TIME_INTERVAL: "timeInterval" },
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
  getNextReminderDate,
  getReminderSettings,
  hasReminderPermission,
  parseStoredSettings,
  reapplyReminderSettings,
  requestReminderPermission,
  saveReminderSettings,
  scheduleTestReminder,
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

describe("reapplyReminderSettings", () => {
  const settings = {
    enabled: true,
    reminders: [{ id: "a", hour: 8, minute: 15 }],
  };

  it("reschedules the stored reminders when enabled and permitted", async () => {
    await saveReminderSettings(settings);
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    notifications.scheduleNotificationAsync.mockClear();

    await reapplyReminderSettings();

    expect(scheduledRequests()).toEqual([
      expect.objectContaining({
        identifier: "habit-tracker-reminder-a",
        trigger: expect.objectContaining({ hour: 8, minute: 15 }),
      }),
    ]);
  });

  it("does nothing when reminders are off or permission was revoked", async () => {
    await saveReminderSettings(settings);
    notifications.scheduleNotificationAsync.mockClear();
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });

    await reapplyReminderSettings();

    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("reapplies the latest saved settings, not an older read", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    const saving = saveReminderSettings(settings);
    const reapplying = reapplyReminderSettings();
    const changing = saveReminderSettings({
      enabled: true,
      reminders: [{ id: "b", hour: 21, minute: 0 }],
    });
    await Promise.all([saving, reapplying, changing]);

    expect([...scheduled]).toEqual(["habit-tracker-reminder-b"]);
  });
});

describe("scheduleTestReminder", () => {
  it("schedules a one-off notification a minute ahead on the reminders channel", async () => {
    const before = Date.now();
    const at = await scheduleTestReminder();

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "constancia-test-reminder",
        trigger: { type: "timeInterval", channelId: "reminders", seconds: 60 },
      }),
    );
    expect(at.getTime()).toBeGreaterThanOrEqual(before + 60_000);
  });

  it("is not cancelled when the daily reminders are rescheduled", async () => {
    await scheduleTestReminder();
    await saveReminderSettings({
      enabled: false,
      reminders: [{ id: "a", hour: 8, minute: 0 }],
    });

    expect(scheduled.has("constancia-test-reminder")).toBe(true);
  });
});

describe("getNextReminderDate", () => {
  it("returns the earliest next trigger of the daily reminders in the system", async () => {
    notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: "habit-tracker-reminder-a",
        trigger: { type: "daily", hour: 20, minute: 0 },
      },
      {
        identifier: "habit-tracker-reminder-b",
        trigger: { type: "daily", hour: 7, minute: 30 },
      },
      {
        identifier: "constancia-test-reminder",
        trigger: { type: "timeInterval", seconds: 60 },
      },
    ]);
    notifications.getNextTriggerDateAsync.mockImplementation(
      async ({ hour }: { hour: number }) => (hour === 20 ? 2_000 : 1_000),
    );

    await expect(getNextReminderDate()).resolves.toEqual(new Date(1_000));
    expect(notifications.getNextTriggerDateAsync).toHaveBeenCalledTimes(2);
  });

  it("returns null when the system has no daily reminder scheduled", async () => {
    notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);

    await expect(getNextReminderDate()).resolves.toBeNull();
  });
});
