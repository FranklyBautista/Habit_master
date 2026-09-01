"use client";

import Link from "next/link";
import { type ReactNode, useActionState } from "react";

import type { AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

type AuthFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  children?: ReactNode;
  fields: "credentials" | "email" | "password";
  next?: string;
  submitLabel: string;
};

export function AuthForm({
  action,
  children,
  fields,
  next,
  submitLabel,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const showEmail = fields === "credentials" || fields === "email";
  const showPassword = fields === "credentials" || fields === "password";

  return (
    <form className="auth-form" action={formAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {showEmail ? (
        <FormField htmlFor="email" label="Correo">
          <input id="email" name="email" type="email" autoComplete="email" required />
        </FormField>
      ) : null}
      {showPassword ? (
        <FormField htmlFor="password" label="Contraseña">
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={fields === "password" ? "new-password" : "current-password"}
            required
          />
        </FormField>
      ) : null}
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
      <Button type="submit" disabled={pending}>
        {pending ? "Procesando…" : submitLabel}
      </Button>
      {children}
    </form>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href}>{children}</Link>;
}
