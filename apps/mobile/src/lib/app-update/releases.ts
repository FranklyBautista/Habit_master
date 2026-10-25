import type { Database } from "@habit-tracker/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { compareVersions, parseVersion } from "./version";

// Versiones publicadas en `app_releases` (migración 20261023130000). La RLS ya
// oculta borradores y publicaciones programadas; aquí se valida cada fila en el
// límite y se descartan las que no tengan la forma esperada, para que una fila
// mal escrita a mano en el dashboard no rompa el aviso.

export type ReleasePlatform = "android" | "ios";

const changeSchema = z.object({
  type: z.enum(["added", "changed", "removed"]),
  text: z.string().trim().min(1),
});

const releaseRowSchema = z.object({
  version: z.string().refine((value) => parseVersion(value) !== null),
  title: z.string().min(1),
  summary: z.string(),
  changes: z.array(z.unknown()),
  download_url: z.url({ protocol: /^https$/ }),
  mandatory: z.boolean(),
});

export type ReleaseChange = z.infer<typeof changeSchema>;

export type AppRelease = {
  version: string;
  title: string;
  summary: string;
  changes: ReleaseChange[];
  downloadUrl: string;
  mandatory: boolean;
};

export function parseReleaseRow(row: unknown): AppRelease | null {
  const parsed = releaseRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const { version, title, summary, changes, download_url, mandatory } = parsed.data;
  return {
    version,
    title,
    summary,
    // Un cambio mal escrito se omite; el resto de la versión sigue valiendo.
    changes: changes.flatMap((change) => {
      const item = changeSchema.safeParse(change);
      return item.success ? [item.data] : [];
    }),
    downloadUrl: download_url,
    mandatory,
  };
}

/**
 * Versiones publicadas posteriores a la instalada, de la más antigua a la más
 * nueva. Lanza si falla la consulta; quien llama decide no mostrar nada.
 */
export async function fetchPendingReleases(
  client: SupabaseClient<Database>,
  currentVersion: string,
  platform: ReleasePlatform,
): Promise<AppRelease[]> {
  const { data, error } = await client
    .from("app_releases")
    .select("version, title, summary, changes, download_url, mandatory")
    .eq("platform", platform);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map(parseReleaseRow)
    .filter((release): release is AppRelease => release !== null)
    .filter((release) => compareVersions(release.version, currentVersion) > 0)
    .sort((a, b) => compareVersions(a.version, b.version));
}

export type UpdateSummary = {
  latestVersion: string;
  title: string;
  summary: string;
  downloadUrl: string;
  mandatory: boolean;
  added: string[];
  changed: string[];
  removed: string[];
};

/**
 * Junta en un solo aviso todas las versiones que el usuario se saltó: el
 * título, el resumen y el enlace son los de la más nueva, los cambios van de
 * la más nueva a la más antigua y basta con que una sea obligatoria.
 */
export function summarizeReleases(
  releases: readonly AppRelease[],
): UpdateSummary | null {
  const ordered = [...releases].sort((a, b) => compareVersions(b.version, a.version));
  const latest = ordered[0];
  if (!latest) return null;

  const changes = ordered.flatMap((release) => release.changes);
  const textsOf = (type: ReleaseChange["type"]) =>
    changes.filter((change) => change.type === type).map((change) => change.text);

  return {
    latestVersion: latest.version,
    title: latest.title,
    summary: latest.summary,
    downloadUrl: latest.downloadUrl,
    mandatory: ordered.some((release) => release.mandatory),
    added: textsOf("added"),
    changed: textsOf("changed"),
    removed: textsOf("removed"),
  };
}
