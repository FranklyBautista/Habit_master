# Planificación de desarrollo — Habit Tracker multiplataforma

> Documento vivo del proyecto. Marca una tarea con `[x]` solamente cuando esté implementada y verificada.

## 1. Visión del producto

Construir un habit tracker personal que permita crear hábitos diarios, marcar su cumplimiento con un checkbox y consultar el progreso mediante calendarios y gráficas. Los datos deberán terminar sincronizados entre web, móvil y escritorio mediante una única cuenta.

La estrategia será entregar valor progresivamente:

1. Prototipo web local para validar la experiencia principal.
2. MVP web responsive, instalable como PWA y sincronizado con Supabase.
3. Aplicación móvil nativa con Expo/React Native.
4. Aplicación de escritorio con Tauri.

La web responsive/PWA será la primera forma de usar la aplicación desde el teléfono. Esto permitirá validar el producto antes de asumir el coste de mantener aplicaciones nativas.

## 2. Alcance funcional



### MVP obligatorio

- Crear, editar, ordenar y archivar hábitos.
- Mostrar únicamente los hábitos activos que corresponden al día.
- Marcar y desmarcar el cumplimiento diario mediante checkboxes.
- Conservar el historial al archivar un hábito.
- Mostrar un calendario mensual con el estado de cada día.
- Mostrar progreso general y por hábito.
- Calcular racha actual, mejor racha y porcentaje de cumplimiento.
- Registrar usuarios y sincronizar sus datos entre dispositivos.
- Funcionar correctamente en pantallas móviles y de escritorio.
- Tener estados vacíos, de carga, de error y sin conexión comprensibles.



### Fuera del MVP

- Hábitos compartidos, grupos, seguidores o funciones sociales.
- Pagos, suscripciones o planes premium.
- Coaching con IA.
- Integraciones con wearables, Apple Health o Google Health Connect.
- Hábitos cuantitativos como “beber 2 litros”; inicialmente son binarios.
- Frecuencias complejas; inicialmente todos los hábitos son diarios.
- Gamificación avanzada, recompensas y avatares.
- Sincronización offline con resolución compleja de conflictos.
- Widgets nativos y smartwatch.



## 3. Decisiones de producto iniciales

- Idioma inicial: español.
- Semana iniciada en lunes.
- Un hábito completado equivale a un registro único por hábito y fecha local.
- Desmarcar elimina ese registro de cumplimiento.
- Los hábitos se archivan en lugar de borrarse para no perder estadísticas.
- La zona horaria se obtiene del dispositivo y se guarda en el perfil.
- La hora exacta se almacena en UTC; el día del hábito se almacena como fecha local.
- Durante el MVP solo se marca el día actual. La corrección de días pasados se evaluará después.
- Autenticación inicial con correo y contraseña; OAuth puede añadirse más adelante.
- La app será personal: cada usuario solo puede acceder a sus propios datos.
- La base de datos será la fuente de verdad cuando se active la sincronización.



## 4. Arquitectura recomendada



### Tecnologías


| Área                     | Elección                                      | Motivo                                                                                  |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Lenguaje principal       | TypeScript estricto                           | Permite compartir tipos y lógica entre plataformas.                                     |
| Web                      | Next.js con App Router                        | Es la tecnología que se desea aprender y permite una web moderna desplegable en Vercel. |
| Estilos                  | Tailwind CSS + componentes accesibles         | Acelera una interfaz responsive sin ocultar los fundamentos de CSS.                     |
| Formularios y validación | React Hook Form + Zod                         | Validación reutilizable, tipada y visible para el usuario.                              |
| Backend y persistencia   | Supabase: Postgres, Auth y Row Level Security | Una base de datos y autenticación comunes para todas las plataformas.                   |
| Gráficas web/escritorio  | Recharts                                      | Adecuado para barras, líneas y áreas en React.                                          |
| Fechas                   | date-fns                                      | Cálculos explícitos y fáciles de probar.                                                |
| App móvil                | Expo + React Native + Expo Router             | Mantiene TypeScript y da acceso a funciones nativas de iOS/Android.                     |
| App de escritorio        | Tauri 2 + React/Vite                          | Binarios ligeros y reutilización de lógica/componentes web.                             |
| Pruebas                  | Vitest, Testing Library y Playwright          | Cubre lógica, componentes y recorridos completos de la web.                             |
| Despliegue web           | Vercel                                        | Integración natural con Next.js y entornos de preview.                                  |


