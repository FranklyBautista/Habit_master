import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppRelease } from "./releases";
import { UpdateCheck } from "./update-check";

// `AppState` captura el listener para simular que la app vuelve a primer plano.
const appState = vi.hoisted(() => ({
  listener: null as ((state: string) => void) | null,
}));
const installed = vi.hoisted(() => ({ version: "1.1.0" as string | undefined }));

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      appState.listener = listener;
      return { remove: () => (appState.listener = null) };
    },
  },
  Platform: { OS: "android" },
}));
vi.mock("expo-constants", () => ({
  default: {
    get expoConfig() {
      return { version: installed.version };
    },
  },
}));
vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));
// El asistente tiene sus propios tests; aquí basta con saber si se muestra.
vi.mock("@/components/update-wizard", () => ({
  UpdateWizard: ({
    summary,
    onDismiss,
  }: {
    summary: { latestVersion: string; mandatory: boolean };
    onDismiss: () => void;
  }) =>
    createElement(
      "div",
      null,
      `Wizard ${summary.latestVersion}${summary.mandatory ? " obligatoria" : ""}`,
      createElement("button", { onClick: onDismiss }, "Más tarde"),
    ),
}));

function release(version: string, mandatory = false): AppRelease {
  return {
    version,
    title: `Versión ${version}`,
    summary: "",
    changes: [],
    downloadUrl: `https://example.test/${version}.apk`,
    mandatory,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("UpdateCheck", () => {
  beforeEach(() => {
    installed.version = "1.1.0";
    appState.listener = null;
  });

  it("shows the wizard when a newer release exists", async () => {
    const load = vi.fn(async () => [release("1.2.0")]);
    render(<UpdateCheck loadPendingReleases={load} />);
    await flush();

    expect(load).toHaveBeenCalledWith({}, "1.1.0", "android");
    expect(screen.getByText("Wizard 1.2.0")).toBeInTheDocument();
  });

  it("shows nothing when there are no newer releases", async () => {
    const { container } = render(<UpdateCheck loadPendingReleases={async () => []} />);
    await flush();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the query fails", async () => {
    const { container } = render(
      <UpdateCheck
        loadPendingReleases={async () => {
          throw new Error("offline");
        }}
      />,
    );
    await flush();
    expect(container).toBeEmptyDOMElement();
  });

  it("does not check without an installed version", async () => {
    installed.version = undefined;
    const load = vi.fn(async () => [release("1.2.0")]);
    render(<UpdateCheck loadPendingReleases={load} />);
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it("keeps an optional update postponed when the app comes back", async () => {
    const load = vi.fn(async () => [release("1.2.0")]);
    render(<UpdateCheck loadPendingReleases={load} />);
    await flush();

    fireEvent.click(screen.getByText("Más tarde"));
    expect(screen.queryByText("Wizard 1.2.0")).toBeNull();

    await act(async () => appState.listener?.("active"));
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Wizard 1.2.0")).toBeNull();
  });

  it("shows a mandatory update published after postponing an optional one", async () => {
    const load = vi
      .fn<() => Promise<AppRelease[]>>()
      .mockResolvedValueOnce([release("1.2.0")])
      .mockResolvedValueOnce([release("1.2.0"), release("1.3.0", true)]);
    render(<UpdateCheck loadPendingReleases={load} />);
    await flush();
    fireEvent.click(screen.getByText("Más tarde"));

    await act(async () => appState.listener?.("active"));
    await flush();
    expect(screen.getByText("Wizard 1.3.0 obligatoria")).toBeInTheDocument();
  });
});
