import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

const { GET } = await import("./route");

function callback(query: string) {
  return GET(new NextRequest(`https://constancia.test/auth/callback?${query}`));
}

beforeEach(() => {
  auth.exchangeCodeForSession.mockReset();
});

describe("GET /auth/callback", () => {
  it("exchanges the code and continues to next", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await callback("code=abc&next=%2Festadisticas");

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe(
      "https://constancia.test/estadisticas",
    );
  });

  it("never follows next off-site", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await callback("code=abc&next=%2F%2Fevil.example");

    expect(response.headers.get("location")).toBe("https://constancia.test/hoy");
  });

  it("returns to the login with a notice when Google sends an error", async () => {
    const response = await callback(
      "error=access_denied&error_description=The+user+denied+access",
    );

    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://constancia.test/login?error=google",
    );
  });

  it("returns to the login with a notice when the exchange fails", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state" },
    });

    const response = await callback("code=abc");

    expect(response.headers.get("location")).toBe(
      "https://constancia.test/login?error=google",
    );
  });
});
