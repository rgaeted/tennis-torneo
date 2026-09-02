# Programación automática de horarios

Fecha: 2026-09-01  
Estado: listo para plan de implementación (pendiente revisión del usuario)

## Problema

Hoy `POST /api/admin/partidos/programar-automatico` reparte cancha y hora al azar, solo a partidos que ya tienen ambos jugadores. Las rondas siguientes quedan sin horario hasta que existan rivales. Eso obliga a programar el torneo por partes.

Se necesita **armar todo el calendario de una vez al inicio**: todas las categorías, todas las rondas, incluyendo partidos que todavía no tienen jugadores. El slot queda reservado. Cargar un resultado no vuelve a programar ni mueve horarios.

## Decisiones

| Tema | Decisión |
|---|---|
| Algoritmo | Encaje al hueco más temprano (greedy earliest-fit). Sin solver. |
| Alcance de un clic | **Todo el torneo**: todos los cuadros, todas las rondas. No por categoría ni por ronda. |
| Cuándo | Acción inicial de setup. Se confirma en un modal; no corre sola al generar el cuadro (hay que revisar fechas). |
| Rondas sin jugadores | Se reserva slot igual. |
| Reprogramar al avanzar | No. El horario de cuartos/semis/final ya quedó en el primer pase. |
| Orden entre categorías | Sin orden fijo. Se llena el primer hueco válido; las categorías se intercalan. |
| Dependencia en un cuadro | El partido de ronda siguiente / posición `P` depende de los de la ronda anterior en `2P` y `2P+1` (igual que el generador actual). |
| Descanso | El siguiente no puede empezar antes de 180 min después del inicio del último previo real (90 de juego + 90 de descanso). Un bye no cuenta como previo. |
| Fechas | Modal precargado con `torneo.fecha_inicio` y `torneo.fecha_fin`; el usuario puede editarlas. |
| Slots | 09:00–22:00, duración 90 min, canchas = `club.num_canchas`. Offset Chile: UTC−4 may–ago, UTC−3 el resto (igual que hoy). |
| Jugador en dos categorías | Si ambos jugadores del partido ya se conocen, no se asigna un slot donde alguno ya juega. En rondas sin jugadores no hay conflicto de persona, solo de cancha y de dependencia. |
| Partidos que no se tocan | Ya jugados (`ganador_id` de un partido real, o `ended_at`), en curso (`started_at` sin `ended_at`), o bye (no ocupan cancha). Esos horarios, si existen, siguen ocupando la cancha para no pisarlos. |
| Partidos que sí se asignan | Pendientes de jugar o de reservar, incluyendo rondas vacías. Se **reemplazan** sus `hora_inicio` y `cancha`. |
| UI | Botón en lista de partidos **y** en la página de cuadros (admin y organizador). Un clic programa el torneo entero, aunque se esté viendo una sola categoría. |
| Programación manual | El modal por partido se mantiene para ajustes puntuales. |

## Algoritmo

Función pura, sin I/O:

```
asignarHorarios({ slots, partidos, ocupados })
```

**Slots:** todos los pares `(hora_inicio ISO, cancha)` del rango, en orden cronológico (cancha 1…N en el mismo minuto). No se barajan.

**Partidos de entrada:** todos los del torneo, con `id`, `cuadro_id`, `ronda`, `posicion`, `jugador1_id`, `jugador2_id`, `ganador_id`, `started_at`, `ended_at`, `hora_inicio`, `cancha`.

**Clasificación** (un partido con ambos `jugador*_id` null en ronda posterior **no** es bye: es reserva):

- `bye` (no ocupa cancha): primera ronda de ese cuadro con menos de 2 jugadores, **o** ya tiene `ganador_id` y nunca se jugó (`started_at` null) — avance automático. Tampoco cuenta como previo real.
- `fijo`: en curso o ya jugado en cancha (`started_at` o `ended_at`, o `ganador_id` con partido realmente disputado). No se reasigna. Si tiene horario, ese slot queda ocupado.
- `asignable`: el resto, **incluyendo** cuartos/semis/final todavía sin nombres.

**Previo real de un partido:** los dos feeders (`ronda` anterior, `posicion` `2P` y `2P+1`) que no son bye. Si el feeder es asignable o fijo, su `hora_inicio` (asignada o existente) es la cota.

**Orden de asignación:** orden topológico por feeders (rondas tempranas primero; entre cuadros, cualquier orden estable, p. ej. categoría luego `posicion`). Así, al asignar un partido, sus previos ya tienen hora o son bye.

**Para cada asignable:** el primer slot tal que

1. no está en `ocupados` ni ya entregado a otro asignable,
2. `slot.hora_inicio >= max(inicio de previos reales) + 180 minutos`,
3. si `jugador1_id` y/o `jugador2_id` existen, ninguno coincide con otro partido (fijo o ya asignado) en el mismo `hora_inicio`.

Si algún asignable no cabe: fallo global, no se guarda nada. Mensaje: no hay suficientes slots / ampliar fechas o canchas. Incluir cuántos partidos faltaron si es fácil.

**Éxito:** mapa `partidoId → { hora_inicio, cancha }`. La API hace update solo de esos ids.

