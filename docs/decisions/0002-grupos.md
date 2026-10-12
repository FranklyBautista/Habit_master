# ADR 0002 — Grupos de hábitos compartidos

## Estado

Aceptada el 4 de octubre de 2026 como cierre de la fase colaborativa C1. Fija las
reglas de producto y de seguridad que deben respetar C2 (modelo de datos y RLS),
C3 (dominio y repositorio), C4 (pantallas) y C5 (chat). Los wireframes están en
`docs/product/WIREFRAMES_GRUPOS.md`.

## Contexto

Un grupo reúne a varias personas que comparten **algunos** de sus hábitos para
ver el progreso de las demás y animarse por chat. Hoy cada cuenta solo puede leer
sus propios datos (RLS owner-only, ADR 0001). Abrir esa frontera sin reglas
claras filtraría datos privados o reintroduciría problemas ya corregidos, como la
enumeración de correos en el registro (plan §14).

## Decisión

### 1. Invitaciones por código de usuario, nunca por correo

- Cada perfil tiene un **código de usuario** aleatorio de 8 caracteres en base32
  de Crockford, mostrado como `XXXX-XXXX` (sin `I`, `L`, `O` ni `U`; unos 10¹²
  combinaciones). Se ve y se copia en Ajustes y puede **regenerarse**, lo que
  invalida el anterior. No deriva del correo ni del id.
- Para invitar, el dueño del grupo escribe o pega ese código. No hay búsqueda por
  correo ni por nombre, así que no se puede averiguar qué correos tienen cuenta.
- Respuestas del servidor al invitar:
  - código con formato inválido o inexistente → "Código no válido.";
  - código válido → "Invitación enviada.", **también** si esa persona rechazó una
    invitación reciente de este grupo (la invitación no se crea, pero no se le
    revela al dueño);
  - ya es miembro o tiene una invitación pendiente → mensaje explícito, porque el
    dueño ya ve la lista de miembros e invitaciones.
- Sin enlaces de invitación en v1: un enlace reenviado deja entrar a cualquiera.
  Sin invitaciones por correo en v1: exigirían infraestructura de envío y la misma
  respuesta ambigua que la recuperación de contraseña.
- Toda invitación se crea y se responde por RPC `security definer`; el cliente
  nunca inserta filas en miembros ni invitaciones.

### 2. Qué ve un miembro del grupo

Un miembro solo ve, de cada persona del grupo:

| Se expone | Nunca se expone |
| --- | --- |
| Nombre visible (`profiles.display_name`) y rol | Correo, id de usuario, código de usuario |
| Nombre, color e icono de los hábitos **que esa persona comparte** | Hábitos no compartidos, ni siquiera cuántos tiene |
| Fechas (`YYYY-MM-DD`) completadas de esos hábitos | Descripción y posición de los hábitos |
| Fecha de inicio y periodos de archivado de esos hábitos (solo fechas, para calcular la racha igual que su dueño) | Hora exacta de los check-ins (`completed_at`) |
| Su fecha local de "hoy", calculada en el servidor | Zona horaria, idioma, `created_at`/`updated_at` |

Consecuencias técnicas obligatorias:

- **La lectura compartida no amplía la RLS de `habits` ni `habit_checkins`.** La
  RLS filtra filas, no columnas: una política de `select` para miembros expondría
  `description`, `position` y `completed_at`. En su lugar, C2 expone una función
  `security definer` (por ejemplo `get_group_progress(group_id)`) que comprueba la
  pertenencia y devuelve solo las columnas de la tabla anterior. Las tablas base
  siguen owner-only y las escrituras siguen siendo solo del dueño.
- "Hoy" de cada miembro se devuelve como clave de fecha ya calculada con su zona
  horaria, sin enviar la zona. La racha y el estado de hoy se calculan en
  `packages/domain` con las mismas funciones que la vista personal, para que la
  racha que ve el grupo coincida con la que ve su dueño.
- Un hábito compartido **archivado** desaparece del grupo mientras está archivado
  y vuelve al restaurarlo; la configuración de compartido se conserva.
- Para entrar en un grupo hace falta nombre visible. Si el perfil no lo tiene, el
  flujo de aceptar la invitación lo pide (1–60 caracteres, la regla actual del
  esquema). El valor por defecto "Tú" de la app nunca se muestra a otros.

### 3. Límites y reglas del grupo

- **Tamaño:** máximo 10 miembros por grupo, dueño incluido; las invitaciones
  pendientes cuentan para el límite. Máximo 10 grupos por persona.
- **Nombre del grupo:** 1–60 caracteres, igual que un hábito.
- **Hábitos compartidos:** cada miembro elige qué hábitos comparte en cada grupo
  (0–10 por grupo; con 0 participa solo animando). Un mismo hábito puede estar en
  varios grupos. Solo se pueden compartir hábitos propios y activos.
- **Roles:** `owner` (exactamente uno por grupo) y `member`.
  - El dueño renombra el grupo, invita, cancela invitaciones, expulsa,
    transfiere la propiedad y borra el grupo.
  - Un miembro gestiona sus hábitos compartidos y puede salir cuando quiera.
  - En v1 solo el dueño invita, para limitar el spam.
