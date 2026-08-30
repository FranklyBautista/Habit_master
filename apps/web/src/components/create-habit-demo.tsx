"use client";

import { Plus } from "lucide-react";
import { type CSSProperties, type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Toast } from "@/components/ui/toast";

const colors = ["#047857", "#0369A1", "#7C3AED", "#C2410C", "#BE185D", "#0F766E"];

export function CreateHabitDemo({ compact = false }: { compact?: boolean }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const nameId = `${fieldId}-name`;
  const descriptionId = `${fieldId}-description`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    setToast(true);
  }

  return (
    <>
      <Button
        className={compact ? "create-button--compact" : ""}
        onClick={() => setOpen(true)}
      >
        <Plus size={18} />
        <span>{compact ? "Crear" : "Crear hábito"}</span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear hábito"
        description="Esta vista previa no guardará datos todavía."
      >
        <form className="habit-form" onSubmit={submit}>
          <FormField htmlFor={nameId} label="Nombre">
            <input
              id={nameId}
              name="name"
              placeholder="Por ejemplo, beber agua"
              maxLength={60}
              required
              autoFocus
            />
          </FormField>
          <FormField
            htmlFor={descriptionId}
            label="Descripción"
            hint="Opcional. Añade una pista breve para empezar."
          >
            <textarea
              id={descriptionId}
              name="description"
              placeholder="Cuándo o cómo quieres hacerlo"
              rows={3}
              aria-describedby={`${descriptionId}-hint`}
            />
          </FormField>
          <fieldset className="color-field">
            <legend>Color</legend>
            <div>
              {colors.map((color, index) => (
                <label key={color} style={{ "--swatch": color } as CSSProperties}>
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={index === 0}
                    aria-label={`Color ${index + 1}`}
                  />
                  <span aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus size={18} /> Crear hábito
            </Button>
          </div>
        </form>
      </Dialog>
      {toast ? (
        <Toast
          message="Vista previa completada; la persistencia llegará en la fase 3."
          onClose={() => setToast(false)}
        />
      ) : null}
    </>
  );
}
