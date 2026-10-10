"use client";

import { groupLimits, type Habit } from "@habit-tracker/domain";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type ShareHabitsPickerProps = {
  habits: Habit[];
  selected: string[];
  onChange: (selected: string[]) => void;
  legend: string;
  onCreateHabit?: () => void;
};

/** Casillas con los hábitos activos propios; como máximo 10 por grupo. */
export function ShareHabitsPicker({
  habits,
  selected,
  onChange,
  legend,
  onCreateHabit,
}: ShareHabitsPickerProps) {
  const max = groupLimits.maxSharedHabitsPerGroup;
  const full = selected.length >= max;

  function toggle(habitId: string) {
    onChange(
      selected.includes(habitId)
        ? selected.filter((id) => id !== habitId)
        : [...selected, habitId],
    );
  }

  return (
    <fieldset className="share-picker">
      <legend>{legend}</legend>
      {habits.length ? (
        <div className="habit-checks">
          {habits.map((habit) => {
            const checked = selected.includes(habit.id);
            return (
              <Checkbox
                key={habit.id}
                label={habit.name}
                color={habit.color}
                checked={checked}
                disabled={!checked && full}
                onChange={() => toggle(habit.id)}
              />
            );
          })}
        </div>
      ) : (
        <p className="group-muted">Aún no tienes hábitos activos.</p>
      )}
      <p className="group-muted">
        {full
          ? `Puedes compartir como máximo ${max} hábitos por grupo.`
          : "Puedes no compartir ninguno y participar solo animando."}
      </p>
      {onCreateHabit ? (
        <Button variant="secondary" onClick={onCreateHabit}>
          <Plus size={17} /> Crear un hábito nuevo
        </Button>
      ) : null}
    </fieldset>
  );
}
