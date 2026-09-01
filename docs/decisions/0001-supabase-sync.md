# ADR 0001 — Supabase como fuente de verdad

## Estado

Aceptada para la fase 6.

## Decisión

Cuando la aplicación se conecte a Supabase, Postgres será la fuente de verdad.
Cada escritura esperará la respuesta del servidor y después refrescará el estado
visible. Al recuperar el foco de la ventana se volverán a consultar perfiles,
hábitos y check-ins.

`updated_at` es obligatorio en perfiles y hábitos, se actualiza mediante trigger
y permite detectar si una respuesta local quedó obsoleta. En un conflicto, la
versión confirmada por el servidor gana; el MVP no intentará mezclar campos ni
mantener una cola offline.

Los check-ins se identifican por `(habit_id, checkin_date)`. Marcar usará un
`upsert` sobre esa clave y desmarcar un `delete` filtrado por ambas columnas. La
restricción única hace los reintentos de marcado idempotentes.

## Consecuencias

- Una desconexión se mostrará como error recuperable, no como sincronización
  completada.
- Las mutaciones pueden sentirse menos inmediatas que el adaptador local, pero no
  presentarán datos sin confirmar como definitivos.
- La sincronización offline con resolución de conflictos queda fuera del MVP.
- Los datos de `localStorage` solo se borrarán después de una importación
  confirmada o de un descarte explícitamente aceptado por la persona usuaria.
