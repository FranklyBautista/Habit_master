"use client";

import type { HabitComparison } from "@habit-tracker/domain";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";

type TrendPoint = { date: string; label: string; percentage: number | null };
type StatisticsChartsProps = { trend: TrendPoint[]; comparison: HabitComparison[] };

export function StatisticsCharts({ trend, comparison }: StatisticsChartsProps) {
  return (
    <div className="charts-grid">
      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Constancia</span>
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
                <stop offset="5%" stopColor="#047857" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#047857" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Cumplimiento"]}
              labelFormatter={(_, payload) => payload[0]?.payload.date ?? ""}
            />
            <Legend formatter={() => "Cumplimiento diario"} />
            <Area
              type="monotone"
              dataKey="percentage"
              name="Cumplimiento"
              stroke="#047857"
              strokeWidth={3}
              fill="url(#completion-fill)"
              connectNulls={false}
            />
          </AreaChart>
        </div>
      </Card>
      <Card className="chart-card">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Comparación</span>
            <h2>Cumplimiento por hábito</h2>
          </div>
          <span className="chart-legend blue">
            <i /> Porcentaje
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
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => [`${value}%`, "Cumplimiento"]} />
            <Legend formatter={() => "Cumplimiento por hábito"} />
            <Bar
              dataKey="percentage"
              name="Cumplimiento"
              fill="#0369a1"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </div>
      </Card>
    </div>
  );
}
