# Fase 0 — Alcance y experiencia

Estado: **confirmada el 30 de agosto de 2026**.

Este documento convierte las decisiones de producto de la planificación en
recorridos observables. No agrega funciones al MVP.

## 1. Decisiones confirmadas

Se confirman sin cambios todas las decisiones de la sección 3 de
`PLANIFICACION_HABIT_TRACKER.md`:

- La interfaz inicial será en español y la semana comenzará en lunes.
- En el MVP cada hábito será diario y binario.
- Solo se podrá marcar o desmarcar el día local actual.
- Un check-in será único por hábito y fecha local; desmarcarlo lo eliminará.
- Los hábitos se archivarán en vez de borrarse y conservarán su historial.
- La zona horaria IANA procederá del dispositivo y se guardará en el perfil.
- El instante se guardará en UTC y el día del hábito como fecha local.
- La autenticación inicial será por correo y contraseña.
- Cada cuenta solo podrá acceder a sus propios datos.
- Supabase será la fuente de verdad cuando se active la sincronización.

## 2. Historias y criterios de aceptación

### Recorrido 1: completar hoy

Como persona usuaria quiero ver únicamente los hábitos activos que corresponden
a hoy para marcarlos sin distraerme con el historial.

Se considera entendido cuando:

- la pantalla muestra la fecha local, el progreso del día y los hábitos activos;
- un control marcado cambia inmediatamente el estado y el progreso;
- el mismo control permite desmarcar;
- existen estados vacío, cargando, error y sin conexión;
- no existe un control para modificar fechas pasadas o futuras.

### Recorrido 2: gestionar hábitos

Como persona usuaria quiero crear, editar, ordenar, archivar y restaurar hábitos
para adaptar la lista sin perder su historial.

Se considera entendido cuando:

- crear exige un nombre y permite descripción, color e icono opcionales;
- editar conserva los check-ins existentes;
- ordenar afecta la lista de Hoy;
- archivar retira el hábito de Hoy, pero no elimina sus estadísticas;
- los hábitos archivados pueden consultarse y restaurarse.

### Recorrido 3: revisar calendario

Como persona usuaria quiero revisar un calendario mensual para reconocer días
completos, parciales y sin cumplimiento.

Se considera entendido cuando:

- el calendario comienza en lunes y permite cambiar de mes;
- la intensidad representa un porcentaje, no una cantidad absoluta;
- una leyenda explica sin depender solo del color los estados sin datos, 0 %,
  parcial y 100 %;
- se puede alternar entre el resumen general y el detalle de un hábito;
- consultar un día anterior no permite editarlo.

### Recorrido 4: revisar progreso

Como persona usuaria quiero consultar cumplimiento y rachas para entender mi
constancia sin tener que interpretar solo una gráfica.

Se considera entendido cuando:

- hay periodos rápidos de 7, 30 y 90 días, con 30 como valor inicial;
- se muestran cumplimiento, racha actual y mejor racha;
- se puede ver el resumen general y comparar hábitos;
- cada gráfica dispone de leyenda y resumen textual accesible;
- los días en los que un hábito no existía o estaba archivado no cuentan en el
  denominador.

### Recorrido 5: ajustar preferencias

Como persona usuaria quiero revisar mi cuenta y preferencias regionales para
entender qué fecha y semana utiliza la aplicación.

Se considera entendido cuando:

- se muestran correo, zona horaria, idioma y comienzo de semana;
- el MVP fija español y lunes, dejando visible que son preferencias iniciales;
- se puede cerrar sesión cuando exista autenticación;
- no se presentan recordatorios, temas u opciones fuera del MVP.

## 3. Navegación

Las cinco vistas principales conservan el mismo orden en todas las plataformas:

1. Hoy (`/`)
2. Hábitos (`/habitos`)
3. Calendario (`/calendario`)
4. Estadísticas (`/estadisticas`)
5. Ajustes (`/ajustes`)

En móvil se usa una barra inferior fija con icono y texto. Cada objetivo táctil
tendrá al menos 44 × 44 px y la vista activa no se comunicará únicamente por
color. Las acciones de contexto, como “Crear hábito”, estarán en el encabezado o
contenido y no añadirán una sexta pestaña.

Desde 768 px se sustituye por una barra lateral izquierda persistente. El orden,
los nombres y los iconos se mantienen para no exigir reaprendizaje. El contenido
tendrá un ancho máximo legible y no habrá una navegación superior duplicada.

## 4. Límites acordados

- No se añaden hábitos cuantitativos, frecuencias semanales, gamificación,
  recordatorios, corrección del pasado ni funciones sociales.
- No se promete edición offline. Antes de Supabase, el prototipo usará datos
  locales; después, una desconexión se comunicará de forma explícita.
- Móvil y escritorio se iniciarán únicamente después de validar las entregas web
  señaladas en la planificación.

## 5. Registro de alcance

No hubo cambios de alcance durante la Fase 0. Los detalles anteriores aclaran las
decisiones existentes sin ampliar el MVP.

## 6. Criterio de salida

Los cinco recorridos tienen entrada, resultado y límites claros. Los wireframes,
el sistema visual y los datos ficticios están definidos en los archivos vecinos,
por lo que la implementación no necesita decidir nuevas funciones.
