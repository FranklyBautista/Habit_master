"use client";

import { useActionState, useEffect, useState } from "react";

import { type AuthActionState, resendCode, verifyCode } from "@/app/(auth)/actions";
import { AuthLink } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { OtpCodeInput } from "@/components/ui/otp-code-input";
import {
  OTP_CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  type VerifyType,
} from "@/lib/auth/otp";

type VerifyCodeFormProps = {
  email: string;
  type: VerifyType;
};

export function VerifyCodeForm({ email, type }: VerifyCodeFormProps) {
  const [code, setCode] = useState("");
  // The page is reached right after the first email went out, so the
  // countdown starts full.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, {});
  const [resendState, resendAction, resending] = useActionState(
    async (previous: AuthActionState, formData: FormData) => {
      const result = await resendCode(previous, formData);
      if (result.message) setCooldown(RESEND_COOLDOWN_SECONDS);
      return result;
    },
    {},
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Only the latest action's outcome is shown: whichever button was pressed
  // last owns the message area.
  const [lastAction, setLastAction] = useState<"verify" | "resend">("verify");
  const state = lastAction === "verify" ? verifyState : resendState;
  const resendDisabled = resending || cooldown > 0;

  return (
    <form
      className="auth-form"
      action={verifyAction}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        setLastAction(submitter?.dataset.action === "resend" ? "resend" : "verify");
      }}
    >
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="type" value={type} />
      <FormField htmlFor="code" label="Código de verificación">
        <OtpCodeInput
          id="code"
          name="code"
          length={OTP_CODE_LENGTH}
          value={code}
          onChange={setCode}
        />
      </FormField>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-message" role="status">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={verifying}>
        {verifying ? "Verificando…" : "Verificar código"}
      </Button>
      <div className="auth-links">
        <Button
          type="submit"
          variant="ghost"
          formAction={resendAction}
          formNoValidate
          disabled={resendDisabled}
          data-action="resend"
        >
          {resending
            ? "Reenviando…"
            : cooldown > 0
              ? `Reenviar código en ${cooldown} s`
              : "Reenviar código"}
        </Button>
        <AuthLink href="/login">Volver a iniciar sesión</AuthLink>
      </div>
    </form>
  );
}
