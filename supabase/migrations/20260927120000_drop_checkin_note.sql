-- `habit_checkins.note` se creó "reservada" en el esquema inicial, pero ni el
-- dominio ni ningún cliente la leen o escriben: cualquier valor guardado ahí
-- quedaba huérfano (Zod lo descarta al parsear). Se elimina hasta que las notas
-- se diseñen de verdad (plan, Fase 10: "Evaluar cantidades, notas y
-- temporizadores"). En producción no había ninguna nota al eliminarla.
alter table public.habit_checkins drop column note;
