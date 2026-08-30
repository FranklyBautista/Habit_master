import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoCalendar } from "@/lib/demo-data";

function calendarTone(value: number) {
  if (value <= 50) return "tone-low";
  if (value <= 75) return "tone-mid";
  return "tone-high";
}

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Agosto de 2026"
        title="Calendario"
        description="Mira tu constancia sin juzgar los días incompletos."
      />
      <div className="view-grid view-grid--calendar">
        <Card className="calendar-card">
          <div className="calendar-toolbar">
            <button className="select-button">
              General <ChevronDown size={17} />
            </button>
            <div className="month-controls">
              <Button variant="ghost" size="icon" aria-label="Mes anterior">
                <ChevronLeft size={20} />
              </Button>
              <strong>Agosto</strong>
              <Button variant="ghost" size="icon" aria-label="Mes siguiente">
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
          <div className="calendar-grid calendar-weekdays" aria-hidden="true">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid" role="group" aria-label="Agosto de 2026">
            {demoCalendar.map((value, index) =>
              value === null ? (
                <span key={`empty-${index}`} />
              ) : (
                <button
                  key={index}
                  className={`calendar-day ${calendarTone(value)} ${index === 31 ? "is-today" : ""}`}
                  aria-label={`${index - 4} de agosto, ${value}% completado`}
                >
                  <span>{index - 4}</span>
                  <i />
                </button>
              ),
            )}
          </div>
          <div className="calendar-legend">
            <span>Menos</span>
            <i className="tone-none" />
            <i className="tone-low" />
            <i className="tone-mid" />
            <i className="tone-high" />
            <span>Más</span>
          </div>
        </Card>
        <Card className="day-summary">
          <span className="section-kicker">Domingo 30</span>
          <h2>Un buen día</h2>
          <strong>3 de 4</strong>
          <p>
            Completaste el 75 % de tus hábitos. Caminar quedó pendiente y puedes
            retomarlo mañana.
          </p>
          <div className="mini-habits">
            <span>
              <CheckCircle2 size={17} /> Meditar
            </span>
            <span>
              <CheckCircle2 size={17} /> Leer
            </span>
            <span>
              <CheckCircle2 size={17} /> Preparar el día
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
