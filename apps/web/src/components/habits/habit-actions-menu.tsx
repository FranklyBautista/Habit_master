"use client";

import { Archive, Ellipsis } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type HabitActionsMenuProps = {
  habitName: string;
  onArchive: () => void;
};

// Menú "Más" de cada hábito. Ordenar ya no está aquí: se hace arrastrando el
// asa de la fila (components/habits/sortable-habit-list.tsx).
export function HabitActionsMenu({ habitName, onArchive }: HabitActionsMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    function onPointerDown(event: globalThis.PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      className="habit-menu"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`button button--ghost button--icon${open ? " is-open" : ""}`}
        aria-label={`Más acciones para ${habitName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Más"
        onClick={() => setOpen((value) => !value)}
      >
        <Ellipsis size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Acciones de ${habitName}`}
          className="habit-menu__list"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            className="habit-menu__item"
            aria-describedby={`${menuId}-archive-hint`}
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
          >
            <Archive size={16} aria-hidden="true" />
            Archivar
          </button>
          <span id={`${menuId}-archive-hint`} className="habit-menu__hint">
            Se guarda su historial. Puedes restaurarlo cuando quieras.
          </span>
        </div>
      ) : null}
    </div>
  );
}
