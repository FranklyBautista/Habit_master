"use client";

import { CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorState({ error, reset }: ErrorStateProps) {
  return (
    <main className="main-content">
      <Card className="state-card state-card--error">
        <span className="state-icon">
          <CircleAlert size={22} />
        </span>
        <div>
          <h1>No pudimos cargar esta página</h1>
          <p>
            Inténtalo de nuevo. Si el problema continúa, vuelve a cargar la aplicación.
          </p>
          {error.digest ? <p>Código: {error.digest}</p> : null}
          <Button variant="secondary" onClick={reset}>
            <RotateCw size={17} /> Reintentar
          </Button>
        </div>
      </Card>
    </main>
  );
}