## API

`POST /api/admin/partidos/programar-automatico`

Body (sin cambio de contrato): `{ torneoId, fechaInicio, fechaFin }`.

1. `requireTorneoAccess(torneoId)`.
2. Cargar `club.num_canchas`, todos los cuadros del torneo, todos sus partidos.
3. Generar slots del rango.
4. Llamar `asignarHorarios`.
5. Si falla: `422` y ningún update.
6. Si ok: update `hora_inicio` y `cancha` de los asignables. Respuesta `{ ok: true, programados: n }`.

No hay endpoint por categoría. El botón de cuadros manda el mismo `torneoId`.

## UI

Extraer el modal actual a `components/admin/ProgramarAutomaticoModal.tsx`.

Props: `torneoId`, `fechaInicioDefault`, `fechaFinDefault`, `numCanchas`, `onClose`, `onSuccess`.

Copy (español): deja de decir “al azar”. Explica que se reserva **todo el cuadro del torneo** (todas las categorías y rondas) en un solo paso, se mezclan categorías para no dejar canchas vacías, y hay un slot de descanso entre un partido y el siguiente del mismo cuadro. Advierte que se reemplazan horarios de partidos pendientes.

**Lista de partidos** (`PartidosAdmin`): el botón se muestra si hay al menos un partido asignable (no solo “con ambos jugadores”). Precarga fechas del torneo: hay que pasar `fechaInicio` / `fechaFin` del server a este componente.

**Cuadros** (`app/admin/torneo/[id]/cuadros/page.tsx`, reexportada en organizador): el mismo botón junto a generar/cerrar, visible cuando el torneo tiene al menos un cuadro (aunque la categoría actual no tenga). Tras éxito, recargar el cuadro para ver hora/cancha en cada cruce, también los TBD.

El modal manual `ProgramarModal` no cambia.

## Datos

Sin migración. Se siguen usando `partido.hora_inicio` y `partido.cancha`. No hay flag de “reservado vs confirmado”: un TBD con hora es una reserva.

## Errores

| Caso | Comportamiento |
|---|---|
| Sin acceso | 403, igual que hoy |
| Faltan fechas o torneo | 400 |
| Sin cuadros o sin asignables | `{ ok: true, programados: 0 }` y aviso en el modal |
| No caben | 422, nada persistido |
| Partido individual se edita después | Permitido; no relanza el automático |

## Pruebas (Vitest)

Archivo: `lib/scheduling/autoSchedule.test.ts`. Estilo de `lib/bracket/generator.test.ts`. Sin React Testing Library.

Casos mínimos:

1. Un cuadro de 8 (cuartos → semis → final): los cuartos ocupan los primeros slots; cada semi empieza ≥ 180 min después del último de sus dos cuartos; la final respeta el mismo margen respecto de las semis.
2. Bye en primera ronda: ese cruce no ocupa cancha; el siguiente solo espera al previo real.
3. Dos categorías: un slot no queda vacío si hay un partido de la otra categoría que ya puede jugarse.
4. Mismo jugador en dos partidos asignables a la misma hora: el segundo toma otro slot.
5. Rango de un día demasiado corto para el descanso de la final: la función falla y no devuelve asignación parcial.
6. Un partido fijo (ya jugado) en un slot: ese slot no se reutiliza; el fijo no se reasigna.

## Archivos

| Archivo | Cambio |
|---|---|
| `lib/scheduling/autoSchedule.ts` | Slots + `asignarHorarios` (puro) |
| `lib/scheduling/autoSchedule.test.ts` | Tests de la tabla de arriba |
| `app/api/admin/partidos/programar-automatico/route.ts` | Deja de barajar; usa la función pura |
| `components/admin/ProgramarAutomaticoModal.tsx` | Modal compartido, fechas default, copy nuevo |
| `app/admin/torneo/[id]/partidos/PartidosAdmin.tsx` | Usa el modal; recibe fechas del torneo; cuenta asignables |
| `app/admin/torneo/[id]/partidos/page.tsx` | Pasa `fecha_inicio` / `fecha_fin` |
| `app/organizador/torneo/[id]/partidos/page.tsx` | Igual |
| `app/admin/torneo/[id]/cuadros/page.tsx` | Botón + modal; carga fechas del torneo; programa el torneo entero |

## Fuera de alcance

- Recalcular horarios al cargar un resultado.
- Endpoint o botón “solo esta categoría”.
- Cambiar duración, hora de apertura/cierre, o huso por club.
- Solver / backtracking si el greedy no cabe (solo error 422).
- Programar amistosos.
- Migración de base de datos.

## Cómo se verifica

1. Tests Vitest del módulo puro en verde.
2. En un torneo con varios cuadros, abrir Cuadros → Programar automáticamente → fechas precargadas → confirmar.
3. Primera ronda con hora/cancha; cuartos/semis/final también, aunque digan TBD.
4. Misma acción desde la lista de partidos produce el mismo tipo de resultado (todo el torneo).
5. Un partido ya jugado no cambia de horario.
6. Ajuste manual de un partido sigue funcionando.
7. Rango de un solo día en un cuadro grande muestra 422 y no borra horarios previos.
