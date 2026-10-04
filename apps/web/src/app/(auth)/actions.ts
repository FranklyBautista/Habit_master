"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { OTP_CODE_LENGTH, parseVerifyType, verifyPath } from "@/lib/auth/otp";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
};

const credentialsSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

// Mirrors supabase/config.toml's `[auth] password_requirements = "letters_digits"` —
// only applied where a *new* password is being set (register, update), never on
// login, so an existing account's password never needs to satisfy today's policy.
const newPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(
    /(?=.*[A-Za-z])(?=.*\d)/,
    "La contraseña debe incluir al menos una letra y un número.",
  );

const registerSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: newPasswordSchema,
});

const verifySchema = z.object({
  email: z.email("No se pudo abrir la verificación."),
  type: z.enum(["signup", "recovery"], "No se pudo abrir la verificación."),
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`),
      `Escribe el código de ${OTP_CODE_LENGTH} dígitos que te enviamos.`,
    ),
});

function values(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
  };
}

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/hoy";
}

function authError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "El correo o la contraseña no coinciden.";
  }
  if (message.includes("Password should contain at least one character")) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  if (message.includes("New password should be different from the old password")) {
    return "La contraseña nueva debe ser distinta de la actual.";
  }
  if (message.includes("Token has expired or is invalid")) {
    return "El código no es válido o ha caducado. Pide uno nuevo.";
  }
  if (
    message.includes("For security purposes") ||
    message.includes("rate limit exceeded")
  ) {
    return "Espera un momento antes de pedir otro código.";
  }
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}

async function origin() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse(values(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authError(error.message) };
  redirect(safeNext(formData.get("next")));
}

export async function register(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(values(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=/hoy` },
  });
  if (error) {
    // Same generic message as a new signup — revealing "already registered"
    // here would let an attacker enumerate emails, contradicting the
    // deliberately ambiguous message recoverPassword() already uses below.
    if (error.message.includes("User already registered")) {
      redirect(verifyPath("signup", parsed.data.email));
    }
    return { error: authError(error.message) };
  }
  // With email confirmations off (as in local development and CI) signUp
  // already returns a session; otherwise the account waits for the code.
  if (data.session) redirect("/hoy");
  redirect(verifyPath("signup", parsed.data.email));
}

export async function recoverPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.email("Escribe un correo válido.").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await origin()}/auth/confirm?next=/actualizar-contrasena`,
  });
  if (error) return { error: authError(error.message) };
  // Supabase answers the same whether or not the account exists, and so does
  // the verify page ("si la cuenta existe…"), so this reveals nothing.
  redirect(verifyPath("recovery", parsed.data));
}

export async function verifyCode(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    type: formData.get("type"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { email, type, code } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type });
  if (error) return { error: authError(error.message) };
  redirect(type === "recovery" ? "/actualizar-contrasena" : "/hoy");
}

export async function resendCode(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.email().safeParse(formData.get("email"));
  const type = parseVerifyType(formData.get("type"));
  if (!email.success || !type) return { error: "No se pudo abrir la verificación." };

  const supabase = await createClient();
  const { error } =
    type === "signup"
      ? await supabase.auth.resend({
          type: "signup",
          email: email.data,
          options: { emailRedirectTo: `${await origin()}/auth/confirm?next=/hoy` },
        })
      : await supabase.auth.resetPasswordForEmail(email.data, {
          redirectTo: `${await origin()}/auth/confirm?next=/actualizar-contrasena`,
        });
  if (error) return { error: authError(error.message) };
  return { message: "Te enviamos un código nuevo." };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = newPasswordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: authError(error.message) };
  redirect("/hoy");
}
