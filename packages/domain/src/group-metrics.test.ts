import { describe, expect, it } from "vitest";

import type { Habit, HabitCheckin } from "./entities";
import {
  getGroupTodaySummary,
  getMemberTodayStatus,
  getSharedHabitStatus,
  isSharedHabitActiveOnDate,
} from "./group-metrics";
import type { GroupMemberProgress, GroupProgress, SharedHabit } from "./groups";
import { calculateStreaks } from "./metrics";

function sharedHabit(overrides: Partial<SharedHabit> = {}): SharedHabit {
  return {
    habitId: null,
    name: "Caminar",
    color: "#047857",
    icon: "footprints",
    startDate: "2026-10-01",
    archivePeriods: [],
    checkinDates: [],
    ...overrides,
  };
}

function member(overrides: Partial<GroupMemberProgress> = {}): GroupMemberProgress {
  return {
    memberId: "10000000-0000-4000-8000-000000000001",
    displayName: "Ana",
    role: "member",
    isMe: false,
    today: "2026-10-10",
    habits: [],
    ...overrides,
  };
}

describe("isSharedHabitActiveOnDate", () => {
  const habit = sharedHabit({
    archivePeriods: [{ from: "2026-10-04", to: "2026-10-06" }],
  });

  it("does not count days before the start date", () => {
    expect(isSharedHabitActiveOnDate(habit, "2026-09-30")).toBe(false);
    expect(isSharedHabitActiveOnDate(habit, "2026-10-01")).toBe(true);
  });

  it("excludes the archive day and includes the restore day", () => {
    expect(isSharedHabitActiveOnDate(habit, "2026-10-03")).toBe(true);
    expect(isSharedHabitActiveOnDate(habit, "2026-10-04")).toBe(false);
    expect(isSharedHabitActiveOnDate(habit, "2026-10-05")).toBe(false);
    expect(isSharedHabitActiveOnDate(habit, "2026-10-06")).toBe(true);
  });

  it("ignores an empty period archived and restored the same day", () => {
    const sameDay = sharedHabit({
      archivePeriods: [{ from: "2026-10-04", to: "2026-10-04" }],
    });
    expect(isSharedHabitActiveOnDate(sameDay, "2026-10-04")).toBe(true);
  });
});

