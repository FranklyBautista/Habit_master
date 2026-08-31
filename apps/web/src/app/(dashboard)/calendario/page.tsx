"use client";

import {
  addMonthsToDateKey,
  calculateDailyCompletion,
  formatLocalDate,
  getLocalDateKey,
  getMondayFirstWeekday,
  getMonthDateKeys,
  isHabitActiveOnDate,
} from "@habit-tracker/domain";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHabitStore } from "@/lib/habit-store";

function calendarTone(value: number | null) {
  if (value === null) return "tone-none";
  if (value === 0) return "tone-zero";
  if (value < 100) return value <= 50 ? "tone-low" : "tone-mid";
  return "tone-high";
}

export default function CalendarPage() {
  const snapshot = useHabitStore();
  const today = getLocalDateKey(new Date(), snapshot.settings.timezone);
  const [monthKey, setMonthKey] = useState(`${today.slice(0, 7)}-01`);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState("general");
  const monthDates = useMemo(() => getMonthDateKeys(monthKey), [monthKey]);
  const leadingCells = getMondayFirstWeekday(monthDates[0]);
  const monthMetrics = useMemo(
    () =>
      monthDates.map((date) =>
        calculateDailyCompletion(date, {
          habits: snapshot.habits,
          checkins: snapshot.checkins,
          timezone: snapshot.settings.timezone,
          habitId: scope === "general" ? undefined : scope,
        }),
      ),
    [monthDates, scope, snapshot.checkins, snapshot.habits, snapshot.settings.timezone],
  );
  const selectedMetrics = calculateDailyCompletion(selectedDate, {
    habits: snapshot.habits,
    checkins: snapshot.checkins,
    timezone: snapshot.settings.timezone,
    habitId: scope === "general" ? undefined : scope,
  });
  const completedIds = new Set(
    snapshot.checkins
      .filter((checkin) => checkin.checkinDate === selectedDate)
      .map((checkin) => checkin.habitId),
  );
  const expectedHabits = snapshot.habits.filter(
    (habit) =>
      (scope === "general" || habit.id === scope) &&
      isHabitActiveOnDate(habit, selectedDate, snapshot.settings.timezone),
  );

  function changeMonth(amount: number) {
    const nextMonth = addMonthsToDateKey(monthKey, amount);
    setMonthKey(nextMonth);
    setSelectedDate(today.startsWith(nextMonth.slice(0, 7)) ? today : nextMonth);
  }

  const monthLabel = formatLocalDate(monthKey, { month: "long", year: "numeric" });
  const selectedLabel = formatLocalDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <PageHeader
        eyebrow={monthLabel}
        title="Calendario"
        description="El color representa el porcentaje cumplido, no una cantidad absoluta."
      />
      <div className="view-grid view-grid--calendar">
        <Card className="calendar-card">
          <div className="calendar-toolbar">
            <label className="calendar-scope">
              <span className="sr-only">Vista del calendario</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="general">Resumen general</option>
                {snapshot.habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="month-controls">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mes anterior"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={20} />
              </Button>
              <strong aria-live="polite">{monthLabel}</strong>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mes siguiente"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
          <div className="calendar-grid calendar-weekdays" aria-hidden="true">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid" role="group" aria-label={monthLabel}>
            {Array.from({ length: leadingCells }, (_, index) => (
              <span key={`empty-${index}`} aria-hidden="true" />
            ))}
            {monthMetrics.map((metrics) => {
              const dateLabel = formatLocalDate(metrics.date, {
                day: "numeric",
                month: "long",
              });
              const status =
                metrics.percentage === null
                  ? "sin hábitos previstos"
                  : `${metrics.percentage}% completado`;
              return (
                <button
                  key={metrics.date}
                  className={`calendar-day ${calendarTone(metrics.percentage)} ${metrics.date === today ? "is-today" : ""} ${metrics.date === selectedDate ? "is-selected" : ""}`}
                  aria-label={`${dateLabel}, ${status}`}
                  aria-pressed={metrics.date === selectedDate}
                  onClick={() => setSelectedDate(metrics.date)}
                >
                  <span>{Number(metrics.date.slice(-2))}</span>
                  <i aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div
            className="calendar-legend"
            role="list"
            aria-label="Leyenda de cumplimiento"
          >
            <span role="listitem">
              <i className="tone-none" /> Sin datos
            </span>
            <span role="listitem">
              <i className="tone-zero" /> 0%
            </span>
            <span role="listitem">
              <i className="tone-mid" /> Parcial
            </span>
            <span role="listitem">
              <i className="tone-high" /> 100%
            </span>
          </div>
        </Card>
        <Card className="day-summary" aria-live="polite">
          <span className="section-kicker">{selectedLabel}</span>
          <h2>
            {selectedMetrics.percentage === null
              ? "Sin datos para este día"
              : selectedMetrics.percentage === 100
                ? "Día completo"
                : "Progreso del día"}
          </h2>
          <strong>
            {selectedMetrics.completed} de {selectedMetrics.expected}
          </strong>
          <p>
            {selectedMetrics.percentage === null
              ? "Ningún hábito contaba todavía en esta fecha."
              : `${selectedMetrics.percentage}% de los hábitos previstos fue completado.`}
          </p>
          {expectedHabits.length ? (
            <div className="mini-habits">
              {expectedHabits.map((habit) => (
                <span key={habit.id}>
                  {completedIds.has(habit.id) ? (
                    <CheckCircle2 size={17} aria-hidden="true" />
                  ) : (
                    <Circle size={17} aria-hidden="true" />
                  )}
                  {habit.name}
                  <span className="sr-only">
                    {completedIds.has(habit.id) ? ", completado" : ", pendiente"}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
