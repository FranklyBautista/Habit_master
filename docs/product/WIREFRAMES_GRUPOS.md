# Wireframes de grupos (fase colaborativa)

Igual que `WIREFRAMES.md`: jerarquía y navegación, no medidas ni estilo. Las
reglas de qué se muestra y los límites están en
`docs/decisions/0002-grupos.md`. `●` indica la sección activa.

## Navegación

- **Móvil:** la barra inferior se queda con 5 pestañas. Se entra a Grupos desde
  una tarjeta en Hoy (con el número de invitaciones pendientes) y desde Ajustes.
- **Escritorio web:** sexto elemento "Grupos" en la barra lateral, con contador
  de invitaciones.
- Rutas: `/grupos` (lista e invitaciones), `/grupos/nuevo`, `/grupos/[id]`,
  `/grupos/[id]/chat` y `/grupos/[id]/ajustes`.

## Móvil

### Hoy con acceso a grupos

```text
┌──────────────────────────────┐
│ Hoy              dom, 4 oct  │
│ Buenos días, Alex            │
│ ┌──────────────────────────┐ │
│ │ 3 de 4        75 %       │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 👥 Grupos      1 nueva › │ │
│ │ Familia: 3 de 4 hoy      │ │
│ └──────────────────────────┘ │
│ Hábitos de hoy                │
│ ☑ Meditar  ☐ Caminar  …      │
├──────────────────────────────┤
│ ●Hoy ○Hábitos ○Cal. ○Est. ○Aj│
└──────────────────────────────┘
```

Sin grupos ni invitaciones, la tarjeta dice "Comparte hábitos con tu gente" y
lleva a crear un grupo. Se puede ocultar desde Ajustes.

### Grupos e invitaciones

```text
┌──────────────────────────────┐
│ ‹ Grupos         [+ Crear]   │
│ Invitaciones (1)             │
│ ┌──────────────────────────┐ │
│ │ Sam te invita a          │ │
│ │ "Gimnasio"  · caduca en 6d│ │
│ │ [Rechazar]   [Ver y unirme]│ │
│ └──────────────────────────┘ │
│ Tus grupos (2/10)            │
│ Familia      4 miembros    › │
│ Lectura      2 miembros    › │
└──────────────────────────────┘
```

### Aceptar una invitación

```text
┌──────────────────────────────┐
│ ‹ Unirte a "Gimnasio"        │
│ Dueño: Sam · 3 miembros      │
│                              │
│ Tu nombre en el grupo        │
│ [ Alex                     ] │
│ (Solo si tu perfil no tiene  │
│  nombre visible)             │
│                              │
│ ¿Qué hábitos compartes?      │
│ ☑ Caminar                    │
│ ☐ Meditar                    │
│ ☐ Leer 20 minutos            │
│ Los demás verán el nombre y  │
│ los días completados. Nada   │
│ más de tu cuenta.            │
│                              │
│ [Rechazar]          [Unirme] │
└──────────────────────────────┘
```

### Crear grupo (3 pasos)

```text
┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────────┐
│ ‹ Nuevo grupo        1 de 3  │   │ ‹ Nuevo grupo        2 de 3  │   │ ‹ Nuevo grupo        3 de 3  │
│ Nombre del grupo             │   │ Hábitos que compartes        │   │ Invita con su código         │
│ [ Familia                  ] │   │ ☑ Meditar                    │   │ [ 7K3P-9QXA          ] [+]   │
│ 1–60 caracteres              │   │ ☐ Caminar                    │   │ Pendientes                   │
│                              │   │ ☐ Leer 20 minutos            │   │ 7K3P-9QXA  enviada  [Quitar] │
│                              │   │ [+ Crear un hábito nuevo]    │   │                              │
│                              │   │ Puedes no compartir ninguno  │   │ Tu código: H2M4-R8TN [Copiar]│
│              [Siguiente]     │   │              [Siguiente]     │   │ [Saltar]    [Crear grupo]    │
└──────────────────────────────┘   └──────────────────────────────┘   └──────────────────────────────┘
```

"Crear un hábito nuevo" abre el formulario actual de hábito y vuelve a este paso
con el hábito ya marcado. Invitar es opcional: se puede hacer después desde los
ajustes del grupo.

### Vista del grupo

