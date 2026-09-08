import type { Habit } from "@habit-tracker/domain";
import type { LucideIcon } from "lucide-react-native";
import {
  BookOpen,
  Brain,
  Footprints,
  ListChecks,
  NotebookPen,
  Sparkles,
} from "lucide-react-native";

// Mirrors apps/web/src/components/habit-icons.ts (lucide-react ->
// lucide-react-native, same icon set and names).
export const habitIconComponents: Record<Habit["icon"], LucideIcon> = {
  brain: Brain,
  "book-open": BookOpen,
  footprints: Footprints,
  "list-checks": ListChecks,
  "notebook-pen": NotebookPen,
  sparkles: Sparkles,
};
