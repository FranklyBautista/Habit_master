# Sistema visual inicial

Este sistema es deliberadamente pequeño. Sus valores se convertirán en tokens
durante la fase de diseño responsive.

## Personalidad

La interfaz debe sentirse tranquila, clara y alentadora. El progreso se presenta
como información, no como castigo: no se usan mensajes de culpa, fuego perdido ni
colores de error para un día incompleto.

## Color

| Rol | Valor | Uso |
|---|---:|---|
| Fondo | `#F8FAFC` | Fondo general claro |
| Superficie | `#FFFFFF` | Tarjetas, navegación y diálogos |
| Texto principal | `#0F172A` | Títulos y contenido |
| Texto secundario | `#475569` | Ayuda y metadatos |
| Borde | `#CBD5E1` | Separadores y controles |
| Primario | `#047857` | Acciones y selección |
| Primario suave | `#D1FAE5` | Fondos seleccionados |
| Información | `#0369A1` | Avisos neutrales |
| Advertencia | `#A16207` | Estado que requiere atención |
| Error | `#B91C1C` | Fallos, nunca incumplimiento |

Cada hábito puede elegir uno de seis colores: esmeralda, azul, violeta, naranja,
rosa o turquesa. El nombre, icono o patrón acompaña siempre al color. El modo
oscuro queda fuera del MVP.

## Tipografía

- Familia: Geist Sans, ya optimizada mediante `next/font` en la web.
- Monoespaciada: Geist Mono solo para datos técnicos, nunca para texto corriente.
- Escala: 12, 14, 16, 20, 24 y 32 px.
- Texto base: 16 px, interlineado aproximado de 1.5.
- Pesos: 400 para cuerpo, 500 para controles y 600–700 para títulos o métricas.

## Iconos

Se usará un conjunto coherente de iconos lineales (Lucide cuando comience la
implementación), con trazo de 2 px. Navegación y acciones críticas llevan etiqueta
visible; los iconos aislados incluyen nombre accesible y tooltip en escritorio.

Mapa inicial:

| Concepto | Icono |
|---|---|
| Hoy | círculo con check |
| Hábitos | lista con checks |
| Calendario | calendario |
| Estadísticas | gráfica de barras |
| Ajustes | engranaje |
| Archivar/restaurar | caja con flecha |

## Espacio y forma

- Unidad base: 4 px; separación habitual: 8, 12, 16, 24 y 32 px.
- Radio: 8 px en controles y 12 px en tarjetas/diálogos.
- Área táctil mínima: 44 × 44 px.
- Anillo de foco: 2 px visible con separación de 2 px.
- Sombras discretas; los bordes deben conservar la jerarquía sin depender de ellas.

## Progreso y estados

| Estado | Representación |
|---|---|
| Sin hábitos esperados | “Sin hábitos para este día”; no se muestra 0 % |
| 0 % | Barra vacía y texto `0 de N` |
| Parcial | Barra proporcional y texto `X de N · Y %` |
| Completo | Barra llena, check y texto `N de N · 100 %` |
| Cargando | Skeleton sin porcentaje ficticio |
| Error | Mensaje accionable y botón Reintentar |
| Sin conexión | Banda informativa con estado de sincronización |

Las animaciones respetarán `prefers-reduced-motion`, durarán cerca de 150–250 ms
y solo reforzarán un cambio ya comprensible sin movimiento.