No se recomienda crear un backend Python para el MVP: Supabase ya cubre autenticación, base de datos y API. Python puede incorporarse más adelante para análisis de datos, importaciones o tareas especializadas que realmente lo necesiten.

### Principios de arquitectura

- Compartir reglas de negocio, tipos, validaciones y cálculos; no intentar compartir toda la interfaz entre web y React Native.
- Mantener las funciones de estadísticas puras y sin dependencia de React para reutilizarlas en las tres aplicaciones.
- Usar Server Components para lecturas iniciales de la web y Client Components solo donde exista interacción.
- Usar Server Actions para mutaciones internas de la web; móvil y escritorio accederán a Supabase con su SDK y bajo RLS.
- Reservar Route Handlers o Edge Functions para webhooks u operaciones privilegiadas, no como capa adicional por defecto.
- Usar el runtime Node.js de Next.js salvo que aparezca un requisito concreto para Edge.
- Nunca exponer una clave `service_role` en web, móvil o escritorio.
- Fijar versiones de dependencias y guardar el lockfile.



### Estructura objetivo del repositorio

```text
habit_tracker/
├── apps/
│   ├── web/                 # Next.js; se crea primero
│   ├── mobile/              # Expo; se añade después del MVP web
│   └── desktop/             # Tauri + React/Vite; última plataforma
├── packages/
│   ├── domain/              # Entidades, Zod, fechas, rachas y métricas
│   ├── database/            # Tipos generados y consultas reutilizables
│   ├── design-tokens/       # Colores, tipografía y espaciado
│   └── ui-web/              # Componentes DOM compartidos por web/escritorio
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
│   └── decisions/           # Decisiones técnicas breves
└── PLANIFICACION_HABIT_TRACKER.md
```

Se puede comenzar con `apps/web` y `packages/domain`. Las demás carpetas se crean cuando empieza su fase para evitar estructura vacía y complejidad prematura.

### Nota sobre Next.js y Tauri

La web de Next.js podrá utilizar SSR y Server Actions. Tauri requiere un frontend exportable de forma estática y no ejecuta por sí mismo el servidor de Next.js. Por eso la app de escritorio usará React/Vite y compartirá `domain`, `database`, `design-tokens` y `ui-web`, en lugar de intentar empaquetar sin cambios toda la aplicación Next.js.

## 5. Modelo de datos inicial



### `profiles`


| Campo                      | Propósito                                             |
| -------------------------- | ----------------------------------------------------- |
| `id uuid`                  | PK y referencia al usuario de Supabase Auth.          |
| `display_name text`        | Nombre opcional.                                      |
| `timezone text`            | Zona horaria IANA, por ejemplo `America/Los_Angeles`. |
| `locale text`              | Inicialmente `es`.                                    |
| `week_starts_on smallint`  | Inicialmente lunes.                                   |
| `created_at`, `updated_at` | Auditoría.                                            |




### `habits`


| Campo                      | Propósito                                             |
| -------------------------- | ----------------------------------------------------- |
| `id uuid`                  | Identificador del hábito.                             |
| `user_id uuid`             | Propietario.                                          |
| `name text`                | Nombre requerido.                                     |
| `description text`         | Detalle opcional.                                     |
| `color text`               | Color para calendario y gráficas.                     |
| `icon text`                | Icono opcional.                                       |
| `frequency text`           | En el MVP siempre `daily`, preparado para ampliarse.  |
| `start_date date`          | Primer día en que el hábito cuenta para estadísticas. |
| `position integer`         | Orden en la lista diaria.                             |
| `archived_at timestamptz`  | Nulo mientras esté activo.                            |
| `created_at`, `updated_at` | Auditoría y sincronización.                           |




