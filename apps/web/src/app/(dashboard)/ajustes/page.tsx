import { CloudOff, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { demoProfile } from "@/lib/demo-data";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Preferencias"
        title="Ajustes"
        description="Adapta la experiencia a tu forma de organizarte."
      />
      <div className="settings-form">
        <Card>
          <div className="account-row">
            <span className="avatar">A</span>
            <div>
              <h2>Cuenta</h2>
              <p>{demoProfile.email}</p>
            </div>
          </div>
        </Card>
        <Card className="settings-fields">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Tu contexto</span>
              <h2>Preferencias regionales</h2>
            </div>
            <SlidersHorizontal size={21} />
          </div>
          <FormField htmlFor="display-name" label="Nombre">
            <input
              id="display-name"
              name="name"
              defaultValue={demoProfile.displayName}
            />
          </FormField>
          <FormField htmlFor="locale" label="Idioma">
            <select id="locale" defaultValue="es">
              <option value="es">Español</option>
            </select>
          </FormField>
          <FormField
            htmlFor="timezone"
            label="Zona horaria"
            hint="Se usa para asignar cada check-in al día correcto."
          >
            <select
              id="timezone"
              defaultValue={demoProfile.timezone}
              aria-describedby="timezone-hint"
            >
              <option>America/Los_Angeles</option>
              <option>Europe/Madrid</option>
              <option>America/Mexico_City</option>
            </select>
          </FormField>
          <FormField htmlFor="week" label="La semana inicia">
            <select id="week" defaultValue="monday">
              <option value="monday">Lunes</option>
            </select>
          </FormField>
          <div className="form-actions">
            <Button>Guardar cambios</Button>
          </div>
        </Card>
        <Card className="offline-note">
          <span>
            <CloudOff size={20} />
          </span>
          <div>
            <strong>Trabajando con datos de demostración</strong>
            <p>
              La sincronización entre dispositivos se conectará en una fase posterior.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
