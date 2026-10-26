import {
  type CreateHabitInput,
  formatLocalDate,
  getHabitWeekSummary,
  getLocalDateKey,
  type Habit,
  type HabitDayStatus,
  habitIdeas,
  type HabitWeekSummary,
} from "@habit-tracker/domain";
import {
  Archive,
  Check,
  ChevronDown,
  Ellipsis,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HabitFormModal } from "@/components/habit-form-modal";
import { habitIconComponents } from "@/components/habit-icons";
import { SortableHabitList } from "@/components/sortable-habit-list";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Toast } from "@/components/toast";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getTodaySnapshot, useHabitActions, useHabitStore } from "@/lib/habit-store";

type Theme = ReturnType<typeof useTheme>;

function days(count: number) {
  return count === 1 ? "1 día" : `${count} días`;
}

function streakLabel(summary: HabitWeekSummary) {
  if (summary.isNew && !summary.completedToday) return "Nuevo";
  if (summary.currentStreak >= 2) return `${days(summary.currentStreak)} seguidos`;
  if (summary.completedToday) return "Hecho hoy";
  if (summary.currentStreak === 1) return "1 día seguido";
  return "Sin racha todavía";
}

function weekLabel(summary: HabitWeekSummary) {
  if (summary.isNew && !summary.completedToday) return "Empieza hoy";
  return `${summary.completed} de ${summary.expected} esta semana`;
}

function dayColors(status: HabitDayStatus, theme: Theme) {
  if (status === "done")
    return { backgroundColor: theme.accent, borderColor: theme.accent };
  if (status === "missed") {
    return {
      backgroundColor: theme.backgroundSelected,
      borderColor: theme.backgroundSelected,
    };
  }
  if (status === "pending")
    return { backgroundColor: "transparent", borderColor: theme.tint };
  return { backgroundColor: "transparent", borderColor: theme.border };
}

