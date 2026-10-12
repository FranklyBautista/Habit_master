import {
  getGroupPetState,
  getPetMessage,
  type GroupProgress,
  petMoodLabels,
  petStageLabels,
} from "@habit-tracker/domain";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { PetArt } from "./group-pet-art";

function daysLabel(count: number) {
  return count === 1 ? "1 día" : `${count} días`;
}

// Tarjeta de la mascota del grupo (C6). El estado se calcula en el dominio a
// partir del progreso; los 7 días llevan alternativa textual, no solo color.
export function GroupPetCard({ progress }: { progress: GroupProgress }) {
  const theme = useTheme();
  const state = getGroupPetState(progress);
  const stageLabel = petStageLabels[state.stage];
  const moodLabel = petMoodLabels[state.mood];
  const counted = state.last7Days.filter((day) => day.counted).length;
  const fed = state.last7Days.filter((day) => day.fed).length;

  return (
    <Card>
      <View style={styles.row}>
        <PetArt
          stage={state.stage}
          mood={state.mood}
          label={`Pulpito del grupo, etapa ${stageLabel}, ${moodLabel.toLowerCase()}`}
        />
        <View style={styles.info}>
          <ThemedText type="smallBold" accessibilityRole="header">
            {`Pulpito · ${stageLabel} · ${moodLabel}`}
          </ThemedText>
          <ThemedText type="small">{getPetMessage(state)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`Racha ${daysLabel(state.currentStreak)} · Mejor ${daysLabel(state.bestStreak)}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {state.nextStage
              ? `Crece a ${petStageLabels[state.nextStage.stage]} con ${daysLabel(state.nextStage.remainingDays)} más de racha`
              : "Ya es adulta"}
          </ThemedText>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Últimos 7 días: comió ${fed} de ${counted}`}
            style={styles.week}
          >
            {state.last7Days.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.day,
                  { borderColor: theme.border },
                  !day.counted && styles.neutral,
                  day.fed && {
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  info: { flex: 1, gap: Spacing.one },
  week: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: Spacing.one },
  day: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  neutral: { borderStyle: "dashed", opacity: 0.5 },
});
