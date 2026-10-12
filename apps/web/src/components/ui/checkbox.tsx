"use client";

import { Check } from "lucide-react";
import { type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  description?: string | null;
  /** Color del hábito: fondo de la pastilla del icono. */
  color?: string;
  /** Icono decorativo del hábito, a la izquierda (como la fila de Hoy en móvil). */
  icon?: ReactNode;
};

// Fila marcable: icono del hábito, texto y un círculo a la derecha que se
// rellena de acento al marcar. La etiqueta envuelve el input nativo, así que
// el nombre accesible es el texto de la fila y el teclado funciona igual.
export function Checkbox({
  label,
  description,
  color = "var(--tint)",
  icon,
  ...props
}: CheckboxProps) {
  return (
    <label className="check-row" style={{ "--habit-color": color } as CSSProperties}>
      {icon ? (
        <span className="check-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="check-copy">
        <span className="check-label">{label}</span>
        {description ? <span className="check-description">{description}</span> : null}
      </span>
      <span className="checkbox-wrap">
        <input type="checkbox" className="checkbox-input" {...props} />
        <span className="checkbox-control" aria-hidden="true">
          <Check size={16} strokeWidth={3} />
        </span>
      </span>
    </label>
  );
}
