import { CircleAlert, Inbox, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="state-card">
      <span className="state-icon">
        <Inbox size={22} />
      </span>
      <div>
        <h2>Sin hábitos archivados</h2>
        <p>Cuando archives uno, aparecerá aquí sin perder su historial.</p>
      </div>
    </Card>
  );
}

export function ErrorState() {
  return (
    <Card className="state-card state-card--error">
      <span className="state-icon">
        <CircleAlert size={22} />
      </span>
      <div>
        <h2>No pudimos actualizar esta sección</h2>
        <p>Tus datos visibles siguen disponibles. Inténtalo de nuevo.</p>
        <Button variant="secondary">
          <RotateCw size={17} /> Reintentar
        </Button>
      </div>
    </Card>
  );
}
