"use client";

import { userSettingsSchema } from "@habit-tracker/domain";
import { CloudOff, SlidersHorizontal } from "lucide-react";
import { type FormEvent, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Toast } from "@/components/ui/toast";
import { habitActions, useHabitStore } from "@/lib/habit-store";

export default function SettingsPage() {
  const snapshot = useHabitStore();
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = userSettingsSchema.safeParse({
      displayName: form.get("name"),
      timezone: form.get("timezone"),
      locale: "es",
      weekStartsOn: 1,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa las preferencias.");
      return;
    }
    habitActions.updateSettings(result.data);
    setError(null);
    setToast(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Preferencias"
        title="Ajustes"
        description="Adapta la experiencia a tu forma de organizarte."
      />
      <form
        className="settings-form"
        key={`${snapshot.settings.displayName}-${snapshot.settings.timezone}`}
        onSubmit={submit}
      >
        <Card>
          <div className="account-row">
            <span className="avatar">
              {snapshot.settings.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2>Cuenta local</h2>
              <p>Los datos viven únicamente en este navegador.</p>
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
              defaultValue={snapshot.settings.displayName}
              maxLength={60}
              required
            />
          </FormField>
          <FormField htmlFor="locale" label="Idioma">
            <select id="locale" defaultValue="es" disabled>
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
              name="timezone"
              defaultValue={snapshot.settings.timezone}
              aria-describedby="timezone-hint"
            >
              <option>America/Los_Angeles</option>
              <option>America/Mexico_City</option>
              <option>America/Bogota</option>
              <option>Europe/Madrid</option>
            </select>
          </FormField>
          <FormField htmlFor="week" label="La semana inicia">
            <select id="week" defaultValue="monday" disabled>
              <option value="monday">Lunes</option>
            </select>
          </FormField>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <Button type="submit">Guardar cambios</Button>
          </div>
        </Card>
        <Card className="offline-note">
          <span>
            <CloudOff size={20} />
          </span>
          <div>
            <strong>Persistencia local activa</strong>
            <p>
              Puedes cerrar o recargar esta pestaña sin perder tus hábitos. La
              sincronización llegará en una fase posterior.
            </p>
          </div>
        </Card>
      </form>
      {toast ? (
        <Toast
          message="Tus preferencias se guardaron."
          onClose={() => setToast(false)}
        />
      ) : null}
    </>
  );
}
