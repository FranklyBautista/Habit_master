"use client";

import { isPlaceholderDisplayName } from "@habit-tracker/domain";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { activeHabitsOf, membersLabel } from "@/components/groups/group-utils";
import { ShareHabitsPicker } from "@/components/groups/share-habits-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { missingDisplayNameError, useGroupActions, useGroups } from "@/lib/group-store";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function InvitationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const groups = useGroups();
  const actions = useGroupActions();
  const habitSnapshot = useHabitStore();
  const habitActions = useHabitActions();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invitation = groups.invitations.find((item) => item.id === id);
  const needsName = askName || isPlaceholderDisplayName(groups.displayName);

  if (!groups.hydrated) {
    return (
      <div className="loading-stack" aria-busy="true" aria-label="Cargando invitación">
        <Skeleton className="skeleton--title" />
        <Skeleton className="skeleton--card" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <>
        <PageHeader
          title="Invitación"
          description="Las invitaciones caducan a los 7 días."
        />
        <Card className="empty-page-state">
          <h2>Esta invitación ya no está disponible</h2>
          <p>
            Puede que haya caducado, que la hayan cancelado o que ya la respondieras.
          </p>
          <Link className="button button--secondary button--default" href="/grupos">
            <ArrowLeft size={17} /> Volver a grupos
          </Link>
        </Card>
      </>
    );
  }

  const current = invitation;

  async function respond(accept: boolean) {
    setBusy(true);
    const result = await actions.respondInvitation({
      invitationId: current.id,
      accept,
      habitIds: accept ? selected : undefined,
      displayName: accept && needsName ? name : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.error === missingDisplayNameError) setAskName(true);
      setError(result.error);
      return;
    }
    if (!accept) {
      router.push("/grupos");
      return;
    }
    if (needsName) void habitActions.refresh();
    router.push(`/grupos/${current.groupId}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void respond(true);
  }

  return (
    <>
      <PageHeader
        title={`Unirte a «${current.groupName}»`}
        description={`Dueño: ${current.inviterName ?? "sin nombre"} · ${membersLabel(current.memberCount)}`}
      />
      <form className="group-form" onSubmit={submit}>
        <Card className="group-card group-form__card">
          {needsName ? (
            <FormField
              htmlFor="group-display-name"
              label="Tu nombre en el grupo"
              hint="Es lo que verán los demás miembros. De 1 a 60 caracteres."
            >
              <input
                id="group-display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                required
                aria-describedby="group-display-name-hint"
              />
            </FormField>
          ) : null}
          <ShareHabitsPicker
            legend="¿Qué hábitos compartes?"
            habits={activeHabitsOf(habitSnapshot.habits)}
            selected={selected}
            onChange={setSelected}
          />
          <p className="group-note">
            Los demás verán el nombre y los días completados. Nada más de tu cuenta.
          </p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => void respond(false)}
              disabled={busy}
            >
              Rechazar
            </Button>
            <Button type="submit" disabled={busy}>
              Unirme
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
