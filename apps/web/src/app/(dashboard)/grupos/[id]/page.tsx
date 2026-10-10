"use client";

import { getGroupTodaySummary } from "@habit-tracker/domain";
import { ArrowLeft, Settings2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { activeHabitsOf } from "@/components/groups/group-utils";
import { MemberProgressCard } from "@/components/groups/member-progress-card";
import { NotMemberState } from "@/components/groups/not-member-state";
import { ShareHabitsPicker } from "@/components/groups/share-habits-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useGroupActions, useGroupProgress } from "@/lib/group-store";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { progress, loading, error, notMember, refresh } = useGroupProgress(id);
  const habitSnapshot = useHabitStore();
  const habitActions = useHabitActions();
  const actions = useGroupActions();
  const [pendingHabitId, setPendingHabitId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [manageError, setManageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (notMember) return <NotMemberState />;

  if (!progress) {
    return loading ? (
      <div className="loading-stack" aria-busy="true" aria-label="Cargando grupo">
        <Skeleton className="skeleton--title" />
        <Skeleton className="skeleton--card" />
        <Skeleton className="skeleton--card" />
      </div>
    ) : (
      <Card className="state-card state-card--error" role="alert">
        <div>
          <h2>No pudimos cargar el grupo</h2>
          <p>{error ?? "Revisa tu conexión e inténtalo de nuevo."}</p>
          <Button variant="secondary" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  const summary = getGroupTodaySummary(progress);
  const me = progress.members.find((member) => member.isMe);
  const groupId = progress.id;

  async function toggle(habitId: string) {
    setPendingHabitId(habitId);
    // Misma acción (y misma dedupe) que la casilla de Hoy; después se vuelve a
    // pedir el progreso del grupo para ver lo que confirmó el servidor.
    await habitActions.toggleToday(habitId);
    await refresh();
    setPendingHabitId(null);
  }

  function openManage() {
    setSelected(
      (me?.habits ?? []).flatMap((habit) => (habit.habitId ? [habit.habitId] : [])),
    );
    setManageError(null);
    setManageOpen(true);
  }

  async function saveShared() {
    setSaving(true);
    const result = await actions.setSharedHabits(groupId, selected);
    setSaving(false);
    if (!result.ok) {
      setManageError(result.error);
      return;
    }
    setManageOpen(false);
    setToast("Hábitos compartidos actualizados.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Grupo"
        title={progress.name}
        description={
          summary.participating
            ? `Hoy: ${summary.upToDate} de ${summary.participating} al día`
            : "Hoy nadie tiene hábitos compartidos pendientes."
        }
      />
      <nav className="group-toolbar" aria-label="Acciones del grupo">
        <Link className="button button--ghost button--default" href="/grupos">
          <ArrowLeft size={17} /> Grupos
        </Link>
        <Link
          className="button button--secondary button--default"
          href={`/grupos/${groupId}/ajustes`}
        >
          <Settings2 size={17} /> Ajustes del grupo
        </Link>
      </nav>
      {error ? (
        <div className="sync-error" role="alert">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      <div className="member-grid">
        {progress.members.map((member) => (
          <MemberProgressCard
            key={member.memberId}
            member={member}
            pendingHabitId={pendingHabitId}
            onToggleToday={member.isMe ? (habitId) => void toggle(habitId) : undefined}
          />
        ))}
      </div>
      <div className="group-actions">
        <Button variant="secondary" onClick={openManage}>
          <SlidersHorizontal size={17} /> Gestionar mis hábitos
        </Button>
      </div>
      <Dialog
        open={manageOpen}
        title="Mis hábitos en este grupo"
        description="Los demás verán el nombre y los días completados de los que marques."
        onClose={() => setManageOpen(false)}
      >
        <div className="group-dialog-body">
          <ShareHabitsPicker
            legend="Hábitos que compartes"
            habits={activeHabitsOf(habitSnapshot.habits)}
            selected={selected}
            onChange={setSelected}
          />
          {manageError ? (
            <p className="form-error" role="alert">
              {manageError}
            </p>
          ) : null}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setManageOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveShared()} disabled={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
