# Sistema visual

Web y móvil comparten la misma dirección visual: superficies casi negras con un
acento lima en oscuro, y un gris cálido con acento oliva en claro. La fuente de
verdad de la paleta es `apps/mobile/src/constants/theme.ts`; la web la replica
como variables CSS en `apps/web/src/app/globals.css` (no hay paquete de tokens
compartido, por decisión). Ambas siguen el modo del sistema
(`prefers-color-scheme` en la web).

## Personalidad

La interfaz debe sentirse tranquila, clara y alentadora. El progreso se presenta
como información, no como castigo: no se usan mensajes de culpa, fuego perdido ni
colores de error para un día incompleto.

## Color

| Token web | Móvil | Claro | Oscuro | Uso |
|---|---|---:|---:|---|
| `--background` | `background` | `#F2F3EF` | `#0B0B0C` | Fondo de página |
| `--surface` | `backgroundElement` | `#FFFFFF` | `#161618` | Tarjetas, diálogos, filas |
| `--surface-selected` | `backgroundSelected` | `#E7E9E2` | `#222225` | Campos, botón secundario, pistas |
| `--foreground` | `text` | `#121214` | `#F5F5F7` | Texto principal |
| `--muted` | `textSecondary` | `#5D6068` | `#9C9CA4` | Texto secundario y rótulos |
| `--border-soft` | `border` | `#E1E3DC` | `#26262A` | Bordes de tarjetas |
| `--tint` | `tint` | `#44700D` | `#C6F432` | Acento para texto e iconos |
| `--accent` | `accent` | `#C6F432` | `#C6F432` | Relleno: botones, chips, celdas, check |
| `--on-accent` | `onAccent` | `#121214` | `#0B0B0C` | Texto sobre `--accent` |
| `--accent-soft` | `accentSoft` | lima 16 % | lima 14 % | Fondos seleccionados, pestaña activa |
| `--inverse` / `--on-inverse` | `inverse` / `onInverse` | `#121214` / `#F5F5F7` | `#F5F5F7` / `#0B0B0C` | Toasts |
| `--error` | `danger` | `#B91C1C` | `#F87171` | Fallos, nunca incumplimiento |

Reglas de contraste (WCAG AA, comprobadas en ambos modos):

- `--tint` es el acento para **texto e iconos**; `--accent` es el **relleno** y
  siempre lleva `--on-accent` encima, nunca blanco. El lima sobre blanco no se
  lee: en claro el tint es oliva.
- El tint claro de la web (`#44700D`) es algo más oscuro que el de móvil
  (`#4D7C0F`): ese pasa 4,99:1 sobre blanco pero se queda en 4,48:1 sobre el
  fondo de página y por debajo sobre `--accent-soft`. `#44700D` da 5,28:1 y
  4,81:1.
- El error claro se mantiene en `#B91C1C` (el `#DC2626` de móvil da 4,33:1 sobre
  el fondo). En oscuro el botón de peligro usa `--on-error` oscuro.
- Los seis colores de hábito (tonos 600–700) llevan icono blanco en ambos modos.

Cada hábito elige uno de seis colores; el nombre o el icono acompañan siempre al
color. El color del hábito se usa en la pastilla de su icono y en las barras de
la comparación por hábito; el progreso general usa el acento.

## Tipografía

- Familia: Geist Sans (`next/font`) en la web; la del sistema en móvil.
- Jerarquía (la de `ThemedText`): título 28–34 px / 800 con tracking negativo;
  subtítulo 19–22 px / 700; cuerpo 15–16 px; secundario 14 px / 500 en
  `--muted`; rótulos 14 px / 600 en `--muted`, con mayúscula inicial (en la
  web ya no van en mayúsculas sostenidas). Un rótulo sobre un título solo se
  pone si aporta contexto que el título no da (el mes, el periodo, el paso).
- Cifras grandes (porcentajes, rachas) en 22–34 px / 800.
- Geist Mono solo para el código de usuario.

