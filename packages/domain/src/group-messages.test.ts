import { describe, expect, it } from "vitest";

import {
  compareGroupMessages,
  countMessageCharacters,
  createGroupMessageId,
  formatGroupMessageTime,
  type GroupMessage,
  groupMessageBodySchema,
  groupMessagePageSchema,
  mergeLatestGroupMessages,
  prependOlderGroupMessages,
} from "./group-messages";

function message(id: number, createdAt: string, body = `m${id}`): GroupMessage {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    body,
    createdAt,
    memberId: null,
    authorName: "Antiguo miembro",
    isMine: false,
  };
}

const m1 = message(1, "2026-10-12T10:00:00+00:00");
const m2 = message(2, "2026-10-12T10:01:00+00:00");
const m3 = message(3, "2026-10-12T10:02:00+00:00");
const m4 = message(4, "2026-10-12T10:03:00+00:00");
const m5 = message(5, "2026-10-12T10:04:00+00:00");

describe("message body", () => {
  it("counts characters like Postgres, not UTF-16 units, without outer spaces", () => {
    expect(countMessageCharacters("  hola  ")).toBe(4);
    expect(countMessageCharacters("💪🚶")).toBe(2);
    expect("💪🚶".length).toBe(4);
  });

  it("trims, rejects blank messages and allows exactly 1000 characters", () => {
    expect(groupMessageBodySchema.parse("  ¡Ánimo!\n")).toBe("¡Ánimo!");
    expect(groupMessageBodySchema.safeParse(" \n ").error?.issues[0].message).toBe(
      "Escribe un mensaje.",
    );
    expect(groupMessageBodySchema.safeParse("💪".repeat(1000)).success).toBe(true);
    expect(
      groupMessageBodySchema.safeParse("a".repeat(1001)).error?.issues[0].message,
    ).toBe("El mensaje no puede tener más de 1000 caracteres.");
  });
});

describe("groupMessagePageSchema", () => {
  it("accepts server instants with microseconds and former members", () => {
    const page = groupMessagePageSchema.parse({
      messages: [{ ...m1, createdAt: "2026-10-12T10:00:00.123456+00:00" }],
      hasMore: false,
    });
    expect(page.messages[0].memberId).toBeNull();
  });

  it("rejects messages without an author name", () => {
    expect(
      groupMessagePageSchema.safeParse({
        messages: [{ ...m1, authorName: "" }],
        hasMore: false,
      }).success,
    ).toBe(false);
  });
});

describe("ordering", () => {
  it("orders by microseconds within the same millisecond, then by id", () => {
    const early = message(9, "2026-10-12T10:00:00.123001+00:00");
    const late = message(1, "2026-10-12T10:00:00.123002+00:00");
    expect(compareGroupMessages(early, late)).toBeLessThan(0);
    const tieA = message(1, "2026-10-12T10:00:00+00:00");
    const tieB = message(2, "2026-10-12T10:00:00.000+00:00");
    expect(compareGroupMessages(tieA, tieB)).toBeLessThan(0);
  });
});

describe("message window", () => {
  it("replaces everything when the latest page holds the whole history", () => {
    const merged = mergeLatestGroupMessages(
      { messages: [m1, m2, m3], hasMore: false },
      { messages: [m1, m3], hasMore: false },
    );
    expect(merged.messages).toEqual([m1, m3]);
  });

  it("keeps older loaded pages and takes the recent part from the server", () => {
    const merged = mergeLatestGroupMessages(
      { messages: [m1, m2, m3, m4], hasMore: true },
      { messages: [m3, m5], hasMore: true },
    );
    // m4 was deleted on the server: it is no longer in the latest page.
    expect(merged.messages).toEqual([m1, m2, m3, m5]);
    expect(merged.hasMore).toBe(true);
  });

  it("uses the latest page when nothing older was loaded", () => {
    const merged = mergeLatestGroupMessages(
      { messages: [], hasMore: false },
      { messages: [m4, m5], hasMore: true },
    );
    expect(merged).toEqual({ messages: [m4, m5], hasMore: true });
  });

  it("prepends an older page without duplicates", () => {
    const window = prependOlderGroupMessages(
      { messages: [m3, m4], hasMore: true },
      { messages: [m1, m2, m3], hasMore: false },
    );
    expect(window.messages).toEqual([m1, m2, m3, m4]);
    expect(window.hasMore).toBe(false);
  });
});

describe("formatGroupMessageTime", () => {
  const now = new Date("2026-10-12T15:00:00Z");

  it("shows only the time for today, in the reader timezone", () => {
    expect(formatGroupMessageTime("2026-10-12T14:12:00Z", now, "Europe/Madrid")).toBe(
      "16:12",
    );
  });

  it("says ayer for yesterday and a short date before that", () => {
    expect(
      formatGroupMessageTime("2026-10-11T08:05:00Z", now, "America/Mexico_City"),
    ).toBe("ayer 02:05");
    expect(formatGroupMessageTime("2026-10-03T16:05:00Z", now, "UTC")).toBe(
      "3 oct 16:05",
    );
    expect(formatGroupMessageTime("2025-12-31T10:00:00Z", now, "UTC")).toBe(
      "31 dic 2025 10:00",
    );
  });
});

describe("createGroupMessageId", () => {
  it("builds a v4 uuid from random bytes", () => {
    const id = createGroupMessageId(new Uint8Array(16).fill(255));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(() => createGroupMessageId(new Uint8Array(4))).toThrow();
  });
});
