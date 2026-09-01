"use client";

import { Inbox, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { type CSSProperties } from "react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function TodayPage() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const { activeHabits, completedIds } = getTodaySnapshot(snapshot);
  const completed = activeHabits.filter((habit) => completedIds.has(habit.id)).length;
  const percentage = activeHabits.length
    ? Math.round((completed / activeHabits.length) * 100)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Hoy"
        title={`Buenos días, ${snapshot.settings.displayName}`}
        description="Un paso pequeño también cuenta."
      />
      {activeHabits.length ? (
        <div className="view-grid view-grid--today">
          <Card className="progress-card">
            <div>
              <span className="section-kicker">Progreso de hoy</span>
              <strong>
                {completed} de {activeHabits.length}
              </strong>
              <p>
                {completed === activeHabits.length
                  ? "Todo listo por hoy."
                  : `Te ${activeHabits.length - completed === 1 ? "falta uno" : `faltan ${activeHabits.length - completed}`}. Sin prisa.`}
              </p>
            </div>
            <div
              className="progress-ring"
              style={{ "--progress": `${(percentage ?? 0) * 3.6}deg` } as CSSProperties}
            >
              <div>
                <strong>{percentage}%</strong>
                <span>completado</span>
              </div>
            </div>
          </Card>
          <Card className="habits-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Tu lista</span>
                <h2>Hábitos de hoy</h2>
              </div>
              <span className="quiet-badge">
                {completed}/{activeHabits.length}
              </span>
            </div>
            <div className="habit-checks">
              {activeHabits.map((habit) => (
                <Checkbox
                  key={habit.id}
                  label={habit.name}
                  description={habit.description}
                  color={habit.color}
                  checked={completedIds.has(habit.id)}
                  onChange={() => void actions.toggleToday(habit.id)}
                />
              ))}
            </div>
          </Card>
          <Card className="encouragement-card">
            <span>
              <Sparkles size={20} />
            </span>
            <div>
              <strong>Vas construyendo constancia</strong>
              <p>
                Los cambios confirmados por el servidor estarán disponibles en tus otros
                navegadores.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="empty-page-state">
          <span className="state-icon">
            <Inbox size={23} />
          </span>
          <h2>Sin hábitos para este día</h2>
          <p>Crea tu primer hábito para empezar una rutina sencilla.</p>
          <Link className="button button--primary button--default" href="/habitos">
            <Plus size={18} /> Crear un hábito
          </Link>
        </Card>
      )}
    </>
  );
}