### `habit_checkins`


| Campo                      | Propósito                                       |
| -------------------------- | ----------------------------------------------- |
| `id uuid`                  | Identificador del registro.                     |
| `habit_id uuid`            | Hábito completado.                              |
| `user_id uuid`             | Propietario, útil para RLS.                     |
| `checkin_date date`        | Fecha local a la que pertenece el cumplimiento. |
| `completed_at timestamptz` | Momento exacto en UTC.                          |
| `note text`                | Reservado como opcional.                        |


Restricciones obligatorias:

- `UNIQUE (habit_id, checkin_date)` para hacer el marcado idempotente.
- Relación que impida asociar un check-in al hábito de otro usuario, idealmente mediante una clave foránea compuesta `(habit_id, user_id)`.
- Índices por `user_id`, `checkin_date` y los rangos usados en estadísticas.
- RLS habilitado en todas las tablas expuestas.
- Políticas de `SELECT`, `INSERT`, `UPDATE` y `DELETE` que validen `auth.uid() = user_id`; las de actualización deben incluir `USING` y `WITH CHECK`.
- Verificación explícita de que las tablas necesarias estén expuestas a la Data API y tengan los permisos `GRANT` apropiados; esto es independiente de RLS.



## 6. Definición de métricas

- **Cumplimiento diario:** hábitos completados / hábitos activos esperados para ese día.
- **Cumplimiento del periodo:** check-ins realizados / check-ins esperados entre dos fechas.
- **Racha actual:** días consecutivos completados. Si hoy aún no terminó y está incompleto, puede continuar desde ayer.
- **Mejor racha:** mayor cantidad histórica de días consecutivos completados.
- **Calendario general:** intensidad del día basada en el porcentaje de hábitos completados, no solo en el número absoluto.
- **Periodo predeterminado:** últimos 30 días, con accesos a 7 y 90 días.

Los hábitos todavía no creados o ya archivados no entran en el denominador. Estas reglas deberán probarse especialmente en cambios de mes, año, horario de verano y zona horaria.

## 7. Fases de desarrollo



### Fase 0 — Cerrar el alcance y la experiencia (1–2 jornadas)

- [x] Confirmar las decisiones de producto de la sección 3.
- [x] Escribir las historias principales: crear hábito, completar hoy, revisar calendario y revisar progreso.
- [x] Dibujar wireframes simples para móvil y escritorio de: Hoy, Hábitos, Calendario, Estadísticas y Ajustes.
- [x] Definir la navegación móvil inferior y la navegación lateral/superior de escritorio.
- [x] Definir colores, iconos, tipografía y estados de progreso.
- [x] Crear un pequeño conjunto de datos ficticios para diseño y pruebas.
- [x] Registrar cualquier cambio de alcance en este documento.

**Criterio de salida**

- [x] Los cinco recorridos principales se entienden sin decidir nuevas funciones durante la implementación.



### Fase 1 — Fundamentos del repositorio y Next.js (2–3 jornadas)

- [x] Inicializar Git y crear un `.gitignore` adecuado.
- [x] Configurar el workspace con pnpm y `apps/web`.
- [x] Crear la app Next.js con App Router, TypeScript estricto y carpeta `src`.
- [x] Configurar Tailwind CSS y la base de componentes accesibles.
- [x] Configurar ESLint, Prettier y orden consistente de imports.
- [x] Crear `packages/domain` para lógica compartida sin dependencias de UI.
- [x] Configurar aliases, scripts de desarrollo, build, lint, typecheck y test.
- [x] Crear `.env.example` sin secretos y documentar variables.
- [x] Añadir estados globales `loading`, `error` y `not-found` de Next.js.
- [x] Crear un README con requisitos y comandos de inicio.
- [x] Configurar CI para lint, typecheck, pruebas y build.

