import { describe, expect, it } from "vitest";

import {
  formatUserCode,
  groupProgressSchema,
  isValidUserCode,
  normalizeUserCode,
} from "./groups";

describe("user codes", () => {
  it("normalizes pasted codes like the database does", () => {
    expect(normalizeUserCode(" abcd-1234 ")).toBe("ABCD1234");
    expect(normalizeUserCode("h2m4 r8tn")).toBe("H2M4R8TN");
    expect(normalizeUserCode("iLoO-1234")).toBe("1100" + "1234");
  });

  it("accepts only 8 Crockford base32 characters", () => {
    expect(isValidUserCode("7k3p-9qxa")).toBe(true);
    expect(isValidUserCode("OOOO-IIII")).toBe(true);
    expect(isValidUserCode("UUUU-1234")).toBe(false);
    expect(isValidUserCode("ABC-123")).toBe(false);
    expect(isValidUserCode("ABCD-12345")).toBe(false);
    expect(isValidUserCode("")).toBe(false);
  });

  it("formats a code as XXXX-XXXX", () => {
    expect(formatUserCode("ABCD1234")).toBe("ABCD-1234");
    expect(formatUserCode("abcd-1234")).toBe("ABCD-1234");
    expect(formatUserCode("ABC")).toBe("ABC");
  });
});

describe("groupProgressSchema", () => {
  const progress = {
    id: "40000000-0000-4000-8000-000000000001",
    name: "Familia",
    myRole: "owner",
    members: [
      {
        memberId: "50000000-0000-4000-8000-000000000001",
        displayName: "Ana",
        role: "owner",
        isMe: true,
        today: "2026-10-10",
        habits: [
          {
            habitId: "60000000-0000-4000-8000-000000000001",
            name: "Meditar",
            color: "#047857",
            icon: "brain",
            startDate: "2026-09-01",
            archivePeriods: [{ from: "2026-09-10", to: "2026-09-12" }],
            checkinDates: ["2026-10-01", "2026-10-02"],
          },
        ],
      },
      {
        memberId: "50000000-0000-4000-8000-000000000002",
        displayName: "Sam",
        role: "member",
        isMe: false,
        today: "2026-10-11",
        habits: [
          {
            habitId: null,
            name: "Caminar",
            color: "#7C3AED",
            icon: "footprints",
            startDate: "2026-09-01",
            archivePeriods: [],
            checkinDates: [],
          },
        ],
      },
    ],
    pendingInvitations: [
      {
        id: "70000000-0000-4000-8000-000000000001",
        userCode: "7K3P9QXA",
        expiresAt: "2026-10-17T12:00:00.000Z",
      },
    ],
  };

  it("accepts a valid progress payload", () => {
    expect(groupProgressSchema.safeParse(progress).success).toBe(true);
  });

  it("rejects a color outside the palette", () => {
    const invalid = structuredClone(progress);
    invalid.members[1].habits[0].color = "#000000";
    expect(groupProgressSchema.safeParse(invalid).success).toBe(false);
  });
});
