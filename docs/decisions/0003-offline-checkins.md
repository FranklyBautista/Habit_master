# ADR 0003 — Check-ins sin conexión en la app móvil

## Estado

Aceptada el 23 de octubre de 2026. Sustituye en parte al ADR 0001 **solo en la app
móvil y solo para marcar y desmarcar hábitos**. Todo lo demás (crear, editar,
archivar, reordenar, ajustes, grupos y toda la web) sigue siendo online-first:
servidor primero y re-consulta del estado completo.

## Contexto

La app móvil se usa en sitios sin cobertura (metro, viajes, gimnasio). Con el ADR
0001, marcar un hábito sin red fallaba, y abrir la app sin conexión mostraba una
pantalla de error. Marcar es la acción más frecuente y la más fácil de sincronizar:
cada check-in se identifica por `(habit_id, checkin_date)` y marcar ya es
idempotente.

## Decisión

### 1. Caché del último estado confirmado

- Después de cada `getState()` correcto, el móvil guarda el estado en el dispositivo
  cifrado con `LargeSecureStore` (la misma técnica que la sesión), porque contiene
  los nombres de los hábitos.
- Al leerlo se valida con `habitTrackerStateSchema`. Si no es válido, se descarta.
- Si la carga inicial falla y hay caché, la app abre con ella en vez de mostrar la
  pantalla de error.
- Se borra al cerrar sesión.

### 2. Cola local de check-ins

- Sin conexión, o si la escritura falla por un error de red, el cambio se guarda en
  una cola persistida en AsyncStorage (solo IDs y fechas) y se muestra al momento.
- La cola guarda **un único estado final por `(hábito, fecha)`**. Si un cambio
  devuelve el check-in al estado del servidor, se elimina de la cola.
- La fecha se fija al pulsar, en la zona horaria del perfil. Un cambio hecho a las
  23:59 cuenta para ese día aunque se sincronice al día siguiente.

### 3. Sincronización

- Al recuperar la conexión, al volver la app a primer plano y al montar el store,
  la cola se envía en un solo lote al RPC `sync_offline_checkins` y después se
  re-consulta el estado.
- **Política de conflictos:** gana el último cambio que llega al servidor. Si se
  marca sin conexión en el móvil y se desmarca ese mismo día en la web, el
  resultado depende de cuál se sincroniza después. Para un uso personal se acepta.
- Si el envío falla por red, la cola se conserva y se reintenta en la siguiente
  ocasión.

### 4. RPC `sync_offline_checkins` y ventana de 7 días

- La RLS de `habit_checkins` solo acepta ayer–mañana (UTC). Un `security definer`
  amplía esa ventana solo para los lotes sin conexión: hasta **7 días atrás en la
  zona del usuario**. En UTC, `hoy - 8` a `hoy + 1`, igual que la RLS amplía un día
  para cubrir las zonas por detrás y por delante de UTC.
- El RPC fuerza `user_id = auth.uid()` y comprueba que cada hábito sea del usuario.
- Las operaciones inválidas (fecha fuera de la ventana, hábito ajeno o borrado) se
  **omiten** sin abortar el lote. El RPC devuelve `{ applied, rejected }` y la app
  avisa de cuántas marcas no se pudieron guardar.

## Consecuencias

- Marcar sin conexión es inmediato y no se pierde aunque se cierre la app.
- El snapshot del móvil puede mostrar check-ins aún no confirmados. El banner indica
  cuántos cambios hay pendientes.
- Las marcas de más de 7 días sin conexión se descartan con aviso.
- Las demás mutaciones se bloquean sin conexión con un mensaje claro, en vez de
  fallar al enviarse.
- La web no cambia.