```text
┌──────────────────────────────┐
│ ‹ Familia       [💬] [⚙]     │
│ Hoy: 1 de 2 al día           │
│ ┌──────────────────────────┐ │
│ │ Alex (tú)                │ │
│ │ Meditar  ✓ hoy  racha 5  │ │
│ │ ▪▪▪▫▪▪▪  últimos 7 días  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Sam · dueño              │ │
│ │ Caminar  ✗ hoy  racha 0  │ │
│ │ ▪▫▪▪▫▫▫                  │ │
│ │ Leer     ✓ hoy  racha 12 │ │
│ │ ▪▪▪▪▪▪▪                  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Ana                      │ │
│ │ Aún no comparte hábitos  │ │
│ └──────────────────────────┘ │
│ [Gestionar mis hábitos]      │
└──────────────────────────────┘
```

- "Al día" = completó hoy todos sus hábitos compartidos; quien no comparte
  ninguno no cuenta en ese total.
- "Hoy" de cada tarjeta es el día local de esa persona; la tarjeta propia
  permite marcar el check-in igual que en Hoy (misma acción y misma dedupe).
- Los 7 días tienen alternativa textual ("5 de 7 días") como las gráficas
  actuales; ✓/✗ siempre van con texto, nunca solo color.

### Ajustes del grupo

```text
┌──────────────────────────────┐
│ ‹ Ajustes de Familia         │
│ Nombre  [ Familia        ]   │  ← solo dueño
│ Miembros (4/10)              │
│ Alex (tú) · dueño            │
│ Sam                 [⋯]      │  ← Expulsar · Hacer dueño
│ Ana                 [⋯]      │
│ Invitaciones pendientes      │
│ 7K3P-9QXA  caduca en 5d [×]  │
│ [Invitar con código]         │
│                              │
│ [Salir del grupo]            │  ← dueño: pide transferir antes
│ [Borrar grupo]               │  ← solo dueño, confirma con el nombre
└──────────────────────────────┘
```

### Chat del grupo (C5)

```text
┌──────────────────────────────┐
│ ‹ Familia · Chat             │
│        [Cargar anteriores]   │
│ Sam  09:12                   │
│ ¡Hoy toca caminar! 🚶        │
│                 Alex  09:30  │
│              Hecho, 5 días 💪│
│ Antiguo miembro  ayer        │
│ Ánimo a todos                │
├──────────────────────────────┤
│ [ Escribe un mensaje…  ] [➤] │
│ 0/1000                       │
└──────────────────────────────┘
```

Mantener pulsado (o `⋯` en escritorio) un mensaje propio ofrece "Borrar". Sin
conexión, el campo se deshabilita con el aviso persistente habitual; nunca se
muestra un mensaje como enviado antes de confirmarlo el servidor (ADR 0001).

## Escritorio

Mismo armazón que el resto de la app, con "Grupos" en la barra lateral.

```text
┌──────────────────┬───────────────────────────────┬──────────────────────┐
│ Habit Tracker    │ Familia              [⚙]      │ Chat                 │
│ ○ Hoy            │ Hoy: 1 de 2 al día            │ Sam: ¡Hoy toca…!     │
│ ○ Hábitos        │ ┌─────────┐ ┌─────────┐       │ Alex: Hecho, 5 días  │
│ ○ Calendario     │ │ Alex    │ │ Sam     │       │                      │
│ ○ Estadísticas   │ │ Meditar │ │ Caminar │       │                      │
│ ● Grupos (1)     │ │ ✓ · 5   │ │ ✗ · 0   │       │                      │
│ ○ Ajustes        │ └─────────┘ └─────────┘       │ [ Mensaje…     ] [➤] │
└──────────────────┴───────────────────────────────┴──────────────────────┘
```

Bajo 1024 px el chat pasa a su propia ruta, como en móvil.

## Estados

- **Vacío:** sin grupos → explicación de una línea y "Crear grupo"; grupo sin
  más miembros → invitar con código.
- **Código no válido / límite alcanzado:** error junto al campo, con el motivo
  ("Este grupo ya tiene 10 miembros", "Has enviado 20 invitaciones hoy").
- **Invitación caducada o cancelada:** desaparece de la bandeja; abrirla desde
  un aviso viejo muestra "Esta invitación ya no está disponible".
- **Expulsado o grupo borrado:** al revalidar, el grupo desaparece y se muestra
  "Ya no formas parte de «Familia»" una sola vez.
- **Carga, error y sin conexión:** los mismos patrones de `WIREFRAMES.md`.
