import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const notifications = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  cancelScheduledNotificationAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
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

const { petReminderPlan, syncPetReminder } = await import("./pet-reminder");
const { PET_REMINDER_ID, saveReminderSettings } = await import("./reminders");

// 12 de octubre, 15:30 en la hora del dispositivo.
const afternoon = new Date(2026, 9, 12, 15, 30);
const enabled = { enabled: true, reminders: [{ id: "default", hour: 9, minute: 0 }] };

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  storage.set("habit-tracker:reminder", JSON.stringify(enabled));
});

describe("petReminderPlan", () => {
  it("plans nothing when no pet is hungry", () => {
    expect(petReminderPlan([], afternoon)).toBeNull();
  });

  it("plans today at 20:00 naming the group", () => {
    const plan = petReminderPlan([{ name: "Familia" }], afternoon);
    expect(plan?.date).toEqual(new Date(2026, 9, 12, 20, 0));
    expect(plan?.body).toBe(
      "El pulpito de Familia tiene hambre: marca tus hábitos compartidos.",
    );
  });

  it("groups several hungry pets in one notice", () => {
    expect(petReminderPlan([{ name: "A" }, { name: "B" }], afternoon)?.body).toBe(
      "Los pulpitos de 2 grupos tienen hambre: marca tus hábitos compartidos.",
    );
  });

  it("does not plan once 20:00 has passed", () => {
    expect(petReminderPlan([{ name: "A" }], new Date(2026, 9, 12, 20, 0))).toBeNull();
  });
});

describe("syncPetReminder", () => {
  it("replaces the previous notice with one for today at 20:00", async () => {
    await syncPetReminder([{ name: "Familia" }], afternoon);

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      PET_REMINDER_ID,
    );
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: PET_REMINDER_ID,
        trigger: expect.objectContaining({
          type: "date",
          date: new Date(2026, 9, 12, 20, 0),
          channelId: "reminders",
        }),
      }),
    );
  });

  it("only cancels when the pet already ate", async () => {
    await syncPetReminder([], afternoon);
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      PET_REMINDER_ID,
    );
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("respects reminders turned off and never asks for permission", async () => {
    storage.set(
      "habit-tracker:reminder",
      JSON.stringify({ ...enabled, enabled: false }),
    );
    await syncPetReminder([{ name: "Familia" }], afternoon);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    storage.set("habit-tracker:reminder", JSON.stringify(enabled));
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    await syncPetReminder([{ name: "Familia" }], afternoon);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("is cancelled when daily reminders are turned off", async () => {
    await saveReminderSettings({ ...enabled, enabled: false });
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      PET_REMINDER_ID,
    );
  });
});
