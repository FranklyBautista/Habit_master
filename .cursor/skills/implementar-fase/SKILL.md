---
name: implementar-fase
description: "Implementa de forma progresiva y verificada una sola fase del Habit Tracker usando PLANIFICACION_HABIT_TRACKER.md como fuente de verdad. Úsala cuando el usuario invoque $implementar-fase para una fase concreta o para la siguiente fase pendiente."
disable-model-invocation: true
---

# Implementar fase

Implementa solo la fase solicitada del Habit Tracker. La planificación define el
alcance; el código, las pruebas y las verificaciones definen el estado real. No
realices trabajo de una fase posterior ni avances de fase automáticamente.

## 1. Seleccionar la fase

1. Lee completamente `PLANIFICACION_HABIT_TRACKER.md`.
2. Examina únicamente las fases ubicadas bajo `## 7. Fases de desarrollo`, desde
   `### Fase ...` hasta antes de `## 8.`. Ignora casillas de otras secciones para
   elegir la fase.
3. Si el usuario indicó una fase, trabaja solo esa fase. Si es posterior a una
   fase con tareas sin marcar, no la inicies: explica el bloqueo y solicita
   dirección.
4. Sin una fase indicada, selecciona la primera fase con alguna tarea sin marcar.
5. Si la fase elegida ya está completa, informa el resultado; no selecciones la
   siguiente fase sin una nueva invocación.

## 2. Revisar antes de cambiar

Antes de editar, lee `AGENTS.md`, `README.md`, la documentación y configuración
relevantes a la fase. Revisa `git status`, preserva cambios existentes y examina
la estructura, código, dependencias y pruebas.

Compara una por una las tareas pendientes con la implementación real. No repitas
una funcionalidad existente. Si parece realizada, compruébala antes de marcarla.
Identifica dependencias y ordena las tareas de forma segura. Mantén los cambios
dentro de la fase actual, salvo correcciones imprescindibles para hacerla
funcionar. Si el plan y el proyecto se contradicen, detén esa parte, presenta la
evidencia y pide dirección sin modificar el alcance silenciosamente.

## 3. Implementar con alcance controlado

Implementa requisitos incompletos siguiendo la arquitectura y convenciones del
repositorio. Usa las skills técnicas disponibles que apliquen, por ejemplo las de
Next.js, Supabase, React o Vercel. Conserva TypeScript estricto y evita `any`
salvo justificación concreta.

No agregues funciones fuera de la fase, no reemplaces código funcional sin motivo
ni elimines o sobrescribas cambios del usuario. Mantén la aplicación ejecutable
después de cada conjunto coherente. Si la fase es extensa, completa un conjunto
coherente, verifica lo hecho y enumera las tareas restantes; no comiences la fase
siguiente.

## 4. Verificar el resultado

Registra el estado de las pruebas antes de cambiar cuando sea posible, para
distinguir fallos preexistentes de regresiones. Después ejecuta las pruebas
relacionadas y todas las comprobaciones disponibles: lint, typecheck, unitarias,
integración, E2E y build. Realiza una comprobación funcional o visual cuando
corresponda.

Comprueba el criterio de salida contra el resultado real. Investiga, corrige y
vuelve a ejecutar cualquier fallo introducido. No ocultes errores, no alteres
pruebas solo para aprobarlas y no declares terminada una tarea sin evidencia de
que funciona.

## 5. Actualizar la planificación

Edita `PLANIFICACION_HABIT_TRACKER.md` solo después de verificar cada tarea.
Cambia únicamente su `[ ]` a `[x]`; no reformules, reordenes ni elimines
requisitos sin autorización. Una tarea preexistente puede marcarse solo tras su
verificación. Deja sin marcar tareas bloqueadas, parciales o dependientes de una
acción manual.

Marca el criterio de salida únicamente si todas las tareas de la fase están
completas y el criterio fue comprobado. Cuando eso ocurra, informa que la fase
terminó y espera una nueva invocación antes de trabajar otra.

## 6. Acciones manuales y secretos

Para cuentas, dashboards, servicios externos, secretos, publicación o acciones
que este entorno no pueda ejecutar: no inventes resultados ni marques la tarea.
Explica el bloqueo y proporciona pasos numerados con el lugar de ejecución, los
comandos exactos cuando existan, el resultado esperado y cómo comprobarlo. Nunca
solicites, muestres ni guardes secretos reales en el repositorio.

## 7. Respuesta final

Usa esta estructura y omite **Acciones manuales para el usuario** si no aplica:

```markdown
## Fase trabajada

[Nombre y número de la fase]

## Implementado

- [Tareas completadas]
- [Funcionalidades que ya existían y fueron verificadas]

## Archivos principales modificados

- `ruta/al/archivo`: explicación breve

## Verificaciones realizadas

- Comando o prueba: resultado
- Comando o prueba: resultado

## Planificación actualizada

- Tareas marcadas como completadas
- Criterio de salida marcado o todavía pendiente

## Pendientes o bloqueos

- Pendiente, motivo y próximo paso

## Acciones manuales para el usuario

1. Paso
2. Comando o ubicación
3. Resultado esperado
4. Forma de verificarlo

## Siguiente paso recomendado

[Próxima tarea pendiente de la misma fase o indicación de que la fase terminó]
```
