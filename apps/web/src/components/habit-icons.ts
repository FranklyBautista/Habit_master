import type { Habit } from "@habit-tracker/domain";
import {
  BookOpen,
  Brain,
  Footprints,
  ListChecks,
  type LucideIcon,
  NotebookPen,
  Sparkles,
} from "lucide-react";

export const habitIconComponents: Record<Habit["icon"], LucideIcon> = {
  brain: Brain,
  "book-open": BookOpen,
  footprints: Footprints,
  "list-checks": ListChecks,
  "notebook-pen": NotebookPen,
  sparkles: Sparkles,
};
