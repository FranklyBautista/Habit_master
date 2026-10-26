"use client";

import {
  type CreateHabitInput,
  formatLocalDate,
  getHabitWeekSummary,
  getLocalDateKey,
  type Habit,
  type HabitDayStatus,
  habitIdeas,
  type HabitWeekSummary,
} from "@habit-tracker/domain";
import { Archive, Check, ChevronDown, Pencil, Plus, RotateCcw } from "lucide-react";
import { useId, useState } from "react";

import { HabitFormDialog } from "@/components/habit-form-dialog";
import { habitIconComponents } from "@/components/habit-icons";
import { HabitActionsMenu } from "@/components/habits/habit-actions-menu";
import { SortableHabitList } from "@/components/habits/sortable-habit-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

const weekLetters = ["L", "M", "X", "J", "V", "S", "D"];
const dayStatusLabels: Record<HabitDayStatus, string> = {
  done: "hecho",
  missed: "sin hacer",
  pending: "hoy, sin marcar",
  upcoming: "todavía no",
  inactive: "no contaba",
};

function days(count: number) {
  return count === 1 ? "1 día" : `${count} días`;
}

function streakLabel(summary: HabitWeekSummary) {
  if (summary.isNew && !summary.completedToday) return "Nuevo · empieza hoy";
  if (summary.currentStreak >= 2) return `Racha de ${days(summary.currentStreak)}`;
  if (summary.completedToday) return "Hecho hoy";
  if (summary.currentStreak === 1) return "Racha de 1 día";
  return "Sin racha todavía";
}

function weekLabel(summary: HabitWeekSummary) {
  if (summary.isNew && !summary.completedToday) return "Esta semana: empieza hoy";
  return `Esta semana: ${summary.completed} de ${days(summary.expected)}`;
}