- **Invitaciones:** caducan a los 7 días; una sola pendiente por persona y grupo;
  como máximo 20 invitaciones enviadas por persona cada 24 horas. Tras un rechazo,
  el mismo grupo no puede volver a invitar a esa persona durante 30 días (en
  silencio, ver §1). El invitado puede aceptar o rechazar; el dueño puede
  cancelarla.
- **Salir o ser expulsado:** se pierde el acceso al grupo al instante y se borran
  los hábitos que esa persona compartía en él (sus datos personales no cambian).
  Una persona expulsada puede volver a ser invitada.
- **El dueño se va:** debe transferir la propiedad antes de salir. Si es el único
  miembro, salir borra el grupo. Si el dueño **elimina su cuenta**, la propiedad
  pasa automáticamente al miembro más antiguo; sin miembros, el grupo se borra.
- **Chat (C5):** al salir, los mensajes de esa persona se conservan con autor
  "Antiguo miembro". Al eliminar la cuenta se borran sus mensajes.
- **Avisos:** en v1 las invitaciones solo se ven dentro de la app (Hoy y
  `/grupos`); las notificaciones push quedan para después.

## Consecuencias

- La función se puede construir sin abrir las tablas privadas: toda lectura
  ajena pasa por RPC que validan pertenencia, y los pgTAP de C2 deben probar que
  un no-miembro, un exmiembro o un hábito no compartido nunca se leen.
- La tarea "Exportar datos y eliminar cuenta" (Fase 10) debe incluir grupos:
  transferir la propiedad, borrar membresías, hábitos compartidos y mensajes, y
  exportar solo los datos propios, nunca el progreso de otros miembros.
- El código de usuario no es secreto, pero sí revocable; si se filtra, la
  persona lo regenera y las invitaciones pendientes siguen siendo rechazables.
- Sin búsqueda de personas ni enlaces, invitar exige compartir el código por otro
  canal. Se acepta esa fricción a cambio de no exponer cuentas.
- Una persona puede deducir de forma aproximada la zona de otra viendo cuándo
  cambia su "hoy"; se acepta, porque no se expone la zona ni la hora exacta.

## Addendum C5 — Chat del grupo (12 de octubre de 2026)

Migración `20261012120000_create_group_messages.sql`.

- **Modelo:** `group_messages (id, group_id, user_id, body, created_at)`, con
  `body` de 1 a 1000 caracteres tras quitar los espacios de los extremos.
  Borrar el grupo o la cuenta borra los mensajes en cascada; salir o ser
  expulsado no, y el autor pasa a mostrarse como "Antiguo miembro".
- **Acceso por RPC, como el resto de grupos:** `send_group_message`,
  `get_group_messages` (páginas de 50, de más reciente a más antiguo, con
  cursor `(created_at, id)`) y `delete_group_message` son `security definer` y
  comprueban la pertenencia en cada llamada. De cada mensaje devuelven el
  texto, la fecha, si es propio, el nombre visible del autor y el id opaco de su
  membresía (el mismo que ya expone `get_group_progress`); nunca su id de
  usuario, correo ni código.
- **Moderación:** cada persona solo borra sus propios mensajes y solo mientras
  es miembro; el dueño modera expulsando. Máximo 10 mensajes por minuto, por
  persona y grupo, comprobado en `send_group_message`. La app genera el id del
  mensaje para que reintentar un envío no lo duplique.
- **Excepción a "tablas de grupos sin políticas":** Realtime
  (`postgres_changes`) decide a quién enviar cada evento leyendo la fila con el
  rol del cliente, así que `group_messages` tiene:
  - una política `select` para miembros actuales, que consulta la pertenencia
    con `private.is_group_member(group_id)` (`security definer`, sin dar
    permisos sobre `group_members`). Para ello `authenticated` recibe `usage`
    sobre el esquema `private` y `execute` solo sobre esa función; el resto de
    funciones de `private` siguen sin permiso (lo comprueba pgTAP);
  - `grant select (id, group_id)`: Realtime omite del payload las columnas que
    el rol no puede leer, así que el evento nunca lleva el texto, el autor ni la
    hora. La app lo trata solo como señal y vuelve a pedir la página por RPC
    (ADR 0001: el estado viene del servidor, sin UI optimista);
  - la tabla en la publicación `supabase_realtime`.

  Sigue sin haber permisos de `insert`, `update` ni `delete` para clientes.
- **Borrados sin tiempo real:** Realtime no aplica la RLS a los `DELETE`; con la
  identidad de réplica por defecto, el filtro por `group_id` no los deja pasar a
  nadie. Así ningún exmiembro recibe señales del grupo, a cambio de que los
  demás vean un borrado al siguiente refresco (otro mensaje, volver a la
  pestaña o a la app, o recuperar la conexión). No se usa `replica identity
  full`: haría llegar los borrados a cualquiera que conociera el id del grupo.
