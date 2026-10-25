import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { UpdateWizard } from "@/components/update-wizard";
import { supabase } from "@/lib/supabase/client";

import {
  fetchPendingReleases,
  type ReleasePlatform,
  summarizeReleases,
  type UpdateSummary,
} from "./releases";

// `expo.version` de app.json, incrustada en el APK al compilar. Hay que subirla
// en cada versión publicada o el aviso seguirá saliendo tras instalarla.
export function getInstalledVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

function currentPlatform(): ReleasePlatform | null {
  return Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : null;
}

type UpdateCheckProps = {
  // Inyectable para los tests; en la app es la consulta a `app_releases`.
  loadPendingReleases?: typeof fetchPendingReleases;
};

/**
 * Busca versiones más nuevas al abrir la app y al volver a ella, y muestra el
 * asistente si las hay. «Más tarde» solo dura hasta que se cierra la app (vive
 * en memoria); una versión obligatoria sale aunque se haya pospuesto otra.
 * Si la consulta falla (sin red, Supabase caído) no se muestra nada.
 */
export function UpdateCheck({
  loadPendingReleases = fetchPendingReleases,
}: UpdateCheckProps) {
  const [summary, setSummary] = useState<UpdateSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const installedVersion = getInstalledVersion();

  useEffect(() => {
    const platform = currentPlatform();
    if (!installedVersion || !platform) return;

    let cancelled = false;
    const check = () => {
      loadPendingReleases(supabase, installedVersion, platform)
        .then((releases) => {
          if (!cancelled) setSummary(summarizeReleases(releases));
        })
        .catch(() => undefined);
    };

    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [installedVersion, loadPendingReleases]);

  if (!summary || !installedVersion) return null;
  if (dismissed && !summary.mandatory) return null;

  return (
    <UpdateWizard
      // Una versión nueva publicada mientras está abierto empieza desde el
      // primer paso.
      key={summary.latestVersion}
      open
      summary={summary}
      currentVersion={installedVersion}
      onDismiss={() => setDismissed(true)}
    />
  );
}
