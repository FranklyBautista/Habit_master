// Must match `[auth.email] otp_length` in supabase/config.toml and "Email OTP
// Length" in the production dashboard: the verify page draws one box per
// digit, so the length is fixed rather than Supabase's allowed 6–10 range.
// Same value as apps/mobile/src/lib/auth/credentials-schema.ts.
export const OTP_CODE_LENGTH = 6;

// Supabase limits resends to one per minute by default
// (`[auth.email] max_frequency` in production); the button waits the same so
// it never offers an attempt the server would reject.
export const RESEND_COOLDOWN_SECONDS = 60;

export type VerifyType = "signup" | "recovery";

export function parseVerifyType(value: unknown): VerifyType | undefined {
  return value === "signup" || value === "recovery" ? value : undefined;
}

export function verifyPath(type: VerifyType, email: string) {
  return `/verificar?${new URLSearchParams({ type, email })}`;
}
