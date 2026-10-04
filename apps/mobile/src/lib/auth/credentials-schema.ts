import { z } from "zod";

// Mirrors apps/web/src/app/(auth)/actions.ts#credentialsSchema.
export const credentialsSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

// Mirrors supabase/config.toml's `[auth] password_requirements = "letters_digits"`
// and apps/web/src/app/(auth)/actions.ts#newPasswordSchema — only applied where a
// *new* password is being set (register, update), never on login, so an existing
// account's password never needs to satisfy today's policy.
export const newPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(
    /(?=.*[A-Za-z])(?=.*\d)/,
    "La contraseña debe incluir al menos una letra y un número.",
  );

export const registerSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: newPasswordSchema,
});

// Must match `[auth.email] otp_length` in supabase/config.toml and "Email OTP
// Length" in the production dashboard: the verify screen draws one box per
// digit, so the length is fixed rather than Supabase's allowed 6–10 range.
export const OTP_CODE_LENGTH = 6;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`),
    `Escribe el código de ${OTP_CODE_LENGTH} dígitos que te enviamos.`,
  );
