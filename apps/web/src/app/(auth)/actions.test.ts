import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  resend: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "https://constancia.test" }),
}));
// redirect() throws in Next to stop the action; mirror that so code after it
// never runs and the test can read the destination.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

const { recoverPassword, register, resendCode, updatePassword, verifyCode } =
  await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

async function redirectOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(Redirect);
  return (error as Redirect).url;
}

const email = "ana@example.test";

beforeEach(() => {
  Object.values(auth).forEach((mock) => mock.mockReset());
});

describe("register", () => {
  const fields = { email, password: "CuentaSegura2026" };

  it("goes straight to the app when signUp already returns a session", async () => {
    auth.signUp.mockResolvedValue({ data: { session: {} }, error: null });

    expect(await redirectOf(register({}, form(fields)))).toBe("/hoy");
  });

  it("asks for the emailed code when the account awaits confirmation", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    expect(await redirectOf(register({}, form(fields)))).toBe(
      "/verificar?type=signup&email=ana%40example.test",
    );
  });

  it("answers an existing email exactly like a new one", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "User already registered" },
    });

    expect(await redirectOf(register({}, form(fields)))).toBe(
      "/verificar?type=signup&email=ana%40example.test",
    );
  });
});

describe("recoverPassword", () => {
  it("sends the recovery email and opens the code page", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    expect(await redirectOf(recoverPassword({}, form({ email })))).toBe(
      "/verificar?type=recovery&email=ana%40example.test",
    );
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: "https://constancia.test/auth/confirm?next=/actualizar-contrasena",
    });
  });
});

describe("verifyCode", () => {
  it("rejects a code that is not six digits without calling Supabase", async () => {
    const result = await verifyCode({}, form({ email, type: "signup", code: "123" }));

    expect(result).toEqual({
      error: "Escribe el código de 6 dígitos que te enviamos.",
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("rejects an unknown verification type", async () => {
    const result = await verifyCode(
      {},
      form({ email, type: "magiclink", code: "123456" }),
    );

    expect(result).toEqual({ error: "No se pudo abrir la verificación." });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("confirms the signup and enters the app", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });

    const url = await redirectOf(
      verifyCode({}, form({ email, type: "signup", code: " 123456 " })),
    );

    expect(url).toBe("/hoy");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email,
      token: "123456",
      type: "signup",
    });
  });

  it("continues a recovery to choosing a new password", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });

    expect(
      await redirectOf(
        verifyCode({}, form({ email, type: "recovery", code: "654321" })),
      ),
    ).toBe("/actualizar-contrasena");
  });

  it("explains an expired or wrong code in Spanish", async () => {
    auth.verifyOtp.mockResolvedValue({
      error: { message: "Token has expired or is invalid" },
    });

    const result = await verifyCode(
      {},
      form({ email, type: "signup", code: "000000" }),
    );

    expect(result).toEqual({
      error: "El código no es válido o ha caducado. Pide uno nuevo.",
    });
  });
});

describe("resendCode", () => {
  it("resends the signup confirmation", async () => {
    auth.resend.mockResolvedValue({ error: null });

    const result = await resendCode({}, form({ email, type: "signup" }));

    expect(result).toEqual({ message: "Te enviamos un código nuevo." });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email,
      options: { emailRedirectTo: "https://constancia.test/auth/confirm?next=/hoy" },
    });
  });

  it("resends a recovery code through resetPasswordForEmail", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await resendCode({}, form({ email, type: "recovery" }));

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: "https://constancia.test/auth/confirm?next=/actualizar-contrasena",
    });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("asks to wait when Supabase rate-limits the resend", async () => {
    auth.resend.mockResolvedValue({
      error: {
        message: "For security purposes, you can only request this after 42 seconds.",
      },
    });

    const result = await resendCode({}, form({ email, type: "signup" }));

    expect(result).toEqual({ error: "Espera un momento antes de pedir otro código." });
  });
});

describe("updatePassword", () => {
  it("explains that the new password must differ from the current one", async () => {
    auth.updateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password." },
    });

    const result = await updatePassword({}, form({ password: "CuentaSegura2026" }));

    expect(result).toEqual({
      error: "La contraseña nueva debe ser distinta de la actual.",
    });
  });
});
