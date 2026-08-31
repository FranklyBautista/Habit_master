"use client";

export const statisticsPeriods = [7, 30, 90] as const;
export type StatisticsPeriod = (typeof statisticsPeriods)[number];

type PeriodTabsProps = {
  value: StatisticsPeriod;
  onChange: (period: StatisticsPeriod) => void;
};

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div className="period-tabs" role="group" aria-label="Periodo de estadísticas">
      {statisticsPeriods.map((days) => (
        <button
          key={days}
          type="button"
          className={value === days ? "is-active" : undefined}
          aria-pressed={value === days}
          onClick={() => onChange(days)}
        >
          {days} días
        </button>
      ))}
    </div>
  );
}