export default function HabitsPage() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [idea, setIdea] = useState<CreateHabitInput | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { timezone } = snapshot.settings;
  const { today, activeHabits: dueToday, completedIds } = getTodaySnapshot(snapshot);
  const activeHabits = snapshot.habits
    .filter((habit) => !habit.archivedAt)
    .sort((a, b) => a.position - b.position);
  const archivedHabits = snapshot.habits
    .filter((habit) => habit.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const summaries = new Map(
    activeHabits.map((habit) => [
      habit.id,
      getHabitWeekSummary(habit, today, { checkins: snapshot.checkins, timezone }),
    ]),
  );
  const bestStreak = Math.max(
    0,
    ...[...summaries.values()].map((s) => s.currentStreak),
  );
  const doneToday = dueToday.filter((habit) => completedIds.has(habit.id)).length;

  function openCreate(defaults: CreateHabitInput | null = null) {
    setEditingHabit(null);
    setIdea(defaults);
    setDialogOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setIdea(null);
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
    <div className="habits-page">
      <PageHeader
        title="Hábitos"
        description="Crea, ordena y cuida lo que quieres repetir cada día."
        action={
          // Redondo con "+" en el teléfono (como móvil) y con texto en
          // escritorio; el nombre accesible es el mismo en ambos.
          <Button className="create-habit-button" onClick={() => openCreate()}>
            <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
            <span className="create-habit-button__label">Crear hábito</span>
          </Button>
        }
      />

      {activeHabits.length ? (
        <>
          <dl className="habit-stats">
            <div className="habit-stat">
              <dt>Activos</dt>
              <dd>{activeHabits.length}</dd>
            </div>
            <div className="habit-stat">
              <dt>Hechos hoy</dt>
              <dd>
                {doneToday} <span>/ {dueToday.length}</span>
              </dd>
            </div>
            <div className="habit-stat">
              <dt>Mejor racha actual</dt>
              <dd>
                {bestStreak} <span>{bestStreak === 1 ? "día" : "días"}</span>
              </dd>
            </div>
          </dl>

          <section className="habit-section" aria-labelledby="active-habits-title">
            <div className="habit-section__heading">
              <h2 id="active-habits-title">Activos · {activeHabits.length}</h2>
              <span aria-hidden="true">
                Arrastra el asa para cambiar el orden en Hoy
              </span>
            </div>
            <SortableHabitList
              habits={activeHabits}
              onMove={actions.moveHabit}
              renderRow={(habit) => (
                <ActiveHabitRow
                  habit={habit}
                  summary={summaries.get(habit.id)!}
                  onEdit={() => openEdit(habit)}
                  onArchive={() => void archive(habit)}
                />
              )}
            />
            <button
              type="button"
              className="add-habit-button"
              onClick={() => openCreate()}
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
              Añadir otro hábito
            </button>
          </section>
        </>
      ) : (
        <HabitsEmptyState onCreate={openCreate} />
      )}

      {archivedHabits.length ? (
        <ArchivedHabits
          habits={archivedHabits}
          checkinCounts={countCheckins(snapshot.checkins)}
          timezone={timezone}
          onRestore={(habit) => void restore(habit)}
        />
      ) : null}

      <HabitFormDialog
        key={editingHabit?.id ?? `create-${idea?.name ?? ""}-${idea?.color ?? ""}`}
        open={dialogOpen}
        habit={editingHabit}
        defaults={idea}
        onClose={() => setDialogOpen(false)}
        onSaved={setToast}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function countCheckins(checkins: { habitId: string }[]) {
  const counts = new Map<string, number>();
  for (const checkin of checkins) {
    counts.set(checkin.habitId, (counts.get(checkin.habitId) ?? 0) + 1);
  }
  return counts;
}

function ActiveHabitRow({
  habit,
  summary,
  onEdit,
  onArchive,
}: {
  habit: Habit;
  summary: HabitWeekSummary;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const Icon = habitIconComponents[habit.icon];
  return (
    <>
      <span
        className="habit-icon"
        style={{ backgroundColor: habit.color }}
        aria-hidden="true"
      >
        <Icon size={20} />
      </span>
      <div className="habit-row__copy">
        <strong>{habit.name}</strong>
        <span>{habit.description ?? "Hábito diario"}</span>
      </div>
      <div className="habit-row__progress">
        <ol className="habit-week" aria-label={weekLabel(summary)}>
          {summary.days.map((day, index) => (
            <li key={day.date} className={`habit-week__day is-${day.status}`}>
              <span aria-hidden="true">{weekLetters[index]}</span>
              <span className="sr-only">
                {`${formatLocalDate(day.date, { weekday: "long" })}: ${dayStatusLabels[day.status]}`}
              </span>
            </li>
          ))}
        </ol>
        <span className="habit-row__streak">{streakLabel(summary)}</span>
      </div>
      <div className="habit-row__actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Editar ${habit.name}`}
          title="Editar"
        >
          <Pencil size={18} aria-hidden="true" />
        </Button>
        <HabitActionsMenu habitName={habit.name} onArchive={onArchive} />
      </div>
    </>
  );
}

function ArchivedHabits({
  habits,
  checkinCounts,
  timezone,
  onRestore,
}: {
  habits: Habit[];
  checkinCounts: Map<string, number>;
  timezone: string;
  onRestore: (habit: Habit) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(true);
  return (
    <section className="archived-panel" aria-labelledby={`${panelId}-title`}>
      <h2 id={`${panelId}-title`}>
        <button
          type="button"
          className="archived-panel__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <Archive size={18} aria-hidden="true" />
          <span className="archived-panel__title">
            Archivados <span>· {habits.length}</span>
          </span>
          <span className="archived-panel__hint" aria-hidden="true">
            {open ? "Ocultar" : "Mostrar"}
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="archived-panel__chevron"
          />
        </button>
      </h2>
      {open ? (
        <ul id={panelId} className="archived-panel__list">
          {habits.map((habit) => {
            const Icon = habitIconComponents[habit.icon];
            const archivedOn = formatLocalDate(
              getLocalDateKey(new Date(habit.archivedAt!), timezone),
              { day: "numeric", month: "long" },
            );
            const done = checkinCounts.get(habit.id) ?? 0;
            return (
              <li key={habit.id} className="archived-row">
                <span className="habit-icon is-muted" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="archived-row__copy">
                  <span>{habit.name}</span>
                  <span>
                    Archivado el {archivedOn} ·{" "}
                    {done === 1 ? "1 día hecho" : `${done} días hechos`}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  className="restore-button"
                  onClick={() => onRestore(habit)}
                  aria-label={`Restaurar ${habit.name}`}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Restaurar
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function HabitsEmptyState({
  onCreate,
}: {
  onCreate: (defaults?: CreateHabitInput) => void;
}) {
  const SampleIcon = habitIconComponents["book-open"];
  return (
    <>
      <section className="card habits-empty" aria-labelledby="habits-empty-title">
        <div className="habits-empty__art" aria-hidden="true">
          <span className="habits-empty__ghost habits-empty__ghost--back">
            <span style={{ backgroundColor: "#7C3AED" }} />
            <i />
          </span>
          <span className="habits-empty__ghost habits-empty__ghost--middle">
            <span style={{ backgroundColor: "#047857" }} />
            <i />
          </span>
          <span className="habits-empty__sample">
            <span className="habits-empty__sample-head">
              <span className="habit-icon" style={{ backgroundColor: "#0369A1" }}>
                <SampleIcon size={20} />
              </span>
              <span>
                <strong>Leer 10 minutos</strong>
                <span>Antes de dormir</span>
              </span>
              <span className="habits-empty__check">
                <Check size={16} strokeWidth={3} />
              </span>
            </span>
            <span className="habits-empty__bars">
              {[1, 1, 1, 0, 0, 0, 0].map((filled, index) => (
                <span key={index} className={filled ? "is-filled" : undefined} />
              ))}
            </span>
          </span>
        </div>
        <div className="habits-empty__copy">
          <span className="habits-empty__badge">Tu lista está vacía, por ahora</span>
          <h2 id="habits-empty-title">Empieza con un hábito pequeño</h2>
          <p>
            Elige algo que puedas hacer hoy en menos de diez minutos. Lo marcarás cada
            día en Hoy y verás cómo se llena tu semana.
          </p>
          <div className="habits-empty__actions">
            <Button onClick={() => onCreate()}>
              <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
              Crear mi primer hábito
            </Button>
            <a className="button button--secondary" href="#ideas">
              Ver ideas
            </a>
          </div>
        </div>
      </section>

      <section id="ideas" className="habit-ideas" aria-labelledby="habit-ideas-title">
        <div className="habit-ideas__heading">
          <h2 id="habit-ideas-title">Ideas para empezar</h2>
          <p>Toca una para abrir el formulario ya relleno. Puedes cambiar todo.</p>
        </div>
        <div className="habit-ideas__grid">
          {habitIdeas.map((item) => {
            const Icon = habitIconComponents[item.defaults.icon];
            return (
              <button
                key={item.label}
                type="button"
                className="idea-card"
                aria-label={`Añadir ${item.label}`}
                onClick={() => onCreate(item.defaults)}
              >
                <span
                  className="habit-icon"
                  style={{ backgroundColor: item.defaults.color }}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>
                <span className="idea-card__copy">
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
                <span className="idea-card__plus" aria-hidden="true">
                  <Plus size={16} strokeWidth={2.5} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="how-it-works-title">
        <h2 id="how-it-works-title">Cómo funciona</h2>
        <ol>
          <li>
            <span aria-hidden="true">1</span>
            <span>
              <strong>Crea un hábito</strong>
              <span>Ponle nombre, color e icono. Empieza a contar desde hoy.</span>
            </span>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <span>
              <strong>Márcalo en Hoy</strong>
              <span>Un toque cuando lo hagas. Si un día no sale, no pasa nada.</span>
            </span>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <span>
              <strong>Mira tu progreso</strong>
              <span>Calendario y Estadísticas se llenan solos con tus días.</span>
            </span>
          </li>
        </ol>
      </section>
    </>
  );
}
