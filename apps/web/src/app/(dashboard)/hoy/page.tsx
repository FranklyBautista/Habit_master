"use client";

import { calculateStreaks, formatLocalDate } from "@habit-tracker/domain";
import { Flame, Inbox, Plus, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { GroupsTodayCard } from "@/components/groups/groups-today-card";
import { habitIconComponents } from "@/components/habit-icons";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WeekStrip } from "@/components/week-strip";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

// Saludo según la hora en la zona del usuario, no la del servidor.
function greeting(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

// Composición de la pantalla Hoy de móvil (apps/mobile/src/app/(app)/index.tsx):
// saludo con la fecha, cifras rápidas, semana, grupos, progreso con anillo y
// la lista de hábitos. En escritorio se reparte en dos columnas.
export default function TodayPage() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const { today, activeHabits, completedIds } = getTodaySnapshot(snapshot);
  const completed = activeHabits.filter((habit) => completedIds.has(habit.id)).length;
  const percentage = activeHabits.length
    ? Math.round((completed / activeHabits.length) * 100)
    : null;
  const remaining = activeHabits.length - completed;

  const { settings } = snapshot;
  const options = {
    habits: snapshot.habits,
    checkins: snapshot.checkins,
    timezone: settings.timezone,
  };
  const streaks = calculateStreaks(today, options);
  const dateLabel = formatLocalDate(today, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const initial = settings.displayName.slice(0, 1).toUpperCase() || "?";

  return (
    <>
      <header className="today-header">
        <div>
          <p className="today-header__date">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </p>
          <h1>
            {greeting(settings.timezone)}, {settings.displayName}
          </h1>
        </div>
        <Link className="avatar-ring" href="/ajustes" aria-label="Abrir ajustes">
          <span aria-hidden="true">{initial}</span>
        </Link>
      </header>

      <div className="today-layout">
        <div className="today-overview">
          <dl className="today-stats">
            <Stat
              icon={<Target size={18} />}
              label="Hoy"
              value={percentage === null ? "—" : `${percentage}%`}
            />
            <Stat icon={<Flame size={18} />} label="Racha" value={streaks.current} />
            <Stat
              icon={<Trophy size={18} />}
              label="Mejor racha"
              value={streaks.best}
            />
          </dl>

          <WeekStrip today={today} options={options} />

          {activeHabits.length ? (
            <Card className="progress-card" aria-labelledby="progress-title">
              <div className="progress-card__copy">
                <span className="section-kicker">Progreso de hoy</span>
                <h2 id="progress-title">
                  {remaining === 0 ? "¡Todo listo!" : "Sigue así"}
                </h2>
                <p>
                  {remaining === 0
                    ? streaks.current > 1
                      ? `${streaks.current} días seguidos completando todo.`
                      : "Completaste todos tus hábitos de hoy."
                    : `Te ${remaining === 1 ? "falta uno" : `faltan ${remaining}`}. Sin prisa.`}
                </p>
              </div>
              <ProgressRing
                percentage={percentage}
                label="Progreso de hoy"
                valueText={`${completed} de ${activeHabits.length} hábitos, ${percentage}%`}
              >
                <strong>
                  {completed}/{activeHabits.length}
                </strong>
              </ProgressRing>
            </Card>
          ) : null}

          <GroupsTodayCard />
        </div>

        {activeHabits.length ? (
          <section className="today-habits" aria-labelledby="today-habits-title">
            <div className="list-heading">
              <h2 id="today-habits-title">Tus hábitos</h2>
              <span>
                {completed} de {activeHabits.length}
              </span>
            </div>
            <div className="habit-checks">
              {activeHabits.map((habit) => {
                const Icon = habitIconComponents[habit.icon];
                return (
                  <Checkbox
                    key={habit.id}
                    label={habit.name}
                    description={habit.description}
                    color={habit.color}
                    icon={<Icon size={20} />}
                    checked={completedIds.has(habit.id)}
                    onChange={() => void actions.toggleToday(habit.id)}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <Card className="empty-page-state today-empty">
            <span className="state-icon">
              <Inbox size={26} />
            </span>
            <h2>Sin hábitos para este día</h2>
            <p>Crea tu primer hábito para empezar una rutina sencilla.</p>
            <Link className="button button--primary button--default" href="/habitos">
              <Plus size={18} /> Crear un hábito
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    // dt antes que dd (orden válido de <dl>); el CSS pone la cifra arriba.
    <div className="today-stat">
      <dt>{label}</dt>
      <dd>
        <span aria-hidden="true">{icon}</span>
        {value}
      </dd>
    </div>
  );
}