**Criterio de salida**

- [x] Una instalación limpia puede ejecutar la web y todas las comprobaciones pasan.



### Fase 2 — Diseño responsive y navegación (3–5 jornadas)

- [x] Crear el layout mobile-first.
- [x] Implementar navegación entre Hoy, Hábitos, Calendario, Estadísticas y Ajustes.
- [x] Crear componentes de botón, checkbox, tarjeta, diálogo, formulario, toast y skeleton.
- [x] Implementar modo claro; dejar modo oscuro como opcional posterior.
- [x] Diseñar estados vacíos y mensajes de error accionables.
- [x] Garantizar áreas táctiles cómodas y navegación por teclado.
- [x] Verificar contraste, etiquetas de formularios y foco visible.
- [x] Probar anchos aproximados de 360 px, tableta y escritorio.

**Criterio de salida**

- [x] Se puede recorrer toda la interfaz con datos ficticios desde teléfono y escritorio sin desbordamientos.



### Fase 3 — Núcleo funcional local (5–8 jornadas)

- [x] Definir tipos y esquemas Zod para `Habit`, `HabitCheckin` y ajustes del usuario.
- [x] Crear una interfaz de repositorio de hábitos independiente de la persistencia.
- [x] Implementar un adaptador local sencillo para el prototipo.
- [x] Implementar creación de hábitos con nombre requerido.
- [x] Implementar edición de nombre, descripción, color e icono.
- [x] Implementar orden de hábitos.
- [x] Implementar archivado y restauración sin perder check-ins.
- [x] Mostrar los hábitos activos en la vista Hoy.
- [x] Marcar y desmarcar el día actual con respuesta visual inmediata.
- [x] Evitar check-ins duplicados.
- [x] Manejar correctamente fecha local y zona horaria.
- [x] Añadir pruebas unitarias de CRUD, archivado y marcado idempotente.

**Criterio de salida**

- [x] Una persona puede crear varios hábitos, recargar la página y seguir marcándolos localmente sin perder datos.



### Fase 4 — Calendario, gráficas y estadísticas (5–8 jornadas)

- [x] Implementar las funciones puras de cumplimiento, racha actual y mejor racha.
- [x] Probar días sin hábitos, hábitos nuevos, hábitos archivados y periodos incompletos.
- [x] Crear calendario mensual general con intensidad por porcentaje.
- [x] Crear calendario de detalle por hábito.
- [x] Permitir navegar entre meses sin perder el contexto.
- [x] Crear tarjetas de resumen para hoy, 7, 30 y 90 días.
- [x] Crear gráfica de línea o área del cumplimiento diario.
- [x] Crear gráfica de barras para comparar hábitos.
- [x] Añadir leyendas, tooltips y una alternativa textual accesible para las gráficas.
- [x] Evitar cargar la librería de gráficas donde no se utiliza.
- [x] Añadir pruebas en límites de semana, mes, año y horario de verano.

**Criterio de salida**

- [x] Las cifras del calendario, las tarjetas y las gráficas coinciden con un conjunto de datos calculado manualmente.



### Fase 5 — Calidad del prototipo web (3–5 jornadas)

- [x] Añadir pruebas de componentes para formulario, checkbox y filtros de fecha.
- [x] Añadir recorridos Playwright: crear hábito, marcarlo, desmarcarlo, archivarlo y consultar estadísticas.
- [x] Probar entradas inválidas y nombres demasiado largos.
- [x] Revisar accesibilidad con teclado y lector de pantalla básico.
- [x] Medir rendimiento y eliminar renders o dependencias innecesarias.
- [x] Añadir confirmaciones solo en acciones realmente destructivas.
- [x] Documentar errores conocidos y deuda técnica.

