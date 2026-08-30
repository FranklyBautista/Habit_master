export type DemoHabit = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: "brain" | "book-open" | "footprints" | "list-checks" | "notebook-pen";
  completedToday: boolean;
  archived: boolean;
};

export const demoProfile = {
  displayName: "Alex",
  email: "alex@example.com",
  timezone: "America/Los_Angeles",
};

export const demoHabits: DemoHabit[] = [
  {
    id: "meditar",
    name: "Meditar",
    description: "Cinco minutos al comenzar el día",
    color: "#047857",
    icon: "brain",
    completedToday: true,
    archived: false,
  },
  {
    id: "leer",
    name: "Leer 20 minutos",
    description: "Un capítulo cuenta",
    color: "#0369A1",
    icon: "book-open",
    completedToday: true,
    archived: false,
  },
  {
    id: "caminar",
    name: "Caminar",
    description: "Salir después de comer",
    color: "#7C3AED",
    icon: "footprints",
    completedToday: false,
    archived: false,
  },
  {
    id: "preparar",
    name: "Preparar el día",
    description: "Revisar las tres prioridades",
    color: "#C2410C",
    icon: "list-checks",
    completedToday: true,
    archived: false,
  },
  {
    id: "diario",
    name: "Escribir diario",
    description: null,
    color: "#BE185D",
    icon: "notebook-pen",
    completedToday: false,
    archived: true,
  },
];

export const demoCalendar: Array<number | null> = [
  null,
  null,
  null,
  null,
  null,
  40,
  65,
  70,
  50,
  85,
  65,
  40,
  75,
  90,
  70,
  65,
  100,
  75,
  50,
  85,
  65,
  60,
  90,
  75,
  70,
  80,
  50,
  85,
  50,
  100,
  75,
  75,
];

export const demoTrend = [42, 58, 36, 72, 48, 80, 55, 68, 100, 64, 82, 74, 92, 76];
