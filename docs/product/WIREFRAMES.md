# Wireframes de baja fidelidad

Estos diagramas describen jerarquía y navegación, no medidas finales ni estilo
visual. `●` indica la sección activa y `○` las demás.

## Móvil

### Hoy

```text
┌──────────────────────────────┐
│ Hoy              dom, 30 ago│
│ Buenos días, Alex            │
│ ┌──────────────────────────┐ │
│ │ 3 de 4        75 %       │ │
│ │ ███████████████░░░░      │ │
│ └──────────────────────────┘ │
│ Hábitos de hoy                │
│ ┌──────────────────────────┐ │
│ │ ☑ Meditar                │ │
│ │ ☑ Leer 20 minutos       │ │
│ │ ☐ Caminar               │ │
│ │ ☑ Preparar el día       │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ ●Hoy ○Hábitos ○Cal. ○Est. ○Aj│
└──────────────────────────────┘
```

### Hábitos

```text
┌──────────────────────────────┐
│ Hábitos            [+ Crear] │
│ Activos (4)                  │
│ ≡ Meditar             [⋯]    │
│ ≡ Leer 20 minutos     [⋯]    │
│ ≡ Caminar             [⋯]    │
│ ≡ Preparar el día     [⋯]    │
│                              │
│ Archivados (1)          [›]  │
├──────────────────────────────┤
│ ○Hoy ●Hábitos ○Cal. ○Est. ○Aj│
└──────────────────────────────┘
```

El botón de opciones abre Editar o Archivar. Crear y Editar comparten un diálogo
o pantalla con nombre, descripción, color e icono.

### Calendario

```text
┌──────────────────────────────┐
│ Calendario                   │
│ [General ▾]   [‹] Agosto [›] │
│ Lu Ma Mi Ju Vi Sá Do         │
│                 1  2         │
│  3  4  5  6  7  8  9        │
│ 10 11 12 13 14 15 16        │
│ 17 18 19 20 21 22 23        │
│ 24 25 26 27 28 29 [30]      │
│ 31                           │
│ □ Sin datos ░ 0 % ▒ Parcial │
│ ■ 100 %                     │
├──────────────────────────────┤
│ ○Hoy ○Hábitos ●Cal. ○Est. ○Aj│
└──────────────────────────────┘
```

### Estadísticas

```text
┌──────────────────────────────┐
│ Estadísticas                 │
│ [7 días] [30 días] [90 días]│
│ ┌────────┐ ┌───────────────┐ │
│ │ 78 %   │ │ Racha actual  │ │
│ │Cumplim.│ │    4 días     │ │
│ └────────┘ └───────────────┘ │
│ Tendencia                    │
│ ┌──────────────────────────┐ │
│ │      ╭─╮    ╭────        │ │
│ │ ──╮ ╭╯ ╰────╯            │ │
│ └──────────────────────────┘ │
│ Resumen textual              │
├──────────────────────────────┤
│ ○Hoy ○Hábitos ○Cal. ●Est. ○Aj│
└──────────────────────────────┘
```

### Ajustes

```text
┌──────────────────────────────┐
│ Ajustes                      │
│ Cuenta                       │
│ alex@example.com             │
│                              │
│ Preferencias regionales      │
│ Idioma              Español  │
│ Zona horaria   America/Los…  │
│ La semana inicia      Lunes  │
│                              │
│ [ Cerrar sesión ]            │
├──────────────────────────────┤
│ ○Hoy ○Hábitos ○Cal. ○Est. ●Aj│
└──────────────────────────────┘
```

## Escritorio

Las cinco pantallas usan el mismo armazón; cambia únicamente el panel principal.

```text
┌──────────────────┬─────────────────────────────────────────────────┐
│ Habit Tracker    │ Título                              Acción       │
│                  │                                                 │
│ ● Hoy            │ ┌─────────────────────┐ ┌─────────────────────┐ │
│ ○ Hábitos        │ │ Resumen / filtros   │ │ Métrica secundaria  │ │
│ ○ Calendario     │ └─────────────────────┘ └─────────────────────┘ │
│ ○ Estadísticas   │                                                 │
│ ○ Ajustes        │ ┌─────────────────────────────────────────────┐ │
│                  │ │ Contenido principal de la vista             │ │
│                  │ │                                             │ │
│                  │ └─────────────────────────────────────────────┘ │
│                  │                                                 │
│ Alex             │ Estado/ayuda contextual                         │
└──────────────────┴─────────────────────────────────────────────────┘
```

- **Hoy:** resumen y lista ocupan el panel principal.
- **Hábitos:** activos a la izquierda; archivados o formulario en panel auxiliar.
- **Calendario:** mes amplio a la izquierda; leyenda y resumen del día a la derecha.
- **Estadísticas:** métricas arriba, gráfica y tabla/resumen textual debajo.
- **Ajustes:** formulario estrecho alineado a la izquierda para conservar legibilidad.

## Estados comunes

- **Vacío:** explicación breve, una acción principal y sin ilustraciones necesarias.
- **Carga:** estructura skeleton que conserva el espacio del contenido.
- **Error:** mensaje concreto, acción “Reintentar” y datos existentes sin ocultar.
- **Sin conexión:** aviso persistente no bloqueante; nunca simula sincronización.
- **Éxito:** cambio visible en contexto; toast solo cuando el resultado no sea evidente.
