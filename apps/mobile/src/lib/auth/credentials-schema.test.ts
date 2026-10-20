import { describe, expect, it } from "vitest";

import { registerSchema, updatePasswordSchema } from "./credentials-schema";

describe("registerSchema", () => {
  const base = { email: "ana@correo.com", password: "CuentaSegura2026" };

  it("accepts matching passwords", () => {
    expect(
      registerSchema.safeParse({ ...base, confirmPassword: base.password }).success,
    ).toBe(true);
  });

  it("rejects a confirmation that doesn't match, on the confirm field", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "Otra2026" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: "Las contraseñas no coinciden.",
      path: ["confirmPassword"],
    });
  });
});

describe("updatePasswordSchema", () => {
  it("checks the password policy before the confirmation", () => {
    const result = updatePasswordSchema.safeParse({
      password: "corta",
      confirmPassword: "corta",
    });
    expect(result.error?.issues[0]?.message).toBe(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  });

  it("rejects a confirmation that doesn't match", () => {
    const result = updatePasswordSchema.safeParse({
      password: "NuevaClave2026",
      confirmPassword: "NuevaClave2025",
    });
    expect(result.error?.issues[0]?.message).toBe("Las contraseñas no coinciden.");
  });
});
