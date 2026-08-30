import {
  Archive,
  BookOpen,
  Brain,
  Footprints,
  GripVertical,
  ListChecks,
  type LucideIcon,
  NotebookPen,
  RotateCcw,
} from "lucide-react";

import { CreateHabitDemo } from "@/components/create-habit-demo";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type DemoHabit, demoHabits } from "@/lib/demo-data";

const icons: Record<DemoHabit["icon"], LucideIcon> = {
  brain: Brain,
  "book-open": BookOpen,
  footprints: Footprints,
  "list-checks": ListChecks,
  "notebook-pen": NotebookPen,
};

export default function HabitsPage() {
  const activeHabits = demoHabits.filter((habit) => !habit.archived);
  const archivedHabits = demoHabits.filter((habit) => habit.archived);
  return (
    <>
      <PageHeader
        eyebrow="Tu rutina"
        title="Hábitos"
        description="Organiza lo que quieres repetir cada día."
        action={<CreateHabitDemo compact />}
      />
      <div className="view-grid view-grid--habits">
        <Card className="habits-manage-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">En tu día</span>
              <h2>
                Activos <span className="count">{activeHabits.length}</span>
              </h2>
            </div>
            <div className="desktop-only">
              <CreateHabitDemo />
            </div>
          </div>
          <div className="habit-manage-list">
            {activeHabits.map((habit) => {
              const Icon = icons[habit.icon];
              return (
                <article className="habit-manage-row" key={habit.id}>
                  <button
                    className="drag-handle"
                    aria-label={`Reordenar ${habit.name}`}
                  >
                    <GripVertical size={20} />
                  </button>
                  <span
                    className="habit-icon"
                    style={{ backgroundColor: `${habit.color}18`, color: habit.color }}
                  >
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{habit.name}</strong>
                    <span>{habit.description ?? "Hábito diario"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Archivar ${habit.name}`}
                    title="Archivar"
                  >
                    <Archive size={19} />
                  </Button>
                </article>
              );
            })}
          </div>
        </Card>
        <div className="aside-stack">
          <Card className="archive-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Historial</span>
                <h2>Archivados</h2>
              </div>
              <span className="quiet-badge">{archivedHabits.length}</span>
            </div>
            {archivedHabits.map((habit) => {
              const Icon = icons[habit.icon];
              return (
                <article className="archived-row" key={habit.id}>
                  <span className="habit-icon is-muted" style={{ color: habit.color }}>
                    <Icon size={19} />
                  </span>
                  <span>{habit.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Restaurar ${habit.name}`}
                    title="Restaurar"
                  >
                    <RotateCcw size={18} />
                  </Button>
                </article>
              );
            })}
          </Card>
        </div>
      </div>
    </>
  );
}
