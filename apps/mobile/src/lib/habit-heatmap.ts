import {
  addDaysToDateKey,
  formatLocalDate,
  getMondayFirstWeekday,
  type Habit,
  type HabitCheckin,
  isHabitActiveOnDate,
} from "@habit-tracker/domain";

// done = marcado; missed = previsto y sin marcar; inactive = antes de empezar o
// archivado; future = días de la semana actual que aún no han llegado.
export type HeatmapCellState = "done" | "missed" | "inactive" | "future";

export type HeatmapCell = { date: string; state: HeatmapCellState };

export type HabitHeatmap = {
  // Una columna por semana (de lunes a domingo), la última es la actual.
  weeks: HeatmapCell[][];
  // Columna donde empieza cada mes visible, para las etiquetas de arriba.
  months: { column: number; label: string }[];
  completed: number;
};

// Una etiqueta necesita unas tres columnas para no pisar a la siguiente.
const MIN_LABEL_COLUMNS = 3;

function monthLabel(dateKey: string) {
  const label = formatLocalDate(dateKey, { month: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildHabitHeatmap(
  habit: Habit,
  checkins: HabitCheckin[],
  today: string,
  timezone: string,
  weekCount: number,
): HabitHeatmap {
  const done = new Set(
    checkins
      .filter((checkin) => checkin.habitId === habit.id)
      .map((checkin) => checkin.checkinDate),
  );
  const currentMonday = addDaysToDateKey(today, -getMondayFirstWeekday(today));
  const firstMonday = addDaysToDateKey(currentMonday, -7 * (weekCount - 1));

  const weeks: HeatmapCell[][] = [];
  const months: HabitHeatmap["months"] = [];
  let completed = 0;

  for (let column = 0; column < weekCount; column += 1) {
    const monday = addDaysToDateKey(firstMonday, column * 7);
    const week: HeatmapCell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const date = addDaysToDateKey(monday, row);
      let state: HeatmapCellState;
      if (date > today) state = "future";
      else if (done.has(date)) state = "done";
      else if (isHabitActiveOnDate(habit, date, timezone)) state = "missed";
      else state = "inactive";
      if (state === "done") completed += 1;
      week.push({ date, state });
    }
    weeks.push(week);

    const previousMonth = column ? addDaysToDateKey(monday, -7).slice(0, 7) : null;
    if (monday.slice(0, 7) !== previousMonth) {
      months.push({ column, label: monthLabel(monday) });
    }
  }

  // El primer mes casi nunca empieza en la primera columna: si el siguiente
  // llega enseguida, su etiqueta se solaparía.
  if (months.length > 1 && months[1].column - months[0].column < MIN_LABEL_COLUMNS) {
    months.shift();
  }

  return { weeks, months, completed };
}
