"use client";

import type { Habit } from "@habit-tracker/domain";
import { Archive, ArrowDown, ArrowUp, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { HabitFormDialog } from "@/components/habit-form-dialog";
import { habitIconComponents } from "@/components/habit-icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/status-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { useHabitActions, useHabitStore } from "@/lib/habit-store";

export default function HabitsPage() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const activeHabits = snapshot.habits
    .filter((habit) => !habit.archivedAt)
    .sort((a, b) => a.position - b.position);
  const archivedHabits = snapshot.habits
    .filter((habit) => habit.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  function openCreate() {
    setEditingHabit(null);
    setDialogOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setDialogOpen(true);
  }
  async function archive(habit: Habit) {
    if (await actions.archiveHabit(habit.id)) {
      setToast(`${habit.name} se archivó sin perder su historial.`);
    }
  }
  async function restore(habit: Habit) {
    if (await actions.restoreHabit(habit.id)) {
      setToast(`${habit.name} vuelve a estar activo.`);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Tu rutina"
        title="Hábitos"
        description="Crea, ordena y cuida lo que quieres repetir cada día."
        action={
          // Redondo con "+" en el teléfono (como móvil) y con texto en
          // escritorio; el nombre accesible es el mismo en ambos.
          <Button className="create-habit-button" onClick={openCreate}>
            <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
            <span className="create-habit-button__label">Crear hábito</span>
          </Button>
        }
      />
      <div className="view-grid view-grid--habits">
        <section className="habit-section" aria-labelledby="active-habits-title">
          <h2 id="active-habits-title" className="list-heading">
            Activos <span className="count">{activeHabits.length}</span>
          </h2>
          {activeHabits.length ? (
            <div className="habit-manage-list">
              {activeHabits.map((habit, index) => {
                const Icon = habitIconComponents[habit.icon];
                return (
                  <article className="habit-manage-row" key={habit.id}>
                    <div className="order-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void actions.moveHabit(habit.id, -1)}
                        disabled={index === 0}
                        aria-label={`Subir ${habit.name}`}
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void actions.moveHabit(habit.id, 1)}
                        disabled={index === activeHabits.length - 1}
                        aria-label={`Bajar ${habit.name}`}
                      >
                        <ArrowDown size={16} />
                      </Button>
                    </div>
                    <span
                      className="habit-icon"
                      style={{ backgroundColor: habit.color }}
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </span>
                    <div className="habit-manage-copy">
                      <strong>{habit.name}</strong>
                      <span>{habit.description ?? "Hábito diario"}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(habit)}
                      aria-label={`Editar ${habit.name}`}
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void archive(habit)}
                      aria-label={`Archivar ${habit.name}`}
                      title="Archivar"
                    >
                      <Archive size={18} />
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <Card className="inline-empty">
              <p>No tienes hábitos activos.</p>
              <Button onClick={openCreate}>
                <Plus size={18} /> Crear el primero
              </Button>
            </Card>
          )}
        </section>
        <section className="habit-section" aria-labelledby="archived-habits-title">
          <h2 id="archived-habits-title" className="list-heading">
            Archivados <span className="count">{archivedHabits.length}</span>
          </h2>
          {archivedHabits.length ? (
            <div className="habit-manage-list">
              {archivedHabits.map((habit) => {
                const Icon = habitIconComponents[habit.icon];
                return (
                  <article className="archived-row" key={habit.id}>
                    <span className="habit-icon is-muted" aria-hidden="true">
                      <Icon size={19} />
                    </span>
                    <span>{habit.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="restore-button"
                      onClick={() => void restore(habit)}
                      aria-label={`Restaurar ${habit.name}`}
                      title="Restaurar"
                    >
                      <RotateCcw size={18} />
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
      <HabitFormDialog
        key={editingHabit?.id ?? "create"}
        open={dialogOpen}
        habit={editingHabit}
        onClose={() => setDialogOpen(false)}
        onSaved={setToast}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
