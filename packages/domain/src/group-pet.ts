import { addDaysToDateKey } from "./dates";
import { isSharedHabitActiveOnDate } from "./group-metrics";
import type { GroupMemberProgress, GroupProgress } from "./groups";

// Mascota del grupo (docs/product/MASCOTA_GRUPO.md). Todo se deriva de
// `GroupProgress`: no hay estado guardado que se pueda manipular.

export const petStages = ["cria", "pequena", "joven", "adulta"] as const;
export type PetStage = (typeof petStages)[number];

export type PetMood = "contenta" | "hambrienta" | "triste" | "dormida";

/** Mejor racha mínima para llegar a cada etapa. */
export const petStageThresholds: Record<PetStage, number> = {
  cria: 0,
  pequena: 3,
  joven: 7,
  adulta: 30,
};

export type PetDay = {
  date: string;
  /** Al menos una persona participaba ese día. */
  counted: boolean;
  fed: boolean;
  feast: boolean;
  participating: number;
  upToDate: number;
  needed: number;
};

export type GroupPetState = {
  today: string;
  stage: PetStage;
  mood: PetMood;
  currentStreak: number;
  bestStreak: number;
  /** Estado de hoy: cuántos están al día y cuántos hacen falta. */
  todayDay: PetDay;
  /** Siguiente etapa y cuántos días de racha faltan, o `null` si ya es adulta. */
  nextStage: { stage: PetStage; remainingDays: number } | null;
  last7Days: PetDay[];
};

type PreparedMember = {
  today: string;
  habits: { isActive: (date: string) => boolean; checkins: Set<string> }[];
};

function prepare(member: GroupMemberProgress): PreparedMember {
  return {
    today: member.today,
    habits: member.habits.map((habit) => ({
      isActive: (date: string) => isSharedHabitActiveOnDate(habit, date),
      checkins: new Set(habit.checkinDates),
    })),
  };
}

/** La mitad de los participantes, redondeando hacia arriba. */
export function petMealsNeeded(participating: number): number {
  return Math.ceil(participating / 2);
}

function evaluateDay(members: PreparedMember[], date: string): PetDay {
  let participating = 0;
  let upToDate = 0;
  for (const member of members) {
    if (date > member.today) continue;
    const active = member.habits.filter((habit) => habit.isActive(date));
    if (active.length === 0) continue;
    participating += 1;
    if (active.every((habit) => habit.checkins.has(date))) upToDate += 1;
  }
  const needed = petMealsNeeded(participating);
  const fed = participating > 0 && upToDate >= needed;
  return {
    date,
    counted: participating > 0,
    fed,
    feast: fed && upToDate === participating,
    participating,
    upToDate,
    needed,
  };
}

export function getPetStage(bestStreak: number): PetStage {
  let stage: PetStage = "cria";
  for (const candidate of petStages) {
    if (bestStreak >= petStageThresholds[candidate]) stage = candidate;
  }
  return stage;
}

function getToday(progress: GroupProgress): string {
  const me = progress.members.find((member) => member.isMe);
  if (me) return me.today;
  return progress.members.reduce(
    (latest, member) => (member.today > latest ? member.today : latest),
    "0000-01-01",
  );
}

export function getGroupPetState(progress: GroupProgress): GroupPetState {
  const today = getToday(progress);
  const members = progress.members.map(prepare);
  const earliestStart = progress.members
    .flatMap((member) => member.habits.map((habit) => habit.startDate))
    .reduce<string | null>(
      (earliest, date) => (earliest === null || date < earliest ? date : earliest),
      null,
    );

  // Recorre la historia del grupo de la fecha más antigua a hoy.
  const days: PetDay[] = [];
  if (earliestStart !== null && earliestStart <= today) {
    for (let date = earliestStart; date <= today; date = addDaysToDateKey(date, 1)) {
      days.push(evaluateDay(members, date));
    }
  }
  const byDate = new Map(days.map((day) => [day.date, day]));
  const dayFor = (date: string) => byDate.get(date) ?? evaluateDay(members, date);

  let bestStreak = 0;
  let run = 0;
  for (const day of days) {
    if (!day.counted) continue;
    run = day.fed ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  // Racha actual: hoy suma si ya comió, pero no la corta mientras no termine.
  const todayDay = dayFor(today);
  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (day.date === today && !day.fed) continue;
    if (!day.counted) continue;
    if (!day.fed) break;
    currentStreak += 1;
  }

  const brokeBefore = (() => {
    for (let index = days.length - 1; index >= 0; index -= 1) {
      const day = days[index];
      if (day.date === today || !day.counted) continue;
      return !day.fed;
    }
    return false;
  })();

  const mood: PetMood = !todayDay.counted
    ? "dormida"
    : todayDay.fed
      ? "contenta"
      : brokeBefore && bestStreak > 0
        ? "triste"
        : "hambrienta";

  const stage = getPetStage(bestStreak);
  const next = petStages[petStages.indexOf(stage) + 1];

  return {
    today,
    stage,
    mood,
    currentStreak,
    bestStreak,
    todayDay,
    nextStage: next
      ? {
          stage: next,
          remainingDays: Math.max(petStageThresholds[next] - currentStreak, 1),
        }
      : null,
    last7Days: Array.from({ length: 7 }, (_, index) =>
      dayFor(addDaysToDateKey(today, index - 6)),
    ),
  };
}