**Criterio de salida**

- [x] El prototipo local es estable y la experiencia principal está validada antes de introducir cuentas y sincronización.



### Fase 6 — Supabase, autenticación y sincronización (6–10 jornadas)

- [x] Revisar el changelog y la documentación vigente de Supabase antes de instalar o configurar paquetes.
- [x] Crear el proyecto remoto de producción (`habit_master`). **Cambio de alcance (2026-09-01):** se descarta crear un segundo proyecto remoto de desarrollo. Para un proyecto personal, el plan gratuito y la fricción de administrar una segunda organización no lo justifican: Supabase local (Docker) cubre el desarrollo diario y CI levanta su propio Supabase local desechable en cada push, así que ningún flujo automatizado toca `habit_master`. Se reevaluará si el proyecto suma colaboradores, necesita que los Preview de Vercel golpeen datos remotos reales, o pasa a un plan de pago. Detalle en `docs/setup/SUPABASE.md`.
- [x] Instalar y fijar versiones de Supabase CLI, `supabase-js` y `@supabase/ssr`.
- [x] Inicializar migraciones y datos seed reproducibles.
- [x] Implementar las tablas, restricciones e índices de la sección 5.
- [x] Generar los tipos TypeScript desde la base de datos.
- [x] Implementar registro, login, logout y recuperación de contraseña.
- [x] Crear clientes Supabase separados para navegador y servidor en Next.js.
- [x] Implementar renovación segura de sesión con el mecanismo vigente de Next.js/Supabase.
- [x] Proteger páginas verificando la identidad; no confiar en datos de sesión sin validar para autorización.
- [x] Habilitar RLS en cada tabla expuesta.
- [x] Crear y probar políticas de propiedad para todas las operaciones.
- [x] Verificar permisos de Data API además de RLS.
- [x] Sustituir el adaptador local por el repositorio Supabase.
- [x] Implementar operaciones idempotentes para marcar/desmarcar.
- [x] Refrescar datos al volver a enfocar la app y después de una mutación.
- [x] Definir estrategia de conflicto inicial: servidor como fuente de verdad y `updated_at` para detectar cambios.
- [x] Ofrecer una migración explícita de los datos locales a la primera cuenta, o descartarlos con confirmación.
- [x] Probar aislamiento con dos usuarios distintos intentando acceder a los datos del otro.
- [x] Ejecutar asesores de seguridad/rendimiento y corregir hallazgos relevantes.
- [x] Verificar las migraciones desde una base limpia.

**Criterio de salida**

- [x] Dos navegadores con la misma cuenta ven datos consistentes, y dos cuentas diferentes permanecen completamente aisladas.



### Fase 7 — PWA, Vercel y MVP web (3–5 jornadas)

- [x] Crear manifest, iconos, nombre, color de tema y pantalla de instalación.
- [x] Añadir service worker con una estrategia de caché segura y mantenida.
- [x] No almacenar en caché respuestas autenticadas que puedan mezclar sesiones entre usuarios.
- [x] Definir una experiencia offline de solo lectura o un mensaje claro; no prometer sincronización offline todavía.
- [ ] Verificar instalación en Android/iOS y escritorio cuando el navegador lo permita.
- [x] Conectar el repositorio a Vercel con entornos Preview y Production.
- [x] Configurar variables de entorno sin exponer secretos.
- [ ] Configurar URLs de redirección de Supabase para local, previews y producción.
- [x] Ejecutar build de producción, pruebas E2E y auditoría Lighthouse.
- [ ] Probar el flujo completo en Chrome, Edge, Firefox y Safari.
- [x] Crear una lista breve de verificación para despliegues y rollback.

**Criterio de salida — MVP v1**

- [ ] La PWA se puede instalar en un teléfono, registrar hábitos diariamente y ver los mismos datos desde otro dispositivo.



### Fase 8 — Aplicación móvil con Expo (8–14 jornadas)

