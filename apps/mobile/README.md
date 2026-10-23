# Constancia — app móvil (Expo)

App Android/iOS del habit tracker. Parte del workspace pnpm de `habit_tracker`:
ver el `README.md` y el `CLAUDE.md` de la raíz para las convenciones generales y
`PLANIFICACION_HABIT_TRACKER.md` (Fase 8) para el estado.

Expo SDK 57 · Expo Router (rutas tipadas) · Supabase · `expo-notifications`.
Reutiliza `@habit-tracker/domain` (fechas, rachas, métricas) y los tipos de
`@habit-tracker/database`.

## Estado

- Pantallas Hoy, Hábitos, Calendario, Estadísticas y Ajustes, en claro y oscuro.
- Autenticación completa; el registro y la recuperación se confirman con un
  código de 6 dígitos del correo (pantalla `verificar`).
- Sincronización sin UI optimista (ADR 0001), igual que la web.
- Recordatorios locales: hasta 5, con hora manual y alarmas exactas en Android.
- Probada en un Android real; **iOS sin probar** (sin hardware Apple).
- Beta interna en Android con el perfil `preview` de EAS.

## Desarrollo

1. Instala dependencias desde la raíz del repo (no dentro de `apps/mobile`):

   ```bash
   pnpm install
   ```

2. Con Supabase local activo (`pnpm supabase:start` desde la raíz), crea
   `apps/mobile/.env` a partir del ejemplo y rellena las variables `EXPO_PUBLIC_*`
   (ver `src/lib/supabase/env.ts`) con los valores de
   `pnpm exec supabase status`. Para un emulador o teléfono físico usa la IP LAN
   de tu máquina, no `localhost`:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```

3. Inicia Metro y abre la app en el development build instalado:

   ```bash
   pnpm --filter @habit-tracker/mobile start
   ```

   En WSL con la red en modo NAT, el teléfono no alcanza Metro por la LAN:
   usa `pnpm --filter @habit-tracker/mobile exec expo start --tunnel`.
   `pnpm --filter @habit-tracker/mobile web` sirve como banco de pruebas rápido
   en el navegador (Supabase en `http://localhost:54321`).

Las pantallas están en `src/app` (`(auth)` para el acceso, `(app)` para las
pestañas).

## Comprobaciones

```bash
pnpm --filter @habit-tracker/mobile lint
pnpm --filter @habit-tracker/mobile typecheck
pnpm --filter @habit-tracker/mobile test
```

También se ejecutan con `pnpm lint`, `pnpm typecheck` y `pnpm test` desde la
raíz, y en CI.

## Builds con EAS

Proyecto `@franklyb/habit-tracker-mobile`. Perfiles en `eas.json`:

| Perfil        | Para qué                                                         | Supabase                               |
| ------------- | ---------------------------------------------------------------- | -------------------------------------- |
| `development` | Development build; necesita Metro corriendo en tu PC             | El de tu `.env` local                  |
| `preview`     | APK independiente para uso diario y beta interna (enlace de EAS) | Producción, desde el entorno `preview` |
| `production`  | Build firmado para las tiendas (aún sin usar)                    | Pendiente de configurar en EAS         |

```bash
cd apps/mobile
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform android
```

- Los builds en la nube tardan unos 13 minutos y consumen cuota de EAS: agrupa
  los cambios nativos (permisos, plugins, iconos, módulos) en un solo build. Los
  cambios solo de JavaScript no necesitan build nuevo en desarrollo.
- `apps/mobile/.env` no se sube a EAS (está en `.gitignore`). Las variables de
  los builds independientes viven en EAS:
  `npx eas-cli env:list --environment preview`.
- Solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: nunca
  añadas claves secretas, porque las variables `EXPO_PUBLIC_*` van dentro del
  bundle de la app.
- Para instalar el APK de `preview` fuera de Play Store hay que permitir
  "instalar apps de origen desconocido" en Android.

## Publicar una versión

No hay OTA: cada versión nueva llega solo si la persona descarga e instala otro
APK. Al abrir la app, `UpdateCheck` (`src/lib/app-update/`) compara
`expo.version` de `app.json` con las filas publicadas de la tabla
`app_releases` y, si hay una más nueva, muestra un asistente con lo nuevo, lo
cambiado y lo quitado, y un botón al enlace de descarga. Sale también sin
sesión iniciada. Si la consulta falla (sin red), no muestra nada.

1. Sube `expo.version` en `app.json` (`MAYOR.MENOR.PARCHE`). **Si no la subes,
   el aviso seguirá saliendo después de instalar el APK nuevo.**
2. Lanza el build: `npx eas-cli build --profile preview --platform android`.
3. Copia el enlace del build de EAS (página del build o URL del artefacto).
4. Inserta la versión desde el SQL Editor de Supabase (`habit_master`):

   ```sql
   insert into public.app_releases
     (version, title, summary, changes, download_url, mandatory, published_at)
   values (
     '1.2.0',
     'Modo sin conexión',
     'Ya puedes marcar tus hábitos sin red.',
     '[
       {"type": "added",   "text": "Marca y desmarca hábitos sin conexión"},
       {"type": "changed", "text": "El aviso de conexión muestra los cambios pendientes"},
       {"type": "removed", "text": "Se quitó la pantalla de notas"}
     ]',
     'https://expo.dev/accounts/franklyb/projects/habit-tracker-mobile/builds/<id>',
     false,
     now()
   );
   ```

- `type` es `added`, `changed` o `removed`; los pasos sin elementos no se
  muestran y los elementos mal escritos se ignoran.
- `mandatory = true`: el asistente no se puede cerrar (ni con el botón atrás).
  Con `false` hay «Más tarde» y vuelve a salir en el siguiente arranque.
- `published_at` nulo es un borrador y una fecha futura programa el aviso: los
  clientes solo leen las filas con `published_at <= now()`.
- Si alguien se salta varias versiones, ve los cambios de todas juntas, el
  enlace de la más nueva y el aviso es obligatorio si alguna lo era.
