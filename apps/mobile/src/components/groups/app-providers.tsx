import type { HabitTrackerState } from "@habit-tracker/domain";
import type { ReactNode } from "react";

import { GroupStoreProvider } from "@/lib/group-store";
import { HabitStoreProvider } from "@/lib/habit-store";

// Hábitos + grupos para la app con sesión. Un solo componente para que el
// layout de pestañas solo cambie la etiqueta del provider (el rediseño visual
// reescribe ese archivo en otra rama).
export function AppProviders({
  children,
  initialState,
  userId,
}: {
  children: ReactNode;
  initialState: HabitTrackerState;
  userId: string;
}) {
  return (
    <HabitStoreProvider initialState={initialState} userId={userId}>
      <GroupStoreProvider userId={userId}>{children}</GroupStoreProvider>
    </HabitStoreProvider>
  );
}