describe("getSharedHabitStatus", () => {
  it("handles a habit that starts today", () => {
    const status = getSharedHabitStatus(
      sharedHabit({ startDate: "2026-10-10", checkinDates: ["2026-10-10"] }),
      "2026-10-10",
    );
    expect(status.activeToday).toBe(true);
    expect(status.completedToday).toBe(true);
    expect(status.streak).toEqual({ current: 1, best: 1 });
    expect(status.activeInLast7).toBe(1);
    expect(status.completedInLast7).toBe(1);
  });

  it("keeps the streak while today is still unmarked", () => {
    const status = getSharedHabitStatus(
      sharedHabit({ checkinDates: ["2026-10-07", "2026-10-08", "2026-10-09"] }),
      "2026-10-10",
    );
    expect(status.completedToday).toBe(false);
    expect(status.streak.current).toBe(3);
  });

  it("breaks the streak at a missed day", () => {
    const status = getSharedHabitStatus(
      sharedHabit({
        checkinDates: [
          "2026-10-01",
          "2026-10-02",
          "2026-10-03",
          "2026-10-04",
          "2026-10-06",
          "2026-10-07",
        ],
      }),
      "2026-10-07",
    );
    expect(status.streak).toEqual({ current: 2, best: 4 });
  });

  it("does not break the streak across an archive period", () => {
    const status = getSharedHabitStatus(
      sharedHabit({
        archivePeriods: [{ from: "2026-10-03", to: "2026-10-05" }],
        checkinDates: ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06"],
      }),
      "2026-10-06",
    );
    expect(status.streak).toEqual({ current: 4, best: 4 });
  });

  it("lists the last 7 days in order with their state", () => {
    const status = getSharedHabitStatus(
      sharedHabit({
        startDate: "2026-10-05",
        archivePeriods: [{ from: "2026-10-07", to: "2026-10-08" }],
        checkinDates: ["2026-10-05", "2026-10-08", "2026-10-10"],
      }),
      "2026-10-10",
    );
    expect(status.last7Days).toEqual([
      { date: "2026-10-04", active: false, completed: false },
      { date: "2026-10-05", active: true, completed: true },
      { date: "2026-10-06", active: true, completed: false },
      { date: "2026-10-07", active: false, completed: false },
      { date: "2026-10-08", active: true, completed: true },
      { date: "2026-10-09", active: true, completed: false },
      { date: "2026-10-10", active: true, completed: true },
    ]);
    expect(status.activeInLast7).toBe(5);
    expect(status.completedInLast7).toBe(3);
  });

  it("matches the owner streak from calculateStreaks in their timezone", () => {
    // El dueño vive en Ciudad de México; el servidor convierte su periodo de
    // archivado a fechas locales con esa misma zona.
    const timezone = "America/Mexico_City";
    const ownerHabit: Habit = {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Meditar",
      description: "privado",
      color: "#0369A1",
      icon: "brain",
      frequency: "daily",
      startDate: "2026-09-20",
      position: 0,
      archivedAt: null,
      archivePeriods: [
        // 2026-09-25 22:00 y 2026-09-28 01:30 en Ciudad de México (UTC-6).
        {
          archivedAt: "2026-09-26T04:00:00.000Z",
          restoredAt: "2026-09-28T07:30:00.000Z",
        },
      ],
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-28T07:30:00.000Z",
    };
    const checkinDates = [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-28",
      "2026-09-29",
      "2026-10-01",
      "2026-10-02",
    ];
    const ownerCheckins: HabitCheckin[] = checkinDates.map((checkinDate, index) => ({
      id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      habitId: ownerHabit.id,
      checkinDate,
      completedAt: `${checkinDate}T15:00:00.000Z`,
    }));
    const today = "2026-10-03";

    const ownerStreak = calculateStreaks(today, {
      habits: [ownerHabit],
      checkins: ownerCheckins,
      timezone,
    });
    const groupStatus = getSharedHabitStatus(
      sharedHabit({
        startDate: ownerHabit.startDate,
        archivePeriods: [{ from: "2026-09-25", to: "2026-09-28" }],
        checkinDates,
      }),
      today,
    );

    expect(groupStatus.streak).toEqual(ownerStreak);
    expect(groupStatus.streak).toEqual({ current: 2, best: 6 });
  });
});

describe("getMemberTodayStatus", () => {
  it("reports a member who shares nothing", () => {
    expect(getMemberTodayStatus(member())).toEqual({
      sharesHabits: false,
      activeToday: 0,
      completedToday: 0,
      upToDate: false,
    });
  });

  it("uses the member own today", () => {
    const status = getMemberTodayStatus(
      member({
        today: "2026-10-09",
        habits: [
          sharedHabit({ checkinDates: ["2026-10-09"] }),
          sharedHabit({ name: "Leer", checkinDates: ["2026-10-09", "2026-10-10"] }),
        ],
      }),
    );
    expect(status).toEqual({
      sharesHabits: true,
      activeToday: 2,
      completedToday: 2,
      upToDate: true,
    });
  });

  it("is not up to date with one habit pending", () => {
    const status = getMemberTodayStatus(
      member({
        habits: [
          sharedHabit({ checkinDates: ["2026-10-10"] }),
          sharedHabit({ name: "Leer" }),
        ],
      }),
    );
    expect(status.upToDate).toBe(false);
    expect(status.completedToday).toBe(1);
  });

  it("ignores habits that are archived today or have not started", () => {
    const status = getMemberTodayStatus(
      member({
        habits: [
          sharedHabit({ archivePeriods: [{ from: "2026-10-10", to: "2026-10-11" }] }),
          sharedHabit({ startDate: "2026-10-11" }),
        ],
      }),
    );
    expect(status).toEqual({
      sharesHabits: true,
      activeToday: 0,
      completedToday: 0,
      upToDate: false,
    });
  });
});

describe("getGroupTodaySummary", () => {
  it("counts up-to-date members among those with active habits today", () => {
    const progress: GroupProgress = {
      id: "40000000-0000-4000-8000-000000000001",
      name: "Familia",
      myRole: "owner",
      pendingInvitations: [],
      members: [
        member({
          isMe: true,
          role: "owner",
          habits: [sharedHabit({ checkinDates: ["2026-10-10"] })],
        }),
        member({ displayName: "Sam", habits: [sharedHabit()] }),
        member({ displayName: "Luz" }),
      ],
    };
    expect(getGroupTodaySummary(progress)).toEqual({ upToDate: 1, participating: 2 });
  });
});
