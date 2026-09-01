"use client";

import { userSettingsSchema } from "@habit-tracker/domain";
import { Cloud, LogOut, SlidersHorizontal } from "lucide-react";
import { type FormEvent, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Toast } from "@/components/ui/toast";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

import { logout } from "../actions";

export default function SettingsPage() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    const saved = await actions.updateSettings(result.data);
    if (!saved) return;
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
      <div
        className="settings-form"
        key={`${snapshot.settings.displayName}-${snapshot.settings.timezone}`}
      >
        <form className="settings-form-content" onSubmit={submit}>
          <Card>
            <div className="account-row">
              <span className="avatar">
                {snapshot.settings.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>Cuenta sincronizada</h2>
                <p>Tu sesión y tus datos están protegidos por Supabase.</p>
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
              <Button type="submit" disabled={snapshot.syncing}>
                Guardar cambios
              </Button>
            </div>
          </Card>
          <Card className="offline-note">
            <span>
              <Cloud size={20} />
            </span>
            <div>
              <strong>Servidor como fuente de verdad</strong>
              <p>
                Los cambios se refrescan después de cada mutación y al volver a enfocar
                la aplicación.
              </p>
            </div>
          </Card>
        </form>
        <Card>
          <form action={logout}>
            <Button type="submit" variant="secondary">
              <LogOut size={18} /> Cerrar sesión
            </Button>
          </form>
        </Card>
      </div>
      {toast ? (
        <Toast
          message="Tus preferencias se guardaron."
          onClose={() => setToast(false)}
        />
      ) : null}
    </>
  );
}
