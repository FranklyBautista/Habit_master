"use client";

import { Check } from "lucide-react";
import { type CSSProperties, type InputHTMLAttributes } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  description?: string | null;
  color?: string;
};

export function Checkbox({
  label,
  description,
  color = "var(--primary)",
  ...props
}: CheckboxProps) {
  return (
    <label className="check-row">
      <span
        className="checkbox-wrap"
        style={{ "--habit-color": color } as CSSProperties}
      >
        <input type="checkbox" className="checkbox-input" {...props} />
        <span className="checkbox-control" aria-hidden="true">
          <Check size={17} strokeWidth={3} />
        </span>
      </span>
      <span className="check-copy">
        <span className="check-label">{label}</span>
        {description ? <span className="check-description">{description}</span> : null}
      </span>
    </label>
  );
}
