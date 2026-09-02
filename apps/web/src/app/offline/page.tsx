import { WifiOff } from "lucide-react";

import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <main className="main-content">
      <Card className="state-card">
        <span className="state-icon">
          <WifiOff size={22} />
        </span>
        <div>
          <h1>Sin conexión</h1>
          <p>
            No pudimos cargar Constancia porque no hay conexión a internet. Tus hábitos
            y check-ins no se pueden consultar ni modificar sin conexión todavía; vuelve
            a intentarlo cuando te reconectes.
          </p>
        </div>
      </Card>
    </main>
  );
}
