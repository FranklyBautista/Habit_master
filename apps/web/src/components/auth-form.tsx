"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useActionState, useState } from "react";

import type { AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

type AuthFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  children?: ReactNode;
  // Va justo debajo de los campos (p. ej. "¿Olvidaste tu contraseña?").
  belowFields?: ReactNode;
  // Pide la contraseña dos veces; la acción comprueba que coincidan.
  confirmPassword?: boolean;
  fields: "credentials" | "email" | "password";
  next?: string;
  submitLabel: string;
};

export function AuthForm({
  action,
  children,
  belowFields,
  confirmPassword = false,
  fields,
  next,
  submitLabel,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [emailValid, setEmailValid] = useState(false);
  const showEmail = fields === "credentials" || fields === "email";
  const showPassword = fields === "credentials" || fields === "password";

  return (
    <form className="auth-form" action={formAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {showEmail ? (
        <FormField htmlFor="email" label="Correo">
          <div className="auth-input">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
              onChange={(event) =>
                setEmailValid(
                  event.currentTarget.value.length > 0 &&
                    event.currentTarget.validity.valid,
                )
              }
            />
            {emailValid ? (
              <Check className="auth-input__icon" size={20} aria-hidden="true" />
            ) : null}
          </div>
        </FormField>
      ) : null}
      {showPassword ? (
        <FormField htmlFor="password" label="Contraseña">
          <PasswordInput
            id="password"
            isNew={fields === "password" || confirmPassword}
          />
        </FormField>
      ) : null}
      {showPassword && confirmPassword ? (
        <FormField htmlFor="confirmPassword" label="Confirmar contraseña">
          <PasswordInput id="confirmPassword" isNew />
        </FormField>
      ) : null}
      {belowFields}
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

function PasswordInput({ id, isNew }: { id: string; isNew: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-input">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        minLength={8}
        autoComplete={isNew ? "new-password" : "current-password"}
        placeholder="••••••••"
        required
      />
      {/* "clave" y no "contraseña": getByLabel("Contraseña") de los E2E
          coincide por subcadena y también encontraría este botón. */}
      <button
        type="button"
        className="auth-input__toggle"
        aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <Eye size={20} aria-hidden="true" />
        ) : (
          <EyeOff size={20} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href}>{children}</Link>;
}
