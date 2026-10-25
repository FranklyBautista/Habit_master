import {
  CircleMinus,
  CirclePlus,
  Download,
  type LucideIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { UpdateSummary } from "@/lib/app-update/releases";

type Step = {
  key: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  items?: string[];
};

// Intro → novedades → cambios → eliminado → descargar. Los pasos de cambios
// sin elementos se omiten, así que una versión sin nada eliminado no enseña
// una pantalla vacía.
function buildSteps(summary: UpdateSummary, currentVersion: string): Step[] {
  const intro: Step = {
    key: "intro",
    icon: Sparkles,
    title: summary.title,
    description: [
      `Ya está disponible la versión ${summary.latestVersion}. Tienes la ${currentVersion}.`,
      summary.summary,
      summary.mandatory
        ? "Esta actualización es obligatoria para seguir usando la app."
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
  const lists: Step[] = [
    { key: "added", icon: CirclePlus, title: "Novedades", items: summary.added },
    { key: "changed", icon: RefreshCw, title: "Cambios", items: summary.changed },
    {
      key: "removed",
      icon: CircleMinus,
      title: "Lo que se quitó",
      items: summary.removed,
    },
  ];
  const download: Step = {
    key: "download",
    icon: Download,
    title: "Descarga la nueva versión",
    description:
      "Toca el botón para descargar el APK y ábrelo al terminar. Si Android lo pide, permite instalar apps desde esa fuente. Se instala encima de la actual y no pierdes tus datos.",
  };
  return [intro, ...lists.filter((step) => step.items?.length), download];
}

type UpdateWizardProps = {
  open: boolean;
  summary: UpdateSummary;
  currentVersion: string;
  // Solo se llama si la versión no es obligatoria.
  onDismiss: () => void;
};

export function UpdateWizard({
  open,
  summary,
  currentVersion,
  onDismiss,
}: UpdateWizardProps) {
  const theme = useTheme();
  const steps = buildSteps(summary, currentVersion);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = index >= steps.length - 1;
  const Icon = step.icon;

  async function download() {
    setError(null);
    try {
      await Linking.openURL(summary.downloadUrl);
    } catch {
      setError("No se pudo abrir el enlace de descarga. Inténtalo de nuevo.");
    }
  }

  // Botón atrás de Android: retrocede un paso; en el primero cierra el aviso,
  // salvo que la versión sea obligatoria.
  function handleBack() {
    if (!isFirst) setIndex(index - 1);
    else if (!summary.mandatory) onDismiss();
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={handleBack}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {`Paso ${index + 1} de ${steps.length}`}
            </ThemedText>
            {summary.mandatory ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recordármelo más tarde"
                hitSlop={8}
                onPress={onDismiss}
              >
                <ThemedText type="linkPrimary">Más tarde</ThemedText>
              </Pressable>
            )}
          </View>

          <View
            style={styles.progress}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {steps.map((item, position) => (
              <View
                key={item.key}
                style={[
                  styles.progressDot,
                  { backgroundColor: position <= index ? theme.accent : theme.border },
                ]}
              />
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.iconBadge, { backgroundColor: theme.accentSoft }]}>
              <Icon size={28} color={theme.tint} />
            </View>
            <ThemedText type="title" accessibilityRole="header">
              {step.title}
            </ThemedText>
            {step.description ? (
              <ThemedText themeColor="textSecondary">{step.description}</ThemedText>
            ) : null}
            {step.items?.map((item, position) => (
              <View
                key={`${step.key}-${position}`}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.bullet, { backgroundColor: theme.tint }]} />
                <ThemedText style={styles.itemText}>{item}</ThemedText>
              </View>
            ))}
            {error ? (
              <ThemedText style={{ color: theme.danger }} accessibilityRole="alert">
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {isFirst ? null : (
              <Button
                label="Atrás"
                variant="secondary"
                style={styles.actionButton}
                onPress={() => setIndex(index - 1)}
              />
            )}
            {isLast ? (
              <Button
                label={`Descargar versión ${summary.latestVersion}`}
                icon={(color) => <Download size={18} color={color} />}
                style={styles.actionButton}
                onPress={() => void download()}
              />
            ) : (
              <Button
                label="Siguiente"
                style={styles.actionButton}
                onPress={() => setIndex(index + 1)}
              />
            )}
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, gap: Spacing.three, padding: Spacing.four },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  progress: { flexDirection: "row", gap: Spacing.one },
  progressDot: { flex: 1, height: 4, borderRadius: Radius.pill },
  content: { gap: Spacing.three, paddingVertical: Spacing.three },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: Spacing.two },
  itemText: { flex: 1 },
  actions: { flexDirection: "row", gap: Spacing.two },
  actionButton: { flex: 1 },
});
