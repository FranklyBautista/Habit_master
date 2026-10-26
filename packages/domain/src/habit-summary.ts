import { addDaysToDateKey, getMondayFirstWeekday, isHabitActiveOnDate } from "./dates";
import type { CreateHabitInput, Habit, HabitCheckin } from "./entities";
import { calculateStreaks } from "./metrics";

// Estado de un día en la semanita de cada hábito (pantalla Hábitos):
// - done: marcado.
// - missed: un día pasado en el que tocaba y no se marcó.
// - pending: hoy, todavía sin marcar (nunca se pinta como fallo).
// - upcoming: un día que aún no ha llegado.
// - inactive: el hábito no contaba ese día (no había empezado o estaba
//   archivado).
export type HabitDayStatus = "done" | "missed" | "pending" | "upcoming" | "inactive";

export type HabitWeekSummary = {
  days: { date: string; status: HabitDayStatus }[];
  // Días de esta semana hasta hoy (incluido) en los que el hábito contaba y
  // cuántos de ellos se marcaron.
  expected: number;
  completed: number;
  completedToday: boolean;
  currentStreak: number;
  // Empezó hoy: aún no tiene historial.
  isNew: boolean;
};

type SummaryOptions = {
  checkins: HabitCheckin[];
  timezone: string;
};

export function getHabitWeekSummary(
  habit: Habit,
  today: string,
  { checkins, timezone }: SummaryOptions,
): HabitWeekSummary {
  const doneDates = new Set(
    checkins
      .filter((checkin) => checkin.habitId === habit.id)
      .map((checkin) => checkin.checkinDate),
  );
  const monday = addDaysToDateKey(today, -getMondayFirstWeekday(today));
  let expected = 0;
  let completed = 0;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(monday, index);
    let status: HabitDayStatus;
    if (date > today) {
      status = "upcoming";
    } else if (!isHabitActiveOnDate(habit, date, timezone)) {
      status = "inactive";
    } else {
      expected += 1;
      if (doneDates.has(date)) {
        completed += 1;
        status = "done";
      } else {
        status = date === today ? "pending" : "missed";
      }
    }
    return { date, status };
  });
  const { current } = calculateStreaks(today, {
    habits: [habit],
    checkins,
    timezone,
    habitId: habit.id,
  });
  return {
    days,
    expected,
    completed,
    completedToday: doneDates.has(today),
    currentStreak: current,
    isNew: habit.startDate === today,
  };
}

// Ideas para el estado vacío de Hábitos: abren el formulario de crear ya
// relleno con `defaults` (el usuario puede cambiarlo todo). Un `name` vacío
// deja el nombre para que lo elija el usuario.
export type HabitIdea = {
  label: string;
  hint: string;
  defaults: CreateHabitInput;
};

export const habitIdeas: readonly HabitIdea[] = [
  {
    label: "Leer 10 minutos",
    hint: "Un capítulo antes de dormir",
    defaults: {
      name: "Leer 10 minutos",
      description: "Un capítulo antes de dormir",
      color: "#0369A1",
      icon: "book-open",
    },
  },
  {
    label: "Caminar 20 minutos",
    hint: "Al salir o después de comer",
    defaults: {
      name: "Caminar 20 minutos",
      description: "Al salir o después de comer",
      color: "#047857",
      icon: "footprints",
    },
  },
  {
    label: "Meditar 5 minutos",
    hint: "Respirar con calma al despertar",
    defaults: {
      name: "Meditar 5 minutos",
      description: "Respirar con calma al despertar",
      color: "#7C3AED",
      icon: "brain",
    },
  },
  {
    label: "Escribir el diario",
    hint: "Tres líneas sobre tu día",
    defaults: {
      name: "Escribir el diario",
      description: "Tres líneas sobre tu día",
      color: "#C2410C",
      icon: "notebook-pen",
    },
  },
  {
    label: "Planificar el día",
    hint: "Tres tareas clave cada mañana",
    defaults: {
      name: "Planificar el día",
      description: "Tres tareas clave cada mañana",
      color: "#0F766E",
      icon: "list-checks",
    },
  },
  {
    label: "Algo que te haga bien",
    hint: "Elige tú el nombre",
    defaults: { name: "", description: null, color: "#BE185D", icon: "sparkles" },
  },
];
