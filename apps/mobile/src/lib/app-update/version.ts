// Versiones `MAYOR.MENOR.PARCHE`, las mismas que `expo.version` en app.json y
// la columna `app_releases.version` (que la BD obliga a tener ese formato).

export type AppVersion = readonly [major: number, minor: number, patch: number];

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(value: string): AppVersion | null {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Negativo si `a` es anterior a `b`, 0 si son iguales y positivo si es
 * posterior. Compara números, no texto: 1.10.0 va después de 1.9.0. Una
 * versión que no se puede leer cuenta como la más antigua.
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return (left ? 1 : 0) - (right ? 1 : 0);
  for (let index = 0; index < 3; index++) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}
