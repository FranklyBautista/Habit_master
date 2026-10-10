import { describe, expect, it } from "vitest";

import {
  expiresInLabel,
  groupDisplayNameProblem,
  inviteResultMessage,
  memberCountLabel,
  streakLabel,
} from "./group-format";

describe("group-format", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  it("labels how long an invitation has left", () => {
    expect(expiresInLabel("2026-10-16T13:00:00Z", now)).toBe("caduca en 7 d");
    expect(expiresInLabel("2026-10-12T11:00:00Z", now)).toBe("caduca en 2 d");
    expect(expiresInLabel("2026-10-10T20:00:00Z", now)).toBe("caduca hoy");
  });

  it("explains each invite result in words", () => {
    expect(inviteResultMessage("sent", "h2m4r8tn")).toBe(
      "Invitación enviada a H2M4-R8TN.",
    );
    expect(inviteResultMessage("already_member", "H2M4R8TN")).toBe(
      "Esa persona ya es miembro del grupo.",
    );
    expect(inviteResultMessage("already_invited", "H2M4R8TN")).toBe(
      "Esa persona ya tiene una invitación pendiente.",
    );
  });

  it("pluralises members and streaks", () => {
    expect(memberCountLabel(1)).toBe("1 miembro");
    expect(memberCountLabel(4)).toBe("4 miembros");
    expect(streakLabel(1)).toBe("racha de 1 día");
    expect(streakLabel(0)).toBe("racha de 0 días");
  });

  it("rejects an empty name and the app's «Tú» placeholder for groups", () => {
    expect(groupDisplayNameProblem("  ")).toBe("Escribe tu nombre.");
    expect(groupDisplayNameProblem("tú")).toMatch(/«Tú» no se muestra/);
    expect(groupDisplayNameProblem("Alex")).toBeNull();
  });
});
