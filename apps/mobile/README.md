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
