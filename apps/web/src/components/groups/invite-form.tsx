"use client";

import { formatUserCode } from "@habit-tracker/domain";
import { UserPlus } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useGroupActions } from "@/lib/group-store";

import { inviteResultMessages } from "./group-utils";

type InviteFormProps = {
  groupId: string;
  /** Se llama con el código formateado y el mensaje de resultado. */
  onInvited?: (code: string, message: string) => void;
};

/** Invitar con el código de usuario de la otra persona (ADR 0002 §1). */
export function InviteForm({ groupId, onInvited }: InviteFormProps) {
  const fieldId = useId();
  const actions = useGroupActions();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputId = `${fieldId}-code`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await actions.inviteToGroup(groupId, code);
    setBusy(false);
    if (!result.ok) {
      setMessage(null);
      setError(result.error);
      return;
    }
    const text = inviteResultMessages[result.data];
    setError(null);
    setMessage(text);
    onInvited?.(formatUserCode(code), text);
    if (result.data === "sent") setCode("");
  }

  return (
    <form className="invite-form" onSubmit={submit} noValidate>
      <FormField
        htmlFor={inputId}
        label="Código de la persona"
        hint="Pídele su código: lo encuentra en Ajustes. Tiene 8 caracteres, como H2M4-R8TN."
      >
        <div className="invite-form__row">
          <input
            id={inputId}
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            aria-describedby={`${inputId}-hint`}
            aria-invalid={error ? true : undefined}
            required
          />
          <Button type="submit" disabled={busy || !code.trim()}>
            <UserPlus size={17} /> Invitar
          </Button>
        </div>
      </FormField>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="group-success" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
