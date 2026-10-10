"use client";

import {
  formatUserCode,
  groupNameSchema,
  isPlaceholderDisplayName,
} from "@habit-tracker/domain";
import { ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { activeHabitsOf } from "@/components/groups/group-utils";
import { InviteForm } from "@/components/groups/invite-form";
import { ShareHabitsPicker } from "@/components/groups/share-habits-picker";
import { HabitFormDialog } from "@/components/habit-form-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Toast } from "@/components/ui/toast";
import { missingDisplayNameError, useGroupActions, useGroups } from "@/lib/group-store";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

type Step = 1 | 2 | 3;

export default function NewGroupPage() {
  const router = useRouter();
  const groups = useGroups();
  const actions = useGroupActions();
  const habitSnapshot = useHabitStore();
  const habitActions = useHabitActions();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [askName, setAskName] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [invited, setInvited] = useState<Array<{ code: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // "Crear un hábito nuevo": al volver del formulario, el hábito creado queda
  // marcado. Se compara con los ids que había al abrir el diálogo.
  const knownHabitIds = useRef<Set<string> | null>(null);
  const awaitingNewHabit = useRef(false);
  const [savedHabitTick, setSavedHabitTick] = useState(0);
  const activeHabits = useMemo(
    () => activeHabitsOf(habitSnapshot.habits),
    [habitSnapshot.habits],
  );

  useEffect(() => {
    if (!awaitingNewHabit.current || !knownHabitIds.current) return;
    const known = knownHabitIds.current;
    const created = activeHabits.filter((habit) => !known.has(habit.id));
    if (!created.length) return;
    awaitingNewHabit.current = false;
    knownHabitIds.current = null;
    setSelected((current) =>
      [...current, ...created.map((habit) => habit.id)].slice(0, 10),
    );
  }, [activeHabits, savedHabitTick]);

  const needsName = askName || isPlaceholderDisplayName(groups.displayName);

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = groupNameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa el nombre.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function submitHabits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await actions.createGroup({
      name,
      habitIds: selected,
      displayName: needsName ? displayName : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.error === missingDisplayNameError) setAskName(true);
      setError(result.error);
      return;
    }
    if (needsName) void habitActions.refresh();
    setError(null);
    setGroupId(result.data);
    setStep(3);
  }

  async function copyOwnCode() {
    if (!groups.userCode) return;
    try {
      await navigator.clipboard.writeText(formatUserCode(groups.userCode));
      setToast("Copiado.");
    } catch {
      setToast("No se pudo copiar. Selecciona el código y cópialo a mano.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Nuevo grupo · ${step} de 3`}
        title={
          step === 1
            ? "Nombre del grupo"
            : step === 2
              ? "Hábitos que compartes"
              : "Invita con su código"
        }
        description={
          step === 3
            ? "Invitar es opcional: también puedes hacerlo después desde los ajustes del grupo."
            : "Solo verán los hábitos que elijas y los días que los completes."
        }
      />
      {step === 1 ? (
        <form className="group-form" onSubmit={submitName} noValidate>
          <Card className="group-card group-form__card">
            <FormField
              htmlFor="group-name"
              label="Nombre del grupo"
              hint="De 1 a 60 caracteres."
            >
              <input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                placeholder="Por ejemplo, Familia"
                required
                autoFocus
                aria-describedby="group-name-hint"
              />
            </FormField>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="dialog-actions">
              <Link className="button button--secondary button--default" href="/grupos">
                <ArrowLeft size={17} /> Cancelar
              </Link>
              <Button type="submit">Siguiente</Button>
            </div>
          </Card>
        </form>
      ) : null}
      {step === 2 ? (
        <form className="group-form" onSubmit={submitHabits}>
          <Card className="group-card group-form__card">
            {needsName ? (
              <FormField
                htmlFor="group-display-name"
                label="Tu nombre en el grupo"
                hint="Es lo que verán los demás miembros. De 1 a 60 caracteres."
              >
                <input
                  id="group-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={60}
                  required
                  aria-describedby="group-display-name-hint"
                />
              </FormField>
            ) : null}
            <ShareHabitsPicker
              legend={`Elige qué hábitos compartes en «${name.trim()}»`}
              habits={activeHabits}
              selected={selected}
              onChange={setSelected}
              onCreateHabit={() => {
                knownHabitIds.current = new Set(
                  habitSnapshot.habits.map((habit) => habit.id),
                );
                setHabitDialogOpen(true);
              }}
            />
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                disabled={busy}
              >
                Atrás
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creando…" : "Crear grupo"}
              </Button>
            </div>
          </Card>
        </form>
      ) : null}
      {step === 3 && groupId ? (
        <Card className="group-card group-form__card">
          <p className="group-success" role="status">
            Grupo «{name.trim()}» creado.
          </p>
          <InviteForm
            groupId={groupId}
            onInvited={(code, message) =>
              setInvited((current) => [{ code, message }, ...current])
            }
          />
          {invited.length ? (
            <section aria-labelledby="sent-title">
              <h2 id="sent-title" className="group-subtitle">
                Enviadas
              </h2>
              <ul className="group-plain-list">
                {invited.map((item, index) => (
                  <li key={`${item.code}-${index}`}>
                    <span className="user-code user-code--small">{item.code}</span>{" "}
                    {item.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {groups.userCode ? (
            <p className="group-muted own-code-row">
              Tu código:{" "}
              <span className="user-code user-code--small">
                {formatUserCode(groups.userCode)}
              </span>
              <Button variant="ghost" onClick={() => void copyOwnCode()}>
                <Copy size={16} /> Copiar
              </Button>
            </p>
          ) : null}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => router.push(`/grupos/${groupId}`)}
            >
              Saltar
            </Button>
            <Button onClick={() => router.push(`/grupos/${groupId}`)}>
              Ir al grupo
            </Button>
          </div>
        </Card>
      ) : null}
      <HabitFormDialog
        open={habitDialogOpen}
        onClose={() => {
          setHabitDialogOpen(false);
          if (!awaitingNewHabit.current) knownHabitIds.current = null;
        }}
        onSaved={(message) => {
          awaitingNewHabit.current = true;
          // El store ya recargó los hábitos: forzar que el efecto los compare.
          setSavedHabitTick((tick) => tick + 1);
          setToast(message);
        }}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
