"use client";

import { userSettingsSchema } from "@habit-tracker/domain";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { UserCodeCard } from "@/components/groups/user-code-card";
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
      // Solo se edita el nombre: la zona la mantiene sincronizada el store con
      // la del navegador.
      timezone: snapshot.settings.timezone,
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
        title="Ajustes"
        description="Tu nombre, tu zona horaria y tu código para grupos."
      />
      <div
        className="settings-form"
        key={`${snapshot.settings.displayName}-${snapshot.settings.timezone}`}
      >
        <form onSubmit={submit}>
          <Card className="settings-fields">
            <div className="account-row">
              <span className="avatar" aria-hidden="true">
                {snapshot.settings.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>Tu perfil</h2>
                <p>
                  Tus hábitos se guardan en tu cuenta y se sincronizan entre tus
                  dispositivos.
                </p>
              </div>
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
            <FormField
              htmlFor="timezone"
              label="Zona horaria"
              hint="Se toma del reloj de tu dispositivo para que cada hábito cuente en el día correcto."
            >
              <input
                id="timezone"
                value={snapshot.settings.timezone}
                readOnly
                aria-describedby="timezone-hint"
              />
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
        </form>
        <UserCodeCard />
        <Card className="settings-footer">
          <Link className="privacy-link" href="/privacidad">
            Política de privacidad
          </Link>
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