export default function HabitsScreen() {
  const snapshot = useHabitStore();
  const actions = useHabitActions();
  const theme = useTheme();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [idea, setIdea] = useState<CreateHabitInput | null>(null);
  const [menuHabit, setMenuHabit] = useState<Habit | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Sin conexión solo se pueden marcar hábitos (ADR 0003).
  const offline = !snapshot.online;
  const { timezone } = snapshot.settings;
  const { today, activeHabits: dueToday, completedIds } = getTodaySnapshot(snapshot);

  const activeHabits = snapshot.habits
    .filter((habit) => !habit.archivedAt)
    .sort((a, b) => a.position - b.position);
  const archivedHabits = snapshot.habits
    .filter((habit) => habit.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const summaries = new Map(
    activeHabits.map((habit) => [
      habit.id,
      getHabitWeekSummary(habit, today, { checkins: snapshot.checkins, timezone }),
    ]),
  );
  const bestStreak = Math.max(
    0,
    ...[...summaries.values()].map((s) => s.currentStreak),
  );
  const doneToday = dueToday.filter((habit) => completedIds.has(habit.id)).length;

  function openCreate(defaults: CreateHabitInput | null = null) {
    setEditingHabit(null);
    setIdea(defaults);
    setFormOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setIdea(null);
    setFormOpen(true);
  }
  async function archive(habit: Habit) {
    if (await actions.archiveHabit(habit.id)) {
      setToast(`${habit.name} se archivó sin perder su historial.`);
    }
  }
  async function restore(habit: Habit) {
    if (await actions.restoreHabit(habit.id)) {
      setToast(`${habit.name} vuelve a estar activo.`);
    }
  }

  const menuSummary = menuHabit ? summaries.get(menuHabit.id) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!dragging}
        >
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Hábitos
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Crear hábito"
                accessibilityState={{ disabled: offline }}
                disabled={offline}
                style={[
                  styles.createButton,
                  { backgroundColor: theme.accent },
                  offline && styles.disabled,
                ]}
                onPress={() => openCreate()}
              >
                <Plus size={22} strokeWidth={2.5} color={theme.onAccent} />
              </Pressable>
            </View>
            {activeHabits.length ? (
              <View style={styles.chips}>
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.chip,
                    { backgroundColor: theme.accentSoft, color: theme.tint },
                  ]}
                >
                  {doneToday} de {dueToday.length} hechos hoy
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}
                >
                  Mejor racha: {days(bestStreak)}
                </ThemedText>
              </View>
            ) : (
              <ThemedText themeColor="textSecondary">
                Crea, ordena y cuida lo que quieres repetir cada día.
              </ThemedText>
            )}
            {offline ? (
              <ThemedText type="small" themeColor="textSecondary">
                Sin conexión no puedes crear, editar, ordenar ni archivar hábitos.
              </ThemedText>
            ) : null}
          </View>

          {activeHabits.length ? (
            <>
              <View style={styles.sectionHeading}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.sectionTitle}
                >
                  Activos · {activeHabits.length}
                </ThemedText>
                <View
                  style={styles.hint}
                  importantForAccessibility="no-hide-descendants"
                >
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.hintText}
                  >
                    Arrastra
                  </ThemedText>
                  <GripVertical size={12} color={theme.textSecondary} />
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.hintText}
                  >
                    para ordenar
                  </ThemedText>
                </View>
              </View>
              <SortableHabitList
                habits={activeHabits}
                disabled={offline}
                onMove={actions.moveHabit}
                onDraggingChange={setDragging}
                renderRow={(habit) => (
                  <HabitCardContent
                    habit={habit}
                    summary={summaries.get(habit.id)!}
                    theme={theme}
                    onOpenMenu={() => setMenuHabit(habit)}
                  />
                )}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: offline }}
                disabled={offline}
                onPress={() => openCreate()}
                style={[
                  styles.addButton,
                  { borderColor: theme.border },
                  offline && styles.disabled,
                ]}
              >
                <Plus size={18} strokeWidth={2.5} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" style={styles.addButtonText}>
                  Añadir otro hábito
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <EmptyHabits theme={theme} offline={offline} onCreate={openCreate} />
          )}

          {archivedHabits.length ? (
            <View
              style={[
                styles.archived,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: archivedOpen }}
                onPress={() => setArchivedOpen((value) => !value)}
                style={styles.archivedToggle}
              >
                <Archive size={18} color={theme.textSecondary} />
                <ThemedText style={styles.archivedTitle}>
                  Archivados{" "}
                  <ThemedText themeColor="textSecondary">
                    · {archivedHabits.length}
                  </ThemedText>
                </ThemedText>
                <ChevronDown
                  size={18}
                  color={theme.textSecondary}
                  style={archivedOpen ? styles.chevronOpen : undefined}
                />
              </Pressable>
              {archivedOpen
                ? archivedHabits.map((habit) => (
                    <ArchivedRow
                      key={habit.id}
                      habit={habit}
                      theme={theme}
                      timezone={timezone}
                      done={
                        snapshot.checkins.filter((c) => c.habitId === habit.id).length
                      }
                      offline={offline}
                      onRestore={() => void restore(habit)}
                    />
                  ))
                : null}
            </View>
          ) : null}
        </ScrollView>

        {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
      </SafeAreaView>

      <HabitActionsSheet
        habit={menuHabit}
        detail={
          menuSummary ? `${streakLabel(menuSummary)} · ${weekLabel(menuSummary)}` : ""
        }
        theme={theme}
        offline={offline}
        onClose={() => setMenuHabit(null)}
        onEdit={(habit) => {
          setMenuHabit(null);
          openEdit(habit);
        }}
        onArchive={(habit) => {
          setMenuHabit(null);
          void archive(habit);
        }}
      />

      <HabitFormModal
        key={editingHabit?.id ?? `create-${idea?.name ?? ""}-${idea?.color ?? ""}`}
        open={formOpen}
        habit={editingHabit}
        defaults={idea}
        onClose={() => setFormOpen(false)}
        onSaved={setToast}
      />
    </ThemedView>
  );
}

function HabitCardContent({
  habit,
  summary,
  theme,
  onOpenMenu,
}: {
  habit: Habit;
  summary: HabitWeekSummary;
  theme: Theme;
  onOpenMenu: () => void;
}) {
  const Icon = habitIconComponents[habit.icon];
  return (
    <>
      <View style={[styles.habitIcon, { backgroundColor: habit.color }]}>
        <Icon size={20} color="#FFFFFF" />
      </View>
      <View style={styles.habitCopy}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.habitName}>
          {habit.name}
        </ThemedText>
        <View style={styles.progress}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Esta semana: ${weekLabel(summary)}`}
            style={styles.week}
          >
            {summary.days.map((day) => (
              <View
                key={day.date}
                style={[styles.weekDay, dayColors(day.status, theme)]}
              />
            ))}
          </View>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.streak}
          >
            {streakLabel(summary)}
          </ThemedText>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Acciones de ${habit.name}`}
        onPress={onOpenMenu}
        style={styles.moreButton}
      >
        <Ellipsis size={20} color={theme.text} />
      </Pressable>
    </>
  );
}

