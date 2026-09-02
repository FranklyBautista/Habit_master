# Lista de verificación — despliegue y rollback

## Antes de desplegar

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde localmente.
2. Con Supabase local activo: `pnpm db:reset && pnpm db:test && pnpm db:lint && pnpm db:advisors`.
3. `pnpm --filter @habit-tracker/web exec playwright test` en verde (incluye
   `e2e/pwa.spec.ts` y `e2e/supabase-flow.spec.ts`).
4. Si cambiaste `public/sw.js` o los archivos que precachea, sube
   `CACHE_VERSION` en `public/sw.js` para invalidar el caché de clientes con
   la versión anterior instalada.
5. Si hay una migración nueva en `supabase/migrations/`, confírmala contra
   una base limpia (`pnpm db:reset`) antes de aplicarla a `habit_master`.

## Preview (por Pull Request)

1. Cada PR abierto en GitHub genera un deployment Preview en Vercel
   automáticamente; revisa su URL en los checks del PR.
2. Verifica manualmente el recorrido principal (login, marcar hábito,
   calendario, estadísticas) en esa URL antes de aprobar el PR.
3. Los Preview usan el mismo proyecto Supabase local/CI para las pruebas
   automatizadas; **no deben** apuntar a `habit_master` (ver
   `docs/setup/SUPABASE.md`).

## Producción

1. Mergear a `main` dispara el deployment de Production en Vercel.
2. Confirmar en el dashboard de Vercel que el build terminó sin errores y que
   las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) apuntan a `habit_master`.
3. Probar manualmente en la URL de producción: login, marcar/desmarcar un
   hábito, cerrar sesión.
4. Confirmar que las URLs de redirección de Auth en el dashboard de
   `habit_master` incluyen el dominio de producción.

## Rollback

1. En el dashboard de Vercel → pestaña **Deployments**, localiza el último
   deployment de Production que funcionaba.
2. Usa **Promote to Production** (o el equivalente vigente en el dashboard)
   sobre ese deployment; Vercel sirve esa build inmediatamente sin rebuild.
3. Si el problema viene de una migración de base de datos ya aplicada a
   `habit_master`, reviértela con una migración nueva que deshaga el cambio
   (nunca edites ni borres una migración ya aplicada en remoto); coordina el
   rollback de código y de base de datos para que ambos queden consistentes.
4. Verifica el recorrido principal en producción después del rollback antes
   de cerrar el incidente.
