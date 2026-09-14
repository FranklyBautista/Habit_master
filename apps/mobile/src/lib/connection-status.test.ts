import { describe, expect, it } from "vitest";

import { connectionStatus } from "./connection-status";

describe("connectionStatus", () => {
  it("returns null when online with no sync error", () => {
    expect(connectionStatus({ online: true, error: null })).toBeNull();
  });

  it("reports offline while disconnected, even if there is a stale error", () => {
    expect(connectionStatus({ online: false, error: "algo falló" })).toEqual({
      kind: "offline",
      message: expect.stringContaining("Sin conexión"),
    });
  });

  it("surfaces the sync error message when online", () => {
    expect(
      connectionStatus({ online: true, error: "No se pudo sincronizar." }),
    ).toEqual({ kind: "error", message: "No se pudo sincronizar." });
  });
});