## Forma y espacio

- Radios: `--rounded-sm` 12 px (pastillas de icono, celdas), `--rounded-md`
  16 px (campos, toasts, tira semanal), `--rounded-lg` 24 px (tarjetas,
  diálogos), `--rounded-pill` (botones, chips, pestañas).
- Tarjetas con borde fino (`--border-soft`) sobre el fondo; sombras casi nulas
  en claro y ninguna en oscuro.
- Unidad base 4 px; separaciones habituales 8, 16, 24 y 32 px.
- Área táctil mínima 44 × 44 px; botones de 48 px de alto.
- Anillo de foco de 2 px en `--focus` (= `--tint`).

## Componentes

- **Botón** (`ui/button.tsx`): píldora; primario en `--accent` con `--on-accent`,
  secundario sobre `--surface-selected`, fantasma transparente.
- **Campo**: relleno `--surface-selected`, radio 16 px, borde `--tint` al enfocar.
- **Navegación**: barra lateral en escritorio y barra inferior en el teléfono;
  la pestaña activa pone el icono sobre una píldora `--accent-soft` y el texto
  en `--tint` (no solo cambia el color).
- **Fila de hábito** (`ui/checkbox.tsx`): tarjeta con la pastilla del icono del
  color del hábito, nombre y descripción, y un check redondo a la derecha que se
  rellena de acento; la fila marcada lleva borde `--tint`.
- **Anillo de progreso** (`ui/progress-ring.tsx`): pista `--surface-selected`,
  arco `--accent` con extremos redondeados desde las 12. Sin hábitos previstos
  queda vacío (sin 0 % ficticio).
- **Tira semanal** (`week-strip.tsx`): lunes a domingo, un punto por día —
  acento si se completó todo, color del texto si fue parcial, apagado si fue
  0 %, sin punto si no había hábitos o es futuro; hoy con borde `--tint`.
- **Chips** (ámbito del calendario): píldoras; la activa en `--accent`.
- **Diálogo**: radio 24 px; en el teléfono sube desde abajo como hoja.
- **Toast**: colores invertidos (`--inverse`), para destacar sobre cualquier
  superficie.
- **Calendario**: celdas con el acento al 23 %, 60 % y 100 % según el
  cumplimiento (texto `--on-accent` en las dos más intensas); hoy con borde
  `--tint` y el día elegido con borde del color del texto. Los días futuros
  van sin relleno y con la cifra en `--muted`: no cuentan como 0 %.
- **Gráficas** (Recharts): ejes y rejilla con `--muted`/`--border-soft`,
  tendencia en `--tint` con relleno de `--accent`, barras con el color de cada
  hábito; los colores son variables CSS, así que siguen el modo del sistema.

## Iconos

Lucide (`lucide-react` en web, `lucide-react-native` en móvil), trazo de 2 px
(2,4 en la pestaña activa). La marca y la pestaña Hoy usan `Sparkles`.
Navegación y acciones críticas llevan etiqueta visible o nombre accesible.

| Concepto | Icono |
|---|---|
| Hoy / marca | Sparkles |
| Hábitos | ListChecks |
| Calendario | CalendarDays |
| Estadísticas | BarChart3 |
| Grupos | Users |
| Ajustes | Settings |

## Progreso y estados

| Estado | Representación |
|---|---|
| Sin hábitos esperados | “Sin hábitos para este día”; anillo vacío, sin 0 % |
| Parcial | Anillo proporcional, `X/N` y “Te faltan…” |
| Completo | Anillo lleno y “¡Todo listo!” |
| Cargando | Skeleton sin porcentaje ficticio |
| Error | Mensaje accionable y botón Reintentar |
| Sin conexión | Página informativa con el estado |

Las animaciones respetan `prefers-reduced-motion`, duran 150–250 ms y solo
refuerzan un cambio ya comprensible sin movimiento.