function HabitActionsSheet({
  habit,
  detail,
  theme,
  offline,
  onClose,
  onEdit,
  onArchive,
}: {
  habit: Habit | null;
  detail: string;
  theme: Theme;
  offline: boolean;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
}) {
  const Icon = habit ? habitIconComponents[habit.icon] : null;
  return (
    <Modal
      visible={habit !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={styles.backdrop}
        onPress={onClose}
      />
      {habit && Icon ? (
        <SafeAreaView
          edges={["bottom"]}
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={[styles.sheetGrabber, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <View style={[styles.habitIcon, { backgroundColor: habit.color }]}>
              <Icon size={20} color="#FFFFFF" />
            </View>
            <View style={styles.habitCopy}>
              <ThemedText
                type="subtitle"
                style={styles.sheetTitle}
                accessibilityRole="header"
              >
                {habit.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {detail}
              </ThemedText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: offline }}
            disabled={offline}
            onPress={() => onEdit(habit)}
            style={[
              styles.sheetAction,
              { backgroundColor: theme.backgroundSelected },
              offline && styles.disabled,
            ]}
          >
            <Pencil size={20} color={theme.text} />
            <ThemedText style={styles.sheetActionLabel}>Editar</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Archivar"
            accessibilityHint="Guarda su historial. Puedes restaurarlo luego."
            accessibilityState={{ disabled: offline }}
            disabled={offline}
            onPress={() => onArchive(habit)}
            style={[
              styles.sheetAction,
              styles.sheetActionTall,
              { backgroundColor: theme.backgroundSelected },
              offline && styles.disabled,
            ]}
          >
            <Archive size={20} color={theme.text} />
            <View style={styles.habitCopy}>
              <ThemedText style={styles.sheetActionLabel}>Archivar</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Guarda su historial. Puedes restaurarlo luego.
              </ThemedText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.sheetCancel}
          >
            <ThemedText themeColor="textSecondary" style={styles.sheetActionLabel}>
              Cancelar
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

function ArchivedRow({
  habit,
  theme,
  timezone,
  done,
  offline,
  onRestore,
}: {
  habit: Habit;
  theme: Theme;
  timezone: string;
  done: number;
  offline: boolean;
  onRestore: () => void;
}) {
  const Icon = habitIconComponents[habit.icon];
  const archivedOn = formatLocalDate(
    getLocalDateKey(new Date(habit.archivedAt!), timezone),
    {
      day: "numeric",
      month: "long",
    },
  );
  return (
    <View style={[styles.archivedRow, { borderTopColor: theme.border }]}>
      <View
        style={[styles.archivedIcon, { backgroundColor: theme.backgroundSelected }]}
      >
        <Icon size={18} color={theme.textSecondary} />
      </View>
      <View style={styles.habitCopy}>
        <ThemedText numberOfLines={1}>{habit.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {archivedOn} · {done === 1 ? "1 día hecho" : `${done} días hechos`}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Restaurar ${habit.name}`}
        accessibilityState={{ disabled: offline }}
        disabled={offline}
        onPress={onRestore}
        style={[
          styles.restoreButton,
          { backgroundColor: theme.backgroundSelected },
          offline && styles.disabled,
        ]}
      >
        <RotateCcw size={16} color={theme.tint} />
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          Restaurar
        </ThemedText>
      </Pressable>
    </View>
  );
}

function EmptyHabits({
  theme,
  offline,
  onCreate,
}: {
  theme: Theme;
  offline: boolean;
  onCreate: (defaults?: CreateHabitInput) => void;
}) {
  const SampleIcon = habitIconComponents["book-open"];
  return (
    <>
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <View style={styles.emptyArt} importantForAccessibility="no-hide-descendants">
          <View
            style={[
              styles.emptyGhost,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
            ]}
          >
            <View style={[styles.emptyGhostIcon, { backgroundColor: "#047857" }]} />
            <View style={[styles.emptyGhostLine, { backgroundColor: theme.border }]} />
          </View>
          <View
            style={[
              styles.emptySample,
              { backgroundColor: theme.backgroundElement, borderColor: theme.tint },
            ]}
          >
            <View style={styles.emptySampleHead}>
              <View style={[styles.emptySampleIcon, { backgroundColor: "#0369A1" }]}>
                <SampleIcon size={18} color="#FFFFFF" />
              </View>
              <ThemedText type="smallBold" style={styles.habitCopy}>
                Leer 10 minutos
              </ThemedText>
              <View style={[styles.emptyCheck, { backgroundColor: theme.accent }]}>
                <Check size={15} strokeWidth={3} color={theme.onAccent} />
              </View>
            </View>
            <View style={styles.emptyBars}>
              {[1, 1, 1, 0, 0, 0, 0].map((filled, index) => (
                <View
                  key={index}
                  style={[
                    styles.emptyBar,
                    {
                      backgroundColor: filled ? theme.accent : theme.backgroundSelected,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Empieza con un hábito pequeño
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Algo que puedas hacer hoy en menos de diez minutos. Lo marcarás en Hoy y verás
          cómo se llena tu semana.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: offline }}
          disabled={offline}
          onPress={() => onCreate()}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.accent },
            offline && styles.disabled,
          ]}
        >
          <Plus size={20} strokeWidth={2.5} color={theme.onAccent} />
          <ThemedText style={[styles.primaryButtonText, { color: theme.onAccent }]}>
            Crear mi primer hábito
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.ideas}>
        <ThemedText style={styles.ideasTitle} accessibilityRole="header">
          Ideas para empezar
        </ThemedText>
        {habitIdeas.map((item) => {
          const Icon = habitIconComponents[item.defaults.icon];
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Añadir ${item.label}`}
              accessibilityHint={item.hint}
              accessibilityState={{ disabled: offline }}
              disabled={offline}
              onPress={() => onCreate(item.defaults)}
              style={[
                styles.idea,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                offline && styles.disabled,
              ]}
            >
              <View style={[styles.ideaIcon, { backgroundColor: item.defaults.color }]}>
                <Icon size={19} color="#FFFFFF" />
              </View>
              <View style={styles.habitCopy}>
                <ThemedText type="smallBold" style={styles.ideaName}>
                  {item.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.hint}
                </ThemedText>
              </View>
              <View
                style={[styles.ideaPlus, { backgroundColor: theme.backgroundSelected }]}
              >
                <Plus size={16} strokeWidth={2.5} color={theme.tint} />
              </View>
            </Pressable>
          );
        })}
        <ThemedText type="small" themeColor="textSecondary" style={styles.ideasNote}>
          Se abre el formulario ya relleno: puedes cambiar nombre, color e icono.
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  scrollContent: {
    gap: Spacing.three,
    paddingHorizontal: 20,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerBlock: { gap: 6 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 32, lineHeight: 38 },
  createButton: {
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    overflow: "hidden",
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  sectionTitle: { fontWeight: 600 },
  hint: { flexDirection: "row", alignItems: "center", gap: 3 },
  hintText: { fontSize: 12, lineHeight: 16 },
  habitIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCopy: { flex: 1, minWidth: 0, gap: 2 },
  habitName: { fontSize: 16, lineHeight: 22 },
  progress: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  week: { flexDirection: "row", gap: 3 },
  weekDay: { width: 12, height: 12, borderRadius: 4, borderWidth: 1.5 },
  streak: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: 600 },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    minHeight: 56,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  addButtonText: { fontSize: 15, fontWeight: 600 },
  archived: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  archivedToggle: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.three,
  },
  archivedTitle: { flex: 1, fontSize: 15, fontWeight: 600 },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  archivedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  archivedIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)" },
  sheet: {
    gap: 6,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.one,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 18, lineHeight: 24 },
  sheetAction: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  sheetActionTall: { minHeight: 64, paddingVertical: 10 },
  sheetActionLabel: { fontSize: 16, fontWeight: 600 },
  sheetCancel: {
    minHeight: 52,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: { gap: 14, borderWidth: 1, borderRadius: Radius.lg, padding: 22 },
  emptyArt: { height: 138 },
  emptyGhost: {
    position: "absolute",
    top: 0,
    left: 34,
    right: 34,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    opacity: 0.5,
  },
  emptyGhostIcon: { width: 30, height: 30, borderRadius: 10 },
  emptyGhostLine: { width: 90, height: 8, borderRadius: 4 },
  emptySample: {
    position: "absolute",
    top: 40,
    left: 14,
    right: 14,
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 14 },
  },
  emptySampleHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptySampleIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBars: { flexDirection: "row", gap: 5 },
  emptyBar: { flex: 1, height: 7, borderRadius: 4 },
  emptyTitle: { marginTop: 6, fontSize: 24, lineHeight: 29, fontWeight: 800 },
  emptyText: { fontSize: 15, lineHeight: 22 },
  primaryButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.pill,
  },
  primaryButtonText: { fontSize: 16, fontWeight: 700 },
  ideas: { gap: 10 },
  ideasTitle: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  idea: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ideaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  ideaName: { fontSize: 15 },
  ideaPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ideasNote: {
    marginTop: Spacing.one,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },
});
