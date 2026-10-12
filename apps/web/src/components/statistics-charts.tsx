"use client";

import type { HabitComparison } from "@habit-tracker/domain";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";

type TrendPoint = { date: string; label: string; percentage: number | null };
type StatisticsChartsProps = { trend: TrendPoint[]; comparison: HabitComparison[] };

// Colores del sistema visual como variables CSS: las gráficas cambian con el
// modo claro/oscuro sin volver a renderizar. Tendencia en `--tint` (texto e
// iconos, legible sobre la superficie) con relleno de `--accent`; las barras
// usan el color de cada hábito, como la comparación de móvil.
const axisTick = { fill: "var(--muted)", fontSize: 12 };
const gridStroke = "var(--border-soft)";
const tooltipStyles = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border-soft)",
    borderRadius: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted)" },
  itemStyle: { color: "var(--foreground)" },
  cursor: { fill: "var(--surface-selected)", stroke: "var(--border)" },
};

export function StatisticsCharts({ trend, comparison }: StatisticsChartsProps) {
  return (
    <div className="charts-grid">
      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <h2>Cumplimiento diario</h2>
          </div>
          <span className="chart-legend">
            <i /> Porcentaje
          </span>
        </div>
        <div
          className="recharts-frame"
          role="region"
          aria-label="Gráfica de área del cumplimiento diario"
        >
          <AreaChart
            responsive
            style={{ width: "100%", height: "100%" }}
            data={trend}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="completion-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  style={{ stopColor: "var(--accent)", stopOpacity: 0.45 }}
                />
                <stop
                  offset="95%"
                  style={{ stopColor: "var(--accent)", stopOpacity: 0.02 }}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="label"
              minTickGap={24}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <Tooltip
              {...tooltipStyles}
              cursor={{ stroke: "var(--border)" }}
              formatter={(value) => [`${value}%`, "Cumplimiento"]}
              labelFormatter={(_, payload) => payload[0]?.payload.date ?? ""}
            />
            <Area
              type="monotone"
              dataKey="percentage"
              name="Cumplimiento"
              stroke="var(--tint)"
              strokeWidth={3}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--tint)" }}
              fill="url(#completion-fill)"
              connectNulls={false}
            />
          </AreaChart>
        </div>
      </Card>
      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <h2>Cumplimiento por hábito</h2>
          </div>
          <span className="chart-legend chart-legend--habits">
            <i /> Color de cada hábito
          </span>
        </div>
        <div
          className="recharts-frame"
          role="region"
          aria-label="Gráfica de barras del cumplimiento por hábito"
        >
          <BarChart
            responsive
            style={{ width: "100%", height: "100%" }}
            data={comparison}
            layout="vertical"
            margin={{ top: 12, right: 16, left: 8, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke={gridStroke}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ ...axisTick, fill: "var(--foreground)" }}
            />
            <Tooltip
              {...tooltipStyles}
              formatter={(value) => [`${value}%`, "Cumplimiento"]}
            />
            <Bar
              dataKey="percentage"
              name="Cumplimiento"
              fill="var(--tint)"
              radius={[0, 8, 8, 0]}
              maxBarSize={24}
              background={{ fill: "var(--surface-selected)", radius: 8 }}
            >
              {comparison.map((habit) => (
                <Cell key={habit.habitId} fill={habit.color} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </Card>
    </div>
  );
}
