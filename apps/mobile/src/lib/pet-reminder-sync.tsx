import { getGroupPetState } from "@habit-tracker/domain";
import { useEffect } from "react";

import { useGroupRepository, useGroups } from "./group-store";
import { useHabitStore } from "./habit-store";
import { type HungryGroup, syncPetReminder } from "./notifications/pet-reminder";

// Mantiene al día el aviso "Tu pulpito tiene hambre" (C6). Se recalcula al
// cargar los grupos, tras cada mutación de grupos (`revision`) y cuando cambian
// los check-ins propios, que son los que pueden darle de comer. Si una
// consulta falla, ese grupo no cuenta: mejor no avisar que avisar de más.
export function PetReminderSync() {
  const { hydrated, groups, revision } = useGroups();
  const repository = useGroupRepository();
  const { checkins } = useHabitStore();

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(
        groups.map(async (group) => {
          const state = getGroupPetState(await repository.getProgress(group.id));
          return state.mood === "hambrienta" || state.mood === "triste"
            ? { name: group.name }
            : null;
        }),
      );
      if (cancelled) return;
      const hungry = results.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : [],
      ) satisfies HungryGroup[];
      await syncPetReminder(hungry).catch((reason: unknown) => {
        console.warn("Pet reminder sync failed", reason);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, groups, revision, repository, checkins]);

  return null;
}
