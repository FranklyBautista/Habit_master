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

// Supabase lets the email OTP length be configured between 6 and 10 digits
// (`[auth.email] otp_length`); accept the whole range so the app keeps working
// if production is set to something other than the local default of 6.
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, "Escribe el código de 6 dígitos que te enviamos.");
