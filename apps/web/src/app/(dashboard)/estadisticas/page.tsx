import { Sparkles, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { demoTrend } from "@/lib/demo-data";

export default function StatisticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Últimos 30 días"
        title="Estadísticas"
        description="Una lectura clara de tu progreso reciente."
      />
      <div className="view-grid view-grid--stats">
        <div className="period-tabs" role="group" aria-label="Periodo de estadísticas">
          <button>7 días</button>
          <button className="is-active" aria-pressed="true">
            30 días
          </button>
          <button>90 días</button>
        </div>
        <div className="metric-grid">
          <Card className="metric-card">
            <span className="metric-icon">
              <Target size={20} />
            </span>
            <span>Cumplimiento</span>
            <strong>78%</strong>
            <small>+6 % frente al periodo anterior</small>
          </Card>
          <Card className="metric-card">
            <span className="metric-icon blue">
              <TrendingUp size={20} />
            </span>
            <span>Racha actual</span>
            <strong>4 días</strong>
            <small>Tu mejor racha es de 8 días</small>
          </Card>
        </div>
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Constancia</span>
              <h2>Tendencia reciente</h2>
            </div>
            <span className="positive-pill">+6%</span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label="Gráfica de demostración con una tendencia ascendente en los últimos catorce días"
          >
            {demoTrend.map((value, index) => (
              <span key={index} style={{ height: `${value}%` }}>
                <i>{value}%</i>
              </span>
            ))}
          </div>
          <div className="chart-labels">
            <span>17 ago</span>
            <span>23 ago</span>
            <span>30 ago</span>
          </div>
        </Card>
        <Card className="insight-card">
          <span>
            <Sparkles size={20} />
          </span>
          <div>
            <strong>Tu mejor momento es el fin de semana</strong>
            <p>
              Los sábados y domingos completas un 12 % más. Esta lectura usa datos
              ficticios para validar el diseño.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
