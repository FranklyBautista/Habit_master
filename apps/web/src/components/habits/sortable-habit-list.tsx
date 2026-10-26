"use client";

import type { Habit } from "@habit-tracker/domain";
import { GripVertical } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type SortableHabitListProps = {
  habits: Habit[];
  // Guarda el nuevo orden (RPC `reorder_habits`); resuelve a `false` si falló.
  onMove: (id: string, toIndex: number) => Promise<boolean>;
  renderRow: (habit: Habit) => ReactNode;
};

type DragState = {
  id: string;
  pointerId: number;
  fromIndex: number;
  overIndex: number;
  startY: number;
  offsetY: number;
  // Centro vertical de cada fila al empezar a arrastrar.
  centers: number[];
  // Lo que se desplaza una fila para dejar hueco: alto de la arrastrada + gap.
  shift: number;
};

const LIST_GAP = 10;

function reorder(habits: Habit[], id: string, toIndex: number) {
  const next = habits.filter((habit) => habit.id !== id);
  const moved = habits.find((habit) => habit.id === id);
  if (moved) next.splice(toIndex, 0, moved);
  return next;
}

// Lista de hábitos activos que se ordena arrastrando el asa (ratón, dedo o
// lápiz, con Pointer Events) o, con el asa enfocada, con las flechas arriba y
// abajo. Sustituye a los botones Subir/Bajar.
//
// Mientras se guarda el nuevo orden la lista se queda como la soltó el usuario
// (sin asas activas); si el guardado falla vuelve al orden del servidor y el
// store muestra el error, como cualquier otra escritura (ADR 0001).
export function SortableHabitList({
  habits,
  onMove,
  renderRow,
}: SortableHabitListProps) {
  const hintId = useId();
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<{ id: string; order: Habit[] } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusAfterMove = useRef<string | null>(null);
  const shown = pending?.order ?? habits;
  const saving = pending !== null;

  // Al reordenar, React mueve el nodo de la fila y el navegador puede quitarle
  // el foco: se devuelve al asa para poder seguir moviéndolo con el teclado.
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    const handle = handleRefs.current.get(id);
    if (handle && document.activeElement !== handle) handle.focus();
  }, [shown]);

  async function commit(habit: Habit, fromIndex: number, toIndex: number) {
    if (toIndex === fromIndex || toIndex < 0 || toIndex >= habits.length) return;
    setPending({ id: habit.id, order: reorder(habits, habit.id, toIndex) });
    const saved = await onMove(habit.id, toIndex);
    setPending(null);
    setAnnouncement(
      saved
        ? `${habit.name}: posición ${toIndex + 1} de ${habits.length}.`
        : `No se pudo mover ${habit.name}.`,
    );
  }

  function startDrag(
    event: PointerEvent<HTMLButtonElement>,
    habit: Habit,
    index: number,
  ) {
    if (saving || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rects = shown.map((item) =>
      rowRefs.current.get(item.id)?.getBoundingClientRect(),
    );
    if (rects.some((rect) => !rect)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const own = rects[index]!;
    setDrag({
      id: habit.id,
      pointerId: event.pointerId,
      fromIndex: index,
      overIndex: index,
      startY: event.clientY,
      offsetY: 0,
      centers: rects.map((rect) => rect!.top + rect!.height / 2),
      shift: own.height + LIST_GAP,
    });
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const offsetY = event.clientY - drag.startY;
    // Ocupa el sitio de la última fila cuyo centro ha cruzado.
    const center = drag.centers[drag.fromIndex] + offsetY;
    let overIndex = drag.fromIndex;
    while (
      overIndex < drag.centers.length - 1 &&
      center > drag.centers[overIndex + 1]
    ) {
      overIndex += 1;
    }
    while (overIndex > 0 && center < drag.centers[overIndex - 1]) overIndex -= 1;
    setDrag({ ...drag, offsetY, overIndex });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, habit: Habit) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { fromIndex, overIndex } = drag;
    setDrag(null);
    void commit(habit, fromIndex, overIndex);
  }

  function onHandleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    habit: Habit,
    index: number,
  ) {
    if (saving) return;
    const toIndex =
      event.key === "ArrowUp"
        ? index - 1
        : event.key === "ArrowDown"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? habits.length - 1
              : null;
    if (toIndex === null) return;
    event.preventDefault();
    focusAfterMove.current = habit.id;
    void commit(habit, index, toIndex);
  }

  function rowShift(index: number) {
    if (!drag) return 0;
    if (index === drag.fromIndex) return drag.offsetY;
    if (drag.fromIndex < index && index <= drag.overIndex) return -drag.shift;
    if (drag.overIndex <= index && index < drag.fromIndex) return drag.shift;
    return 0;
  }

  return (
    <>
      <p id={hintId} className="sr-only">
        Arrastra el asa o, con ella enfocada, usa las flechas arriba y abajo para
        cambiar el orden.
      </p>
      <ol className="habit-list" aria-busy={saving}>
        {shown.map((habit, index) => {
          const dragging = drag?.id === habit.id;
          const shift = rowShift(index);
          return (
            <li
              key={habit.id}
              ref={(node) => {
                if (node) rowRefs.current.set(habit.id, node);
                else rowRefs.current.delete(habit.id);
              }}
              className={`habit-row${dragging ? " is-dragging" : ""}${
                drag && !dragging ? " is-shifting" : ""
              }${pending?.id === habit.id ? " is-saving" : ""}`}
              style={shift ? { transform: `translateY(${shift}px)` } : undefined}
            >
              <button
                type="button"
                ref={(node) => {
                  if (node) handleRefs.current.set(habit.id, node);
                  else handleRefs.current.delete(habit.id);
                }}
                className="habit-row__handle"
                aria-label={`Reordenar ${habit.name}`}
                aria-describedby={hintId}
                aria-disabled={saving || undefined}
                onPointerDown={(event) => startDrag(event, habit, index)}
                onPointerMove={moveDrag}
                onPointerUp={(event) => endDrag(event, habit)}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(event) => onHandleKeyDown(event, habit, index)}
              >
                <GripVertical size={18} aria-hidden="true" />
              </button>
              {renderRow(habit)}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
