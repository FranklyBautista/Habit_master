# Mascota del grupo (fase colaborativa C6)

Cada grupo tiene una mascota, un **pulpito**, que crece cuando el grupo cumple
sus hábitos compartidos. Es una versión genérica con animaciones básicas; las
ilustraciones definitivas pueden sustituirla sin cambiar las reglas.

## Principios

- **Se calcula, no se guarda.** El estado sale de una función pura del dominio
  (`getGroupPetState`) a partir de lo que ya devuelve `get_group_progress`
  (hábitos compartidos y fechas de check-in de cada miembro). No hay tabla ni
  "nivel" que un cliente pueda manipular, y la RLS ya limita las fechas de los
  check-ins a ayer–mañana.
- **Nunca muere.** Si la racha se corta se pone triste, pero conserva la etapa
  que alcanzó.
- **Mismo criterio de días que el resto de la app:** cada miembro se evalúa con
  sus fechas locales (`today` calculado en el servidor) y los periodos de
  archivado ya llegan como fechas locales.

## Cuándo "come" la mascota

Para un día `D`:

- **Participa** quien tiene al menos un hábito compartido activo ese día
  (iniciado y no archivado en `D`) y para quien `D` no está en el futuro.
- Un participante **está al día** si completó todos sus hábitos compartidos
  activos de `D`.
- La mascota **come** si está al día al menos **la mitad** de los
  participantes, redondeando hacia arriba (1 de 1, 1 de 2, 2 de 3, 2 de 4…).
  Si lo están todos, es un **festín** (solo cambia el mensaje).
- Un día sin participantes es **neutro**: ni suma ni corta la racha.

## Racha y etapas

- **Racha actual:** días seguidos en los que comió, terminando hoy si ya comió
  o ayer si todavía no (hoy no corta la racha hasta que termina, igual que
  `calculateStreaks`).
- **Mejor racha:** la racha más larga de toda la historia del grupo.
- La **etapa** depende de la mejor racha, para que no "encoja" al fallar:

| Mejor racha | Etapa   |
| ----------- | ------- |
| 0–2 días    | Cría    |
| 3–6 días    | Pequeña |
| 7–29 días   | Joven   |
| 30+ días    | Adulta  |

## Estado de ánimo (hoy)

| Situación                                                   | Ánimo      |
| ----------------------------------------------------------- | ---------- |
| Ya comió hoy                                                | Contenta   |
| No ha comido hoy y la racha sigue viva (o aún no hay racha) | Hambrienta |
| No ha comido hoy y la racha se cortó ayer o antes           | Triste     |
| Nadie tiene hábitos compartidos activos hoy                 | Dormida    |

"Hoy" es el día local de quien mira la vista del grupo.

## Recordatorio cuando tiene hambre

En móvil, si la mascota de algún grupo no ha comido hoy (hambrienta o triste),
se programa un aviso local (`expo-notifications`) para las 20:00 de ese día:
"El pulpito de Familia tiene hambre: marca tus hábitos compartidos." (o "Los
pulpitos de N grupos…" si son varios). Solo se programa si el usuario activó los
recordatorios en Ajustes y concedió el permiso; nunca se pide el permiso para
esto, y desactivar los recordatorios también lo cancela.

Se recalcula al cargar los grupos, tras cada cambio en ellos y cuando cambian
los check-ins propios; si ya comió o pasó la hora, se cancela. Es un aviso
aproximado: refleja el estado de la última vez que la app cargó los grupos (si
otro miembro le da de comer después, el aviso puede llegar igual). La web no
envía avisos (no hay push en v1, ADR 0002 §3).

## Limitaciones aceptadas

- La historia se calcula con los **miembros actuales** y sus hábitos
  compartidos actuales: si alguien sale o deja de compartir un hábito, el
  pasado del grupo se recalcula sin él. `get_group_progress` no expone desde
  cuándo es miembro cada persona (ADR 0002 §2), así que los días anteriores a
  su entrada también cuentan con sus check-ins.
- Los hábitos archivados ahora mismo no se devuelven, así que no cuentan.
