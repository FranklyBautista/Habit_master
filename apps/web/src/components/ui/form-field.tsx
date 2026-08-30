import { type ReactNode } from "react";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ htmlFor, label, hint, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p id={`${htmlFor}-hint`}>{hint}</p> : null}
    </div>
  );
}