- [ ] Confirmar que el MVP web está validado antes de iniciar esta fase.
- [ ] Crear `apps/mobile` con Expo, TypeScript y Expo Router.
- [ ] Reutilizar `domain`, tipos de base de datos y design tokens.
- [ ] Implementar almacenamiento seguro de sesión y deep links de autenticación.
- [ ] Implementar las pantallas Hoy, Hábitos, Calendario, Estadísticas y Ajustes.
- [ ] Adaptar componentes a controles nativos y accesibles.
- [ ] Conectar la app directamente a Supabase bajo las mismas políticas RLS.
- [ ] Implementar actualización al enfocar y estados de conectividad.
- [ ] Añadir respuesta optimista e idempotencia al marcar hábitos.
- [ ] Añadir recordatorios locales configurables después de estabilizar el tracking.
- [ ] Probar en al menos un dispositivo Android y uno iOS, reales o mediante acceso verificable.
- [ ] Añadir pruebas unitarias y de componentes móviles.
- [ ] Crear development builds y configurar el proceso de distribución con EAS.
- [ ] Preparar iconos, splash screen, permisos y textos de privacidad.
- [ ] Hacer una beta interna antes de preparar App Store/Play Store.

**Criterio de salida — v1 móvil**

- [ ] Marcar un hábito en móvil actualiza el estado visible en web y viceversa, sin duplicados ni pérdida de historial.



### Fase 9 — Aplicación de escritorio con Tauri (5–9 jornadas)

- [ ] Confirmar qué funciones nativas justifican la app frente a usar la PWA.
- [ ] Crear `apps/desktop` con Tauri 2 y React/Vite.
- [ ] Reutilizar `domain`, `database`, `design-tokens` y `ui-web` donde sea práctico.
- [ ] Implementar login y almacenamiento seguro de sesión con APIs apropiadas para escritorio.
- [ ] Implementar las cinco pantallas principales.
- [ ] Conectar a Supabase y validar las mismas políticas RLS.
- [ ] Añadir, si aporta valor, bandeja del sistema y notificaciones locales.
- [ ] Restringir permisos y capacidades de Tauri al mínimo necesario.
- [ ] Configurar Content Security Policy y revisar el modelo de seguridad.
- [ ] Probar primero Windows y después los sistemas operativos elegidos.
- [ ] Generar instaladores firmados para las plataformas objetivo.
- [ ] Diseñar el mecanismo de actualizaciones antes de distribución pública.

**Criterio de salida — v1 escritorio**

- [ ] La aplicación instalada permite completar todo el recorrido principal y sincroniza con web/móvil.



### Fase 10 — Operación y mejoras posteriores (continuo)

- [ ] Añadir monitoreo de errores respetando la privacidad.
- [ ] Añadir métricas de producto anónimas y mínimas, con consentimiento cuando corresponda.
- [ ] Crear exportación de datos a CSV/JSON y eliminación de cuenta.
- [ ] Definir backups, recuperación y política de retención.
- [ ] Añadir modo oscuro.
- [ ] Evaluar corrección de días pasados con un registro claro de cambios.
- [ ] Evaluar hábitos por días de semana y objetivos semanales.
- [ ] Evaluar cantidades, notas y temporizadores.
- [ ] Evaluar sincronización offline con cola local y política explícita de conflictos.
- [ ] Evaluar OAuth, biometría, widgets e integraciones de salud.
- [ ] Revisar periódicamente dependencias y avisos de seguridad.



## 8. Matriz mínima de pruebas


