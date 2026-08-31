import { z } from "zod";

export const habitColors = [
  "#047857",
  "#0369A1",
  "#7C3AED",
  "#C2410C",
  "#BE185D",
  "#0F766E",
] as const;
export const habitIcons = [
  "brain",
  "book-open",
  "footprints",
  "list-checks",
  "notebook-pen",
  "sparkles",
] as const;

const localDateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });

export const habitSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Escribe un nombre.")
    .max(60, "Usa 60 caracteres o menos."),
  description: z.string().trim().max(160, "Usa 160 caracteres o menos.").nullable(),
  color: z.enum(habitColors),
  icon: z.enum(habitIcons),
  frequency: z.literal("daily"),
  startDate: localDateSchema,
  position: z.number().int().nonnegative(),
  archivedAt: instantSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const habitCheckinSchema = z.object({
  id: z.uuid(),
  habitId: z.uuid(),
  checkinDate: localDateSchema,
  completedAt: instantSchema,
});

export const userSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  timezone: z
    .string()
    .min(1)
    .refine((timezone) => {
      try {
        new Intl.DateTimeFormat("es", { timeZone: timezone }).format();
        return true;
      } catch {
        return false;
      }
    }, "Selecciona una zona horaria válida."),
  locale: z.literal("es"),
  weekStartsOn: z.literal(1),
});

export const habitTrackerStateSchema = z
  .object({
    version: z.literal(1),
    habits: z.array(habitSchema),
    checkins: z.array(habitCheckinSchema),
    settings: userSettingsSchema,
  })
  .superRefine((state, context) => {
    const uniqueCheckins = new Set<string>();
    for (const checkin of state.checkins) {
      const key = `${checkin.habitId}:${checkin.checkinDate}`;
      if (uniqueCheckins.has(key)) {
        context.addIssue({
          code: "custom",
          message: "Un hábito solo puede tener un check-in por fecha.",
          path: ["checkins"],
        });
      }
      uniqueCheckins.add(key);
    }
  });

export const createHabitInputSchema = habitSchema.pick({
  name: true,
  description: true,
  color: true,
  icon: true,
});
export const updateHabitInputSchema = createHabitInputSchema.partial();

export type Habit = z.infer<typeof habitSchema>;
export type HabitCheckin = z.infer<typeof habitCheckinSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type HabitTrackerState = z.infer<typeof habitTrackerStateSchema>;
export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;
