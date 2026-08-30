import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { demoHabits } from "@/lib/demo-data";

export default function TodayPage() {
  const activeHabits = demoHabits.filter((habit) => !habit.archived);
  const completed = activeHabits.filter((habit) => habit.completedToday).length;
  const percentage = Math.round((completed / activeHabits.length) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Domingo, 30 de agosto"
        title="Buenos días, Alex"
        description="Un paso pequeño también cuenta."
      />
      <div className="view-grid view-grid--today">
        <Card className="progress-card">
          <div>
            <span className="section-kicker">Progreso de hoy</span>
            <strong>
              {completed} de {activeHabits.length}
            </strong>
            <p>Solo falta uno. Sin prisa.</p>
          </div>
          <div
            className="progress-ring"
            style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}
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
                defaultChecked={habit.completedToday}
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
              Llevas cuatro días manteniendo el ritmo. Cada check suma, pero descansar
              también es parte del proceso.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
