"use client";

import {
  calculatePeriodMetrics,
  calculateStreaks,
  compareHabits,
  formatLocalDate,
  getLocalDateKey,
  getPeriodStartDate,
} from "@habit-tracker/domain";
import { CalendarDays, Flame, Medal, Target } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { PeriodTabs, type StatisticsPeriod } from "@/components/period-tabs";
import { Card } from "@/components/ui/card";
import { useHabitStore } from "@/lib/habit-store";

const StatisticsCharts = dynamic(
  () =>
    import("@/components/statistics-charts").then((module) => module.StatisticsCharts),
  {
    ssr: false,
    loading: () => <div className="chart-loading">Preparando las gráficas…</div>,
  },
);

export default function StatisticsPage() {
  const snapshot = useHabitStore();
  const [period, setPeriod] = useState<StatisticsPeriod>(30);
  const today = getLocalDateKey(new Date(), snapshot.settings.timezone);
  const options = useMemo(
    () => ({
      habits: snapshot.habits,
      checkins: snapshot.checkins,
      timezone: snapshot.settings.timezone,
    }),
    [snapshot.checkins, snapshot.habits, snapshot.settings.timezone],
  );
  const summaries = useMemo(
    () =>
      [1, 7, 30, 90].map((days) =>
        calculatePeriodMetrics(getPeriodStartDate(today, days), today, options),
      ),
    [options, today],
  );
  const selected = calculatePeriodMetrics(
    getPeriodStartDate(today, period),
    today,
    options,
  );
  const streaks = useMemo(() => calculateStreaks(today, options), [options, today]);
  const comparison = compareHabits(selected.startDate, today, options);
  const trend = selected.days.map((day) => ({
    date: day.date,
    label: formatLocalDate(day.date, { day: "numeric", month: "short" }),
    percentage: day.percentage,
  }));

  return (
    <>
      <PageHeader
        eyebrow={`Últimos ${period} días`}
        title="Estadísticas"
        description="Las cifras cuentan solo los días en que cada hábito estaba activo."
      />
      <div className="view-grid view-grid--stats">
        <PeriodTabs value={period} onChange={setPeriod} />
        <div className="summary-grid">
          {summaries.map((summary, index) => (
            <Card className="summary-card" key={summary.startDate}>
              <span>{index === 0 ? "Hoy" : `${[7, 30, 90][index - 1]} días`}</span>
              <strong>
                {summary.percentage === null ? "—" : `${summary.percentage}%`}
              </strong>
              <small>
                {summary.expected
                  ? `${summary.completed} de ${summary.expected} registros`
                  : "Sin hábitos previstos"}
              </small>
            </Card>
          ))}
        </div>
        <div className="metric-grid">
          <Card className="metric-card">
            <span className="metric-icon">
              <Target size={20} />
            </span>
            <span>Cumplimiento del periodo</span>
            <strong>
              {selected.percentage === null ? "—" : `${selected.percentage}%`}
            </strong>
            <small>
              {selected.completed} de {selected.expected} check-ins esperados
            </small>
          </Card>
          <Card className="metric-card">
            <span className="metric-icon blue">
              <Flame size={20} />
            </span>
            <span>Racha actual</span>
            <strong>{streaks.current} días</strong>
            <small>Puede continuar desde ayer si hoy aún está incompleto</small>
          </Card>
          <Card className="metric-card">
            <span className="metric-icon amber">
              <Medal size={20} />
            </span>
            <span>Mejor racha</span>
            <strong>{streaks.best} días</strong>
            <small>Días completos consecutivos</small>
          </Card>
        </div>
        {selected.expected ? (
          <StatisticsCharts trend={trend} comparison={comparison} />
        ) : (
          <Card className="statistics-empty">
            <CalendarDays size={24} />
            <h2>Sin datos en este periodo</h2>
            <p>Crea o marca hábitos para ver la tendencia y la comparación.</p>
          </Card>
        )}
        <Card className="accessible-summary">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Alternativa textual</span>
              <h2>Resumen por hábito</h2>
            </div>
          </div>
          {comparison.length ? (
            <div
              className="comparison-table-wrapper"
              role="region"
              tabIndex={0}
              aria-label="Tabla desplazable de cumplimiento por hábito"
            >
              <table>
                <thead>
                  <tr>
                    <th>Hábito</th>
                    <th>Completados</th>
                    <th>Esperados</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((habit) => (
                    <tr key={habit.habitId}>
                      <th scope="row">{habit.name}</th>
                      <td>{habit.completed}</td>
                      <td>{habit.expected}</td>
                      <td>{habit.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay hábitos que comparar en estas fechas.</p>
          )}
        </Card>
      </div>
    </>
  );
}
