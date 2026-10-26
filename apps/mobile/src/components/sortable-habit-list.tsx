import type { Habit } from "@habit-tracker/domain";
import { GripVertical } from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import {
  type AccessibilityActionEvent,
  Animated,
  StyleSheet,
  View,
} from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const LIST_GAP = 10;

type SortableHabitListProps = {
  habits: Habit[];
  // Sin conexión no se puede reordenar (ADR 0003).
  disabled: boolean;
  // Guarda el nuevo orden (RPC `reorder_habits`); resuelve a `false` si falló.
  onMove: (id: string, toIndex: number) => Promise<boolean>;
  // Para bloquear el ScrollView de la pantalla mientras se arrastra.
  onDraggingChange: (dragging: boolean) => void;
  renderRow: (habit: Habit) => ReactNode;
};

type DragState = {
  id: string;
  fromIndex: number;
  overIndex: number;
  // `pageY` del dedo al empezar.
  startY: number;
  // Centro vertical de cada fila al empezar, relativo a la lista.
  centers: number[];
  // Lo que se desplaza una fila para dejar hueco: alto de la arrastrada + gap.
  shift: number;
};

function reorder(habits: Habit[], id: string, toIndex: number) {
  const next = habits.filter((habit) => habit.id !== id);
  const moved = habits.find((habit) => habit.id === id);
  if (moved) next.splice(toIndex, 0, moved);
  return next;
}

// Lista de hábitos activos que se ordena arrastrando el asa (⋮⋮) de cada
// tarjeta, con responders + Animated de React Native (sin módulos nativos,
// así que no hace falta otra build de EAS). Sustituye a los botones
// Subir/Bajar; con lector de pantalla, el asa ofrece las acciones «Subir» y
// «Bajar».
//
// Mientras se guarda, la lista se queda como la soltó el usuario; si falla,
// vuelve al orden del servidor y el store muestra el error (ADR 0001).
export function SortableHabitList({
  habits,
  disabled,
  onMove,
  onDraggingChange,
  renderRow,
}: SortableHabitListProps) {
  const theme = useTheme();
  const layouts = useRef(new Map<string, { y: number; height: number }>());
  const [dragY] = useState(() => new Animated.Value(0));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<{ id: string; order: Habit[] } | null>(null);
  const shown = pending?.order ?? habits;
  const busy = disabled || pending !== null;

  async function commit(habit: Habit, fromIndex: number, toIndex: number) {
    if (toIndex === fromIndex || toIndex < 0 || toIndex >= habits.length) return;
    setPending({ id: habit.id, order: reorder(habits, habit.id, toIndex) });
    await onMove(habit.id, toIndex);
    setPending(null);
  }

  function startDrag(habit: Habit, index: number, pageY: number) {
    if (busy) return;
    const rows = shown.map((item) => layouts.current.get(item.id));
    if (rows.some((row) => !row)) return;
    dragY.setValue(0);
    setDrag({
      id: habit.id,
      fromIndex: index,
      overIndex: index,
      startY: pageY,
      centers: rows.map((row) => row!.y + row!.height / 2),
      shift: rows[index]!.height + LIST_GAP,
    });
    onDraggingChange(true);
  }

  function moveDrag(pageY: number) {
    if (!drag) return;
    const dy = pageY - drag.startY;
    dragY.setValue(dy);
    // Ocupa el sitio de la última tarjeta cuyo centro ha cruzado.
    const center = drag.centers[drag.fromIndex] + dy;
    let overIndex = drag.fromIndex;
    while (
      overIndex < drag.centers.length - 1 &&
      center > drag.centers[overIndex + 1]
    ) {
      overIndex += 1;
    }
    while (overIndex > 0 && center < drag.centers[overIndex - 1]) overIndex -= 1;
    if (overIndex !== drag.overIndex) setDrag({ ...drag, overIndex });
  }

  function endDrag(habit: Habit, drop: boolean) {
    if (!drag) return;
    const { fromIndex, overIndex } = drag;
    setDrag(null);
    dragY.setValue(0);
    onDraggingChange(false);
    if (drop) void commit(habit, fromIndex, overIndex);
  }

  function rowShift(index: number) {
    if (!drag || index === drag.fromIndex) return 0;
    if (drag.fromIndex < index && index <= drag.overIndex) return -drag.shift;
    if (drag.overIndex <= index && index < drag.fromIndex) return drag.shift;
    return 0;
  }

  return (
    <View style={styles.list}>
      {shown.map((habit, index) => {
        const dragging = drag?.id === habit.id;
        return (
          <Animated.View
            key={habit.id}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              layouts.current.set(habit.id, { y, height });
            }}
            style={[
              styles.row,
              {
                backgroundColor: theme.backgroundElement,
                borderColor:
                  dragging || pending?.id === habit.id ? theme.tint : theme.border,
                transform: [{ translateY: dragging ? dragY : rowShift(index) }],
              },
              dragging && styles.dragging,
            ]}
          >
            <DragHandle
              label={`Reordenar ${habit.name}`}
              disabled={busy}
              color={theme.textSecondary}
              onStart={(pageY) => startDrag(habit, index, pageY)}
              onMove={moveDrag}
              onEnd={(drop) => endDrag(habit, drop)}
              onAccessibilityMove={(direction) =>
                void commit(habit, index, index + direction)
              }
            />
            {renderRow(habit)}
          </Animated.View>
        );
      })}
    </View>
  );
}

type DragHandleProps = {
  label: string;
  disabled: boolean;
  color: string;
  onStart: (pageY: number) => void;
  onMove: (pageY: number) => void;
  onEnd: (drop: boolean) => void;
  onAccessibilityMove: (direction: -1 | 1) => void;
};

// El asa usa directamente el sistema de responders de React Native (lo mismo
// que hay bajo PanResponder): cada render pasa callbacks nuevos y el
// desplazamiento se calcula con `pageY` desde donde empezó el arrastre.
function DragHandle({
  label,
  disabled,
  color,
  onStart,
  onMove,
  onEnd,
  onAccessibilityMove,
}: DragHandleProps) {
  return (
    <View
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={(event) => onStart(event.nativeEvent.pageY)}
      onResponderMove={(event) => onMove(event.nativeEvent.pageY)}
      onResponderRelease={() => onEnd(true)}
      onResponderTerminate={() => onEnd(false)}
      // Que el ScrollView no se quede con el gesto a mitad de arrastre.
      onResponderTerminationRequest={() => false}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Arrastra para cambiar el orden, o usa las acciones Subir y Bajar."
      accessibilityState={{ disabled }}
      accessibilityActions={[
        { name: "moveUp", label: "Subir" },
        { name: "moveDown", label: "Bajar" },
      ]}
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        if (disabled) return;
        if (event.nativeEvent.actionName === "moveUp") onAccessibilityMove(-1);
        if (event.nativeEvent.actionName === "moveDown") onAccessibilityMove(1);
      }}
      hitSlop={{ top: 4, bottom: 4, left: 8, right: 4 }}
      style={[styles.handle, disabled && styles.disabled]}
    >
      <GripVertical size={18} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: LIST_GAP },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 2,
    paddingRight: 6,
  },
  dragging: {
    zIndex: 2,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  handle: {
    width: 28,
    height: 44,
    marginRight: -4,
    borderRadius: Radius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.4 },
});
