"use client";

import {
  createHabitInputSchema,
  type Habit,
  habitColors,
  habitIcons,
} from "@habit-tracker/domain";
import { Plus, Save } from "lucide-react";
import { type CSSProperties, type FormEvent, useId, useState } from "react";

import { habitIconComponents } from "@/components/habit-icons";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { useHabitActions } from "@/lib/habit-store";

type HabitFormDialogProps = {
  open: boolean;
  habit?: Habit | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function HabitFormDialog({
  open,
  habit,
  onClose,
  onSaved,
}: HabitFormDialogProps) {
  const fieldId = useId();
  const actions = useHabitActions();
  const [error, setError] = useState<string | null>(null);
  const nameId = `${fieldId}-name`;
  const descriptionId = `${fieldId}-description`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = createHabitInputSchema.safeParse({
      name: form.get("name"),
      description: String(form.get("description") ?? "").trim() || null,
      color: form.get("color"),
      icon: form.get("icon"),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos del hábito.");
      return;
    }
    const saved = habit
      ? await actions.updateHabit(habit.id, result.data)
      : await actions.createHabit(result.data);
    if (!saved) {
      setError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setError(null);
    onSaved(habit ? "Hábito actualizado." : "Hábito creado y añadido a Hoy.");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={habit ? "Editar hábito" : "Crear hábito"}
      description="Los cambios se guardan en tu cuenta."
    >
      <form className="habit-form" onSubmit={submit}>
        <FormField htmlFor={nameId} label="Nombre">
          <input
            id={nameId}
            name="name"
            defaultValue={habit?.name ?? ""}
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
            defaultValue={habit?.description ?? ""}
            placeholder="Cuándo o cómo quieres hacerlo"
            rows={3}
            maxLength={160}
            aria-describedby={`${descriptionId}-hint`}
          />
        </FormField>
        <fieldset className="color-field">
          <legend>Color</legend>
          <div>
            {habitColors.map((color) => (
              <label key={color} style={{ "--swatch": color } as CSSProperties}>
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={(habit?.color ?? habitColors[0]) === color}
                  aria-label={`Color ${color}`}
                />
                <span aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="icon-field">
          <legend>Icono</legend>
          <div>
            {habitIcons.map((icon) => {
              const Icon = habitIconComponents[icon];
              return (
                <label key={icon}>
                  <input
                    type="radio"
                    name="icon"
                    value={icon}
                    defaultChecked={(habit?.icon ?? "sparkles") === icon}
                    aria-label={`Icono ${icon}`}
                  />
                  <span aria-hidden="true">
                    <Icon size={19} />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {habit ? <Save size={18} /> : <Plus size={18} />}
            {habit ? "Guardar" : "Crear hábito"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