| Área           | Casos imprescindibles                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| Hábitos        | Crear, editar, ordenar, archivar, restaurar y validar entradas.                        |
| Check-ins      | Marcar, desmarcar, doble toque, reintento de red y restricción de duplicados.          |
| Fechas         | Medianoche, cambio de mes/año, horario de verano y cambio de zona horaria.             |
| Métricas       | Sin hábitos, hábito nuevo, archivado, periodos parciales y múltiples hábitos.          |
| Seguridad      | Usuario A no puede leer ni modificar datos de B; claves secretas no llegan al cliente. |
| Sincronización | Dos dispositivos, cambios consecutivos, reconexión y recarga.                          |
| Accesibilidad  | Teclado, foco, etiquetas, contraste, lector de pantalla y alternativa a gráficas.      |
| Responsive     | Teléfono pequeño, tableta y escritorio.                                                |




## 9. Definición de terminado para cualquier tarea

Una tarea solo se considera terminada cuando:

- [ ] Cumple su criterio de aceptación observable.
- [ ] Tiene estados de carga, vacío y error cuando aplican.
- [ ] No rompe móvil ni escritorio web.
- [ ] Incluye o actualiza pruebas proporcionales al riesgo.
- [ ] Pasa lint, typecheck, pruebas y build.
- [ ] No introduce secretos ni debilita RLS.
- [ ] Actualiza documentación o decisiones si cambió el comportamiento.



## 10. Riesgos principales y mitigación


| Riesgo                                      | Mitigación                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Intentar construir tres apps a la vez       | Terminar y validar web/PWA antes de móvil y escritorio.                            |
| Duplicar lógica entre plataformas           | Centralizar dominio, validaciones, métricas y tipos.                               |
| Forzar una UI universal difícil de mantener | Compartir UI solo entre web/escritorio; crear UI nativa en móvil.                  |
| Errores de rachas por zona horaria          | Separar `checkin_date` local de `completed_at` UTC y probar límites.               |
| Fuga de datos entre usuarios                | RLS por propiedad, claves correctas y pruebas con dos usuarios.                    |
| Conflictos de sincronización                | Restricciones únicas, operaciones idempotentes y servidor como fuente de verdad.   |
| Pérdida de historial al borrar              | Archivar hábitos y proteger relaciones en base de datos.                           |
| Gráficas bonitas pero inaccesibles          | Añadir resumen textual, leyendas y contraste suficiente.                           |
| Complejidad de offline                      | Empezar online-first; agregar cola offline solo con reglas de conflicto definidas. |




## 11. Orden de lanzamientos

- [ ] **Prototipo v0:** Fases 0–5, datos locales y experiencia validada.
- [ ] **MVP web/PWA v1:** Fases 6–7, autenticación, sincronización y despliegue.
- [ ] **Móvil v1:** Fase 8, beta y publicación gradual.
- [ ] **Escritorio v1:** Fase 9, comenzando por el sistema operativo prioritario.
- [ ] **Mejoras:** Fase 10 guiada por uso real y feedback.



## 12. Estimación y ritmo recomendado

Las estimaciones anteriores representan jornadas netas de desarrollo y aprendizaje, no fechas de calendario. Para una persona que está aprendiendo su primer framework web, conviene trabajar en entregas de 1–3 tareas y cerrar cada fase con una demostración funcional.

Ritmo sugerido:

1. Elegir como máximo tres checkboxes para la iteración actual.
2. Implementar una por una manteniendo la aplicación ejecutable.
3. Ejecutar las comprobaciones y demostrar el resultado.
4. Marcar `[x]` únicamente después de verificarlo.
5. Registrar nuevos requisitos en la fase apropiada en vez de interrumpir el MVP.



## 13. Referencias oficiales para la implementación

- [Next.js App Router](https://nextjs.org/docs/app)
- [Manifest de PWA en Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Supabase SSR con Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Expo](https://docs.expo.dev/)
- [Tauri 2](https://v2.tauri.app/start/)
- [Tauri con Next.js y la limitación de exportación estática](https://v2.tauri.app/start/frontend/nextjs/)
- [Vercel para Next.js](https://vercel.com/docs/frameworks/nextjs)

---

**Próximo paso recomendado:** comenzar la Fase 1 usando los entregables confirmados de la Fase 0 en `docs/product/`.
