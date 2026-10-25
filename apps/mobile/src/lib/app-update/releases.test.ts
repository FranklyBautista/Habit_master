import type { Database } from "@habit-tracker/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  type AppRelease,
  fetchPendingReleases,
  parseReleaseRow,
  summarizeReleases,
} from "./releases";

function row(version: string, overrides: Record<string, unknown> = {}) {
  return {
    version,
    title: `Versión ${version}`,
    summary: "",
    changes: [],
    download_url: `https://example.test/${version}.apk`,
    mandatory: false,
    ...overrides,
  };
}

function release(version: string, overrides: Partial<AppRelease> = {}): AppRelease {
  return {
    version,
    title: `Versión ${version}`,
    summary: "",
    changes: [],
    downloadUrl: `https://example.test/${version}.apk`,
    mandatory: false,
    ...overrides,
  };
}

// Cliente falso mínimo: `from(...).select(...).eq(...)` resuelve a `result`.
function fakeClient(result: { data: unknown; error: unknown }) {
  const eq = vi.fn(async () => result);
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    eq,
  };
}

describe("parseReleaseRow", () => {
  it("maps snake_case to camelCase", () => {
    expect(parseReleaseRow(row("1.2.0", { mandatory: true }))).toEqual(
      release("1.2.0", { mandatory: true }),
    );
  });

  it("drops malformed changes but keeps the release", () => {
    const parsed = parseReleaseRow(
      row("1.2.0", {
        changes: [
          { type: "added", text: "Avisos" },
          { type: "nuevo", text: "Tipo desconocido" },
          { type: "removed", text: "  " },
          "texto suelto",
        ],
      }),
    );
    expect(parsed?.changes).toEqual([{ type: "added", text: "Avisos" }]);
  });

  it("rejects rows without a valid version or an https link", () => {
    expect(parseReleaseRow(row("1.2"))).toBeNull();
    expect(
      parseReleaseRow(row("1.2.0", { download_url: "http://example.test/a.apk" })),
    ).toBeNull();
    expect(
      parseReleaseRow(row("1.2.0", { download_url: "no es un enlace" })),
    ).toBeNull();
  });
});

describe("fetchPendingReleases", () => {
  it("returns only newer valid releases for the platform, oldest first", async () => {
    const { client, from, eq } = fakeClient({
      data: [row("1.10.0"), row("1.0.0"), row("1.1.0"), row("1.9.0"), row("roto")],
      error: null,
    });

    const releases = await fetchPendingReleases(client, "1.1.0", "android");

    expect(from).toHaveBeenCalledWith("app_releases");
    expect(eq).toHaveBeenCalledWith("platform", "android");
    expect(releases.map((item) => item.version)).toEqual(["1.9.0", "1.10.0"]);
  });

  it("throws when the query fails", async () => {
    const { client } = fakeClient({ data: null, error: { message: "offline" } });
    await expect(fetchPendingReleases(client, "1.0.0", "android")).rejects.toThrow(
      "offline",
    );
  });
});

describe("summarizeReleases", () => {
  it("returns null when there is nothing to announce", () => {
    expect(summarizeReleases([])).toBeNull();
  });

  it("merges skipped versions, newest first, with the newest link", () => {
    const summary = summarizeReleases([
      release("1.2.0", {
        changes: [
          { type: "added", text: "Chat" },
          { type: "removed", text: "Notas" },
        ],
      }),
      release("1.3.0", {
        title: "Mejoras",
        summary: "Más rápida",
        changes: [
          { type: "added", text: "Modo sin conexión" },
          { type: "changed", text: "Nuevo calendario" },
        ],
      }),
    ]);

    expect(summary).toEqual({
      latestVersion: "1.3.0",
      title: "Mejoras",
      summary: "Más rápida",
      downloadUrl: "https://example.test/1.3.0.apk",
      mandatory: false,
      added: ["Modo sin conexión", "Chat"],
      changed: ["Nuevo calendario"],
      removed: ["Notas"],
    });
  });

  it("is mandatory if any skipped version is", () => {
    const summary = summarizeReleases([
      release("1.2.0", { mandatory: true }),
      release("1.3.0"),
    ]);
    expect(summary?.mandatory).toBe(true);
  });
});
