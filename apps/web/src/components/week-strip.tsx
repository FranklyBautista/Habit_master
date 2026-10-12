import {
  addDaysToDateKey,
  calculateDailyCompletion,
  formatLocalDate,
  getMondayFirstWeekday,
} from "@habit-tracker/domain";

type CompletionOptions = Parameters<typeof calculateDailyCompletion>[1];

type WeekStripProps = {
  today: string;
  options: CompletionOptions;
};

function weekdayLabel(date: string) {
  const label = formatLocalDate(date, { weekday: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dotTone(percentage: number | null) {
  if (percentage === null) return "is-empty";
  if (percentage >= 100) return "is-complete";
  return percentage > 0 ? "is-partial" : "is-zero";
}

// Semana actual (lunes a domingo), como apps/mobile/src/components/
// week-strip.tsx: un punto por día, de acento si se completó todo, del color
// del texto si fue parcial y apagado si fue 0 %. Los días sin hábitos
// previstos y los futuros no llevan punto — nunca se pinta un día incompleto
// como error.
export function WeekStrip({ today, options }: WeekStripProps) {
  const monday = addDaysToDateKey(today, -getMondayFirstWeekday(today));
  const days = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(monday, index));

  return (
    <ol className="week-days" aria-label="Esta semana">
      {days.map((date) => {
        const isToday = date === today;
        const percentage =
          date > today ? null : calculateDailyCompletion(date, options).percentage;
        const status = percentage === null ? "sin datos" : `${percentage}% completado`;
        const fullDate = formatLocalDate(date, {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

        return (
          <li
            key={date}
            className={`week-day ${isToday ? "is-today" : ""}`}
            aria-current={isToday ? "date" : undefined}
          >
            <span className="week-day__name" aria-hidden="true">
              {weekdayLabel(date)}
            </span>
            <span
              className={`week-day__dot ${dotTone(percentage)}`}
              aria-hidden="true"
            />
            <span className="week-day__number" aria-hidden="true">
              {Number(date.slice(-2))}
            </span>
            <span className="sr-only">{`${fullDate}, ${isToday ? "hoy, " : ""}${status}`}</span>
          </li>
        );
      })}
    </ol>
  );
}
