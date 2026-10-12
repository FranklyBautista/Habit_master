import { describe, expect, it } from "vitest";

import { addDaysToDateKey, getDateRange } from "./dates";
import { getGroupPetState, getPetStage, petMealsNeeded } from "./group-pet";
import type { GroupMemberProgress, GroupProgress, SharedHabit } from "./groups";

const today = "2026-10-12";

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

let memberCount = 0;
function member(overrides: Partial<GroupMemberProgress> = {}): GroupMemberProgress {
  memberCount += 1;
  return {
    memberId: `10000000-0000-4000-8000-${String(memberCount).padStart(12, "0")}`,
    displayName: `Miembro ${memberCount}`,
    role: "member",
    isMe: false,
    today,
    habits: [],
    ...overrides,
  };
}

function group(members: GroupMemberProgress[]): GroupProgress {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Familia",
    myRole: "owner",
    members,
    pendingInvitations: [],
  };
}

/** Días `from..to` (inclusive) contando hacia atrás desde hoy. */
function daysAgo(from: number, to = 0): string[] {
  return getDateRange(addDaysToDateKey(today, -from), addDaysToDateKey(today, -to));
}

describe("petMealsNeeded", () => {
  it("needs half of the participants rounded up", () => {
    expect([1, 2, 3, 4, 5].map(petMealsNeeded)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe("getPetStage", () => {
  it("grows at 3, 7 and 30 days of best streak", () => {
    expect(getPetStage(0)).toBe("cria");
    expect(getPetStage(2)).toBe("cria");
    expect(getPetStage(3)).toBe("pequena");
    expect(getPetStage(6)).toBe("pequena");
    expect(getPetStage(7)).toBe("joven");
    expect(getPetStage(29)).toBe("joven");
    expect(getPetStage(30)).toBe("adulta");
  });
});

describe("getGroupPetState", () => {
  it("sleeps when nobody shares an active habit today", () => {
    const state = getGroupPetState(group([member({ isMe: true })]));
    expect(state.mood).toBe("dormida");
    expect(state.stage).toBe("cria");
    expect(state.currentStreak).toBe(0);
    expect(state.last7Days).toHaveLength(7);
    expect(state.last7Days.every((day) => !day.counted)).toBe(true);
  });

  it("is hungry before eating for the first time and happy once half the group is up to date", () => {
    const me = member({ isMe: true, habits: [sharedHabit({ startDate: today })] });
    const other = member({ habits: [sharedHabit({ startDate: today })] });
    expect(getGroupPetState(group([me, other])).mood).toBe("hambrienta");

    const fed = getGroupPetState(
      group([
        { ...me, habits: [sharedHabit({ startDate: today, checkinDates: [today] })] },
        other,
      ]),
    );
    expect(fed.mood).toBe("contenta");
    expect(fed.todayDay).toMatchObject({
      fed: true,
      feast: false,
      participating: 2,
      upToDate: 1,
      needed: 1,
    });
    expect(fed.currentStreak).toBe(1);
  });

  it("requires every active shared habit of a member to count them as up to date", () => {
    const me = member({
      isMe: true,
      habits: [
        sharedHabit({ checkinDates: [today] }),
        sharedHabit({ name: "Leer", checkinDates: [] }),
      ],
    });
    expect(getGroupPetState(group([me])).todayDay.upToDate).toBe(0);
  });

  it("does not break the streak today and counts the run up to yesterday", () => {
    const me = member({
      isMe: true,
      habits: [sharedHabit({ startDate: daysAgo(5)[0], checkinDates: daysAgo(5, 1) })],
    });
    const state = getGroupPetState(group([me]));
    expect(state.mood).toBe("hambrienta");
    expect(state.currentStreak).toBe(5);
    expect(state.bestStreak).toBe(5);
    expect(state.stage).toBe("pequena");
    expect(state.nextStage).toEqual({ stage: "joven", remainingDays: 2 });
  });

  it("gets sad after a broken streak but keeps the stage it reached", () => {
    const me = member({
      isMe: true,
      habits: [
        sharedHabit({ startDate: daysAgo(12)[0], checkinDates: daysAgo(12, 3) }),
      ],
    });
    const state = getGroupPetState(group([me]));
    expect(state.mood).toBe("triste");
    expect(state.currentStreak).toBe(0);
    expect(state.bestStreak).toBe(10);
    expect(state.stage).toBe("joven");
    expect(state.nextStage).toEqual({ stage: "adulta", remainingDays: 30 });
  });

  it("skips days without participants instead of breaking the streak", () => {
    const me = member({
      isMe: true,
      habits: [
        sharedHabit({
          startDate: daysAgo(4)[0],
          archivePeriods: [{ from: daysAgo(2)[0], to: daysAgo(1)[0] }],
          checkinDates: [...daysAgo(4, 3), today],
        }),
      ],
    });
    const state = getGroupPetState(group([me]));
    // Hace 2 días el hábito estaba archivado (neutro); ayer no se marcó.
    expect(state.last7Days.find((day) => day.date === daysAgo(2)[0])?.counted).toBe(
      false,
    );
    expect(state.currentStreak).toBe(1);
    expect(state.bestStreak).toBe(2);
  });

  it("marks a feast when everyone is up to date", () => {
    const members = [true, false, false].map((isMe) =>
      member({ isMe, habits: [sharedHabit({ checkinDates: [today] })] }),
    );
    expect(getGroupPetState(group(members)).todayDay.feast).toBe(true);
  });

  it("uses the viewer's day and ignores members whose day has not started yet", () => {
    const me = member({
      isMe: true,
      today,
      habits: [sharedHabit({ checkinDates: [today] })],
    });
    const behind = member({
      today: addDaysToDateKey(today, -1),
      habits: [sharedHabit({ checkinDates: [] })],
    });
    const state = getGroupPetState(group([me, behind]));
    expect(state.today).toBe(today);
    expect(state.todayDay.participating).toBe(1);
    expect(state.mood).toBe("contenta");
  });

  it("reaches adulthood with a 30-day streak", () => {
    const me = member({
      isMe: true,
      habits: [sharedHabit({ startDate: daysAgo(29)[0], checkinDates: daysAgo(29) })],
    });
    const state = getGroupPetState(group([me]));
    expect(state.stage).toBe("adulta");
    expect(state.currentStreak).toBe(30);
    expect(state.nextStage).toBeNull();
  });
});
