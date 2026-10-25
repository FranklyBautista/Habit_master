import { describe, expect, it } from "vitest";

import { connectionStatus } from "./connection-status";

const base = { online: true, error: null, pendingCount: 0, notice: null };

describe("connectionStatus", () => {
  it("returns null when online with no sync error", () => {
    expect(connectionStatus(base)).toBeNull();
  });

  it("reports offline while disconnected, even if there is a stale error", () => {
    expect(connectionStatus({ ...base, online: false, error: "algo falló" })).toEqual({
      kind: "offline",
      message: expect.stringContaining("Sin conexión"),
    });
  });

  it("only promises to sync check-ins while offline", () => {
    expect(connectionStatus({ ...base, online: false })?.message).toContain(
      "Puedes marcar tus hábitos",
    );
  });

  it("counts the pending offline changes", () => {
    expect(connectionStatus({ ...base, online: false, pendingCount: 1 })?.message).toBe(
      "Sin conexión · 1 cambio pendiente de sincronizar.",
    );
    expect(connectionStatus({ ...base, online: false, pendingCount: 3 })?.message).toBe(
      "Sin conexión · 3 cambios pendientes de sincronizar.",
    );
  });

  it("surfaces the sync error message when online", () => {
    expect(connectionStatus({ ...base, error: "No se pudo sincronizar." })).toEqual({
      kind: "error",
      message: "No se pudo sincronizar.",
    });
  });

  it("shows the queue being sent once back online", () => {
    expect(connectionStatus({ ...base, pendingCount: 2 })).toEqual({
      kind: "pending",
      message: "Sincronizando 2 cambios…",
    });
  });

  it("shows a sync notice after everything else", () => {
    expect(
      connectionStatus({ ...base, notice: "1 marca no se pudo guardar." }),
    ).toEqual({
      kind: "notice",
      message: "1 marca no se pudo guardar.",
    });
    expect(connectionStatus({ ...base, notice: "aviso", error: "Falló." })?.kind).toBe(
      "error",
    );
  });
});
