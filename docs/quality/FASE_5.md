# Fase 5 — Revisión de calidad del prototipo local

Revisión realizada el 30 de agosto de 2026 sobre el build de producción local.

## Cobertura añadida

- Pruebas de componentes con Vitest, jsdom y Testing Library para el formulario
  de hábitos, el checkbox y los periodos de Estadísticas.
- Recorrido Playwright de creación, persistencia tras recarga, marcado,
  desmarcado, archivado y consulta de Estadísticas.
- Casos de nombre vacío y límite máximo de 60 caracteres.
- Auditoría Axe de las cinco rutas principales y recorrido de teclado para el
  enlace de salto, apertura/cierre del diálogo y foco inicial.
- Presupuestos Playwright para DOMContentLoaded, First Contentful Paint y bytes
  JavaScript en `/hoy` y `/estadisticas`.

## Rendimiento y dependencias

Las mediciones se ejecutan contra `next start`, no contra el servidor de
desarrollo. Los límites reproducibles son:

| Ruta | DOMContentLoaded | First Contentful Paint | JavaScript decodificado |
| --- | ---: | ---: | ---: |
| `/hoy` | < 2.000 ms | < 2.500 ms | < 2,5 MB |
| `/estadisticas` | < 2.000 ms | < 2.500 ms | < 2,5 MB |

Medición de referencia obtenida en este entorno:

| Ruta | DOMContentLoaded | First Contentful Paint | JavaScript decodificado |
| --- | ---: | ---: | ---: |
| `/hoy` | 33 ms | 60 ms | 873.093 bytes |
| `/estadisticas` | 17 ms | 40 ms | 1.265.293 bytes |

Cada ejecución adjunta los valores medidos al resultado Playwright. Durante la
revisión se eliminaron los datos ficticios sin consumidores y la dependencia
redundante `vite-tsconfig-paths`. Los resúmenes y rachas de Estadísticas se
memorizan mientras no cambien hábitos, check-ins, zona horaria o fecha.
Recharts sigue cargándose dinámicamente solo en la ruta que lo utiliza.

## Confirmaciones

El prototipo no tiene acciones destructivas irreversibles. Archivar conserva los
check-ins y ofrece restauración, por lo que no se añadió una confirmación que
interrumpa esa acción reversible. Cuando exista eliminación definitiva de datos
o cuenta deberá incorporarse una confirmación explícita y específica.

## Accesibilidad revisada

- Las cinco rutas tienen encabezados, regiones, controles y nombres accesibles
  detectables mediante roles.
- El diálogo anuncia su título y descripción, recibe el foco en Nombre y se
  cierra con `Escape`.
- El enlace “Saltar al contenido” mueve el foco al contenido principal.
- El checkbox responde a puntero y barra espaciadora.
- Las gráficas conservan leyendas, tooltips y una tabla textual equivalente.

La automatización no sustituye una prueba posterior con usuarios y tecnologías
de asistencia reales.

## Errores conocidos y deuda técnica

- Los datos siguen limitados al `localStorage` del navegador actual; todavía no
  hay cuenta, sincronización ni migración entre dispositivos.
- Si el contenido local está corrupto, el adaptador vuelve al estado inicial; no
  existe aún una interfaz de recuperación o exportación.
- No hay edición offline ni resolución de conflictos. Estas funciones pertenecen
  a fases posteriores y no deben asumirse en el prototipo.
- La auditoría de lector de pantalla es semántica y automatizada; falta una sesión
  manual con VoiceOver, NVDA o equivalente antes del lanzamiento público.
- Playwright cubre Chromium en esta fase. La matriz Firefox, WebKit y navegadores
  reales está planificada para la fase de PWA/despliegue.

## Comandos

```bash
pnpm test
pnpm test:e2e
```

Para preparar Chromium y sus bibliotecas del sistema:

```bash
pnpm --filter @habit-tracker/web exec playwright install --with-deps chromium
```
