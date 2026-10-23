import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateSummary } from "@/lib/app-update/releases";

import { UpdateWizard } from "./update-wizard";

// Same approach as reminder-time-modal.test.tsx: React Native primitives become
// plain host elements so jsdom can render the modal.
type RNProps = {
  children?: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  onRequestClose?: () => void;
  visible?: boolean;
};

const openURL = vi.hoisted(() => vi.fn(async () => true));

vi.mock("react-native", () => ({
  View: ({ children }: RNProps) => createElement("div", null, children),
  ScrollView: ({ children }: RNProps) => createElement("div", null, children),
  Text: ({ children, accessibilityRole }: RNProps) =>
    createElement("span", { role: accessibilityRole }, children),
  Pressable: ({ children, onPress, accessibilityLabel }: RNProps) =>
    createElement(
      "button",
      { onClick: onPress, "aria-label": accessibilityLabel },
      children,
    ),
  // El botón atrás de Android se simula con un botón oculto que llama a
  // `onRequestClose`.
  Modal: ({ children, visible, onRequestClose }: RNProps) =>
    visible
      ? createElement(
          "div",
          null,
          createElement("button", { onClick: onRequestClose }, "android-back"),
          children,
        )
      : null,
  Linking: { openURL },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Platform: {
    OS: "android",
    select: (options: Record<string, unknown>) => options.default,
  },
  useColorScheme: () => "light",
}));
vi.mock("lucide-react-native", () => ({
  CircleMinus: () => null,
  CirclePlus: () => null,
  Download: () => null,
  RefreshCw: () => null,
  Sparkles: () => null,
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: RNProps) => createElement("div", null, children),
}));

const baseSummary: UpdateSummary = {
  latestVersion: "1.2.0",
  title: "Llega el modo sin conexión",
  summary: "Marca tus hábitos sin red.",
  downloadUrl: "https://example.test/1.2.0.apk",
  mandatory: false,
  added: ["Modo sin conexión"],
  changed: [],
  removed: ["Notas en los check-ins"],
};

function renderWizard(overrides: Partial<UpdateSummary> = {}) {
  const onDismiss = vi.fn();
  render(
    <UpdateWizard
      open
      summary={{ ...baseSummary, ...overrides }}
      currentVersion="1.1.0"
      onDismiss={onDismiss}
    />,
  );
  return { onDismiss };
}

const next = () => fireEvent.click(screen.getByLabelText("Siguiente"));

describe("UpdateWizard", () => {
  beforeEach(() => openURL.mockClear());

  it("walks through intro, the non-empty change lists and the download step", () => {
    renderWizard();

    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("Llega el modo sin conexión")).toBeInTheDocument();
    expect(screen.getByText(/versión 1\.2\.0\. Tienes la 1\.1\.0/)).toBeInTheDocument();

    next();
    expect(screen.getByText("Novedades")).toBeInTheDocument();
    expect(screen.getByText("Modo sin conexión")).toBeInTheDocument();

    // «Cambios» está vacío y se salta.
    next();
    expect(screen.getByText("Lo que se quitó")).toBeInTheDocument();
    expect(screen.getByText("Notas en los check-ins")).toBeInTheDocument();

    next();
    expect(screen.getByText("Paso 4 de 4")).toBeInTheDocument();
    expect(screen.queryByLabelText("Siguiente")).toBeNull();
    expect(screen.getByLabelText("Descargar versión 1.2.0")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Atrás"));
    expect(screen.getByText("Lo que se quitó")).toBeInTheDocument();
  });

  it("opens the download link from the last step", async () => {
    renderWizard({ added: [], removed: [] });
    next();
    fireEvent.click(screen.getByLabelText("Descargar versión 1.2.0"));

    await waitFor(() =>
      expect(openURL).toHaveBeenCalledWith("https://example.test/1.2.0.apk"),
    );
  });

  it("shows an error if the link cannot be opened", async () => {
    openURL.mockRejectedValueOnce(new Error("no browser"));
    renderWizard({ added: [], removed: [] });
    next();
    fireEvent.click(screen.getByLabelText("Descargar versión 1.2.0"));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No se pudo abrir el enlace",
    );
  });

  it("can be postponed when the update is optional", () => {
    const { onDismiss } = renderWizard();
    fireEvent.click(screen.getByLabelText("Recordármelo más tarde"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses the Android back button to go back, then to close", () => {
    const { onDismiss } = renderWizard();
    next();
    fireEvent.click(screen.getByText("android-back"));
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("android-back"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("cannot be closed when the update is mandatory", () => {
    const { onDismiss } = renderWizard({ mandatory: true });

    expect(screen.queryByLabelText("Recordármelo más tarde")).toBeNull();
    expect(screen.getByText(/obligatoria/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("android-back"));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
  });
});
