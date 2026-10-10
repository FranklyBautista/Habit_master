import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserCodeCard } from "./user-code-card";

const store = vi.hoisted(() => ({
  snapshot: { userCode: "H2M4R8TN" as string | null, error: null as string | null },
  actions: { regenerateUserCode: vi.fn() },
}));

vi.mock("@/lib/group-store", () => ({
  useGroups: () => store.snapshot,
  useGroupActions: () => store.actions,
}));

describe("UserCodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.snapshot.userCode = "H2M4R8TN";
    store.snapshot.error = null;
  });

  it("shows the code formatted as XXXX-XXXX", () => {
    render(<UserCodeCard />);

    expect(screen.getByRole("heading", { name: "Tu código" })).toBeInTheDocument();
    expect(screen.getByTestId("user-code")).toHaveTextContent("H2M4-R8TN");
  });

  it("copies the formatted code", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<UserCodeCard />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith("H2M4-R8TN");
    expect(await screen.findByText("Copiado.")).toBeInTheDocument();
  });

  it("asks for confirmation before regenerating and explains the old code stops working", async () => {
    const user = userEvent.setup();
    store.actions.regenerateUserCode.mockResolvedValue({ ok: true, data: "7K3P9QXA" });
    render(<UserCodeCard />);

    await user.click(screen.getByRole("button", { name: "Generar uno nuevo" }));
    expect(store.actions.regenerateUserCode).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("dejará de valer");

    await user.click(screen.getByRole("button", { name: "Generar código nuevo" }));
    await waitFor(() =>
      expect(store.actions.regenerateUserCode).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findByText(/El anterior ya no sirve/)).toBeInTheDocument();
  });

  it("keeps the dialog open with the server error when regenerating fails", async () => {
    const user = userEvent.setup();
    store.actions.regenerateUserCode.mockResolvedValue({
      ok: false,
      error: "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.",
    });
    render(<UserCodeCard />);

    await user.click(screen.getByRole("button", { name: "Generar uno nuevo" }));
    await user.click(screen.getByRole("button", { name: "Generar código nuevo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo sincronizar",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
