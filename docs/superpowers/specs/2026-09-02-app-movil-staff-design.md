# App móvil staff — live + resultados + pasador Bluetooth

Fecha: 2026-09-02  
Estado: pendiente revisión del usuario

## Problema

En cancha el staff necesita el celular, no el admin web. Hoy el control en vivo vive en `/live/[partidoId]/control`: sirve en el browser, pero no hay app instalable, el organizador no puede pegarle a las APIs de live, y elegir partido entre muchos es lento. El pasador Bluetooth (AB Shutter3 / mando selfie) ya existe en la web; en Safari de iPhone es frágil.

Se necesita una **app nativa (Expo)** para staff: entrar, elegir torneo/partido (lista o QR), pasar puntos en vivo, confirmar resultado, y configurar el pasador Bluetooth en el teléfono.

## Decisiones

| Tema | Decisión |
|---|---|
| Quién entra | `admin`, `organizador` (solo sus torneos), `turno` |
| Plataformas | iOS y Android desde el día uno (mismo código Expo) |
| Stores v1 | Builds internos (APK + TestFlight / simulador). Publicar en Play/App Store es posterior, no bloquea v1 |
| Qué hace | Live (puntos/juegos/sets) **y** confirmar resultado al terminar |
| Cómo elige partido | Lista de torneos → partidos **y** atajo QR |
| Auth | Misma cuenta MisTorneos (email/password, Supabase) |
| Lógica de tenis / BYE | Sigue en el server. La app no reimplementa avance de cuadro |
| Pasador Bluetooth | En v1. Configuración persistente en el dispositivo, 2 ranuras (J1 / J2) |
| Jugador del partido | Sigue controlando desde la **web**. La app nativa v1 es solo staff |

## Fuera de v1

- Publicación en Play Store / App Store
- Bluetooth más allá de 2 clickers HID (+ BLE opcional)
- Cola offline / sync diferido
- Push notifications
- Subir foto de partido desde la app
- Perfil `jugador` usando esta app

## Roles y acceso

Un usuario es **staff de un partido** si:

1. `jugador.rol === "admin"`, o
2. `jugador.rol === "turno"`, o
3. `jugador.rol === "organizador"` **y** el torneo del partido tiene `organizacion_id` igual al `organizacion_id` del organizador.

Cualquier otro rol (incluido `jugador`) recibe 403 en las APIs móviles y un mensaje en login/home: “Esta app es solo para staff”.

Hoy `/api/live/score` y `/api/live/finalizar` permiten admin, turno **y** los dos jugadores del partido, pero **no** organizador. v1:

- Esas dos rutas aceptan también organizador del torneo (misma regla de arriba).
- El acceso de los jugadores del partido **se mantiene en web**.
- Las APIs `/api/mobile/*` son **solo staff** (sin jugadores).

Helper nuevo compartido, p.ej. `requireStaffPartidoAccess(partidoId)` y `requireStaffTorneoAccess(torneoId)`.

## Flujo de pantallas

```
Login
  → Torneos
       → Partidos (Hoy | En curso | Pendientes | Todos)
            → Control en vivo
                 → Confirmar resultado
  → QR (cámara) → Control en vivo
  → Ajustes → Pasador de puntos
```

### Login

- Email + password vía `supabase.auth.signInWithPassword`.
- Tras login: leer `jugador.rol`. Si no es `admin` | `organizador` | `turno`, mostrar error y no navegar a Torneos.
- Sesión persistida (refresh token de Supabase). Logout en Ajustes.

### Torneos

- `GET /api/mobile/torneos`
- Admin: torneos activos/relevantes (estado no `cancelado`; orden por fecha).
- Organizador: solo torneos de su `organizacion_id`.
- Turno: mismos torneos que admin (el rol turno opera cualquier cancha).
- Vacío: “No tienes torneos asignados”.

### Partidos

- `GET /api/mobile/torneos/[id]/partidos`
- Cada fila: categoría, ronda, J1 vs J2 (o BYE / código de llave), hora, cancha, estado (`pendiente` | `en_curso` | `terminado`).
- Filtros: Hoy (según `hora_inicio` en zona America/Santiago), En curso (`started_at` sin `ended_at` o con live sin `ganador_id`), Pendientes (sin `ganador_id`, ambos jugadores, no BYE), Todos.
- Partidos BYE (`ganador_id` sin haberse jugado / un solo jugador en primera ronda) **no** aparecen en Pendientes ni En curso. Pueden aparecer en Todos como “BYE”.
- Tap → Control. Icono QR en el header de esta pantalla.

### QR

- Payload canónico: URL `https://<dominio-prod>/live/{partidoId}`.
- Deep link de app: `mistorneos://partido/{partidoId}` (mismo UUID).
- Al escanear: extraer `partidoId`, `GET /api/mobile/partidos/[id]`. 404 / 403 → mensajes “Partido no encontrado” / “No autorizado”.
- Permiso de cámara; si lo niega, texto para abrirlo en Ajustes del sistema.

### Control en vivo

Misma semántica que `ControlPanel` web:

- `awardPoint` / `removePoint` / ajuste de games / tie-break (`lib/live/tennisScore`).
- Cada cambio: `POST /api/live/score` con `{ partidoId, resultado }`.
- Indicador “guardando…”. Si falla: toast y el estado local no se da por cerrado en server.
- Si `ganador_id` ya existe: solo lectura + “Modificar resultado” (usa `PATCH /api/admin/resultados` o el mismo contrato que admin web).
- Atajo a Pasador de puntos.

### Confirmar resultado

- Resumen de sets. Validación idéntica a `/api/live/finalizar` (sets válidos, TB coherente, no empate).
- Confirmación explícita (“¿Cerrar partido?”).
- `POST /api/live/finalizar`. Éxito → vuelve a Partidos; el ganador ya avanzó en el cuadro (server).

## Auth HTTP (web + app)

Las APIs actuales leen cookie de `@supabase/ssr`. La app nativa no tiene esa cookie.

**Contrato:** `createClient()` / gate de API acepta:

1. Cookie de sesión (web, sin cambio de UX), o
2. Header `Authorization: Bearer <access_token>` (móvil).

El Bearer se valida con el JWT de Supabase (`auth.getUser(token)` o cliente con el token). Un 401 limpia sesión en la app y vuelve a Login.

CORS: orígenes de Expo en desarrollo (`http://localhost:*`, Expo Go) y no aplica a requests nativos (el cliente RN no es un origen browser). No se abre CORS público innecesario; la app llama con fetch nativo.

## APIs móviles

Todas requieren usuario autenticado (cookie o Bearer) + staff.

### `GET /api/mobile/torneos`

Respuesta:

```json
{ "torneos": [{ "id": "uuid", "nombre": "…", "edicion": "…", "fecha_inicio": "…", "fecha_fin": "…", "estado": "…" }] }
```

### `GET /api/mobile/torneos/[id]/partidos`

403 si no es staff de ese torneo.

Cada partido incluye: `id`, `ronda`, `posicion`, `categoria`, `hora_inicio`, `cancha`, `started_at`, `ended_at`, `ganador_id`, `foto_url`, `jugador1`, `jugador2`, `resultado`.

### `GET /api/mobile/partidos/[id]`

Detalle para Control / QR. 403 si no es staff de su torneo.

`POST /api/live/score` y `POST /api/live/finalizar` se reutilizan (tras ampliar auth a organizador + Bearer).

## App Expo (`mobile/`)

- Expo SDK actual (React Native), TypeScript.
- Navegación: Expo Router — `login`, `torneos`, `torneos/[id]`, `partido/[id]`, `ajustes/pasador`, `qr`.
- Cliente: `@supabase/supabase-js` + `expo-secure-store` para la sesión.
- Cámara QR: `expo-camera` o `expo-barcode-scanner`.
- Deep link scheme: `mistorneos`.
- Config: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` (origen Vercel / local).

Estructura:

```
mobile/
  app/                 # Expo Router
  src/auth/
  src/api/             # fetch con Bearer
  src/live/            # copia o reexport de tennisScore + types
  src/bluetooth/       # HID + persistencia + BLE opcional
```

Las reglas de score (`awardPoint`, `isSetComplete`, …) se **copian o extraen** a un módulo usable desde RN (sin imports `@/` de Next). Tests unitarios del motor de tenis siguen en `lib/live/*.test.ts` del monorepo; la app no divergue la semántica.

## Pasador Bluetooth

### Hardware v1

Camino principal: mando selfie / presentador emparejado en el **Bluetooth del sistema** como teclado HID (AB Shutter3 y clones).  
Fallback: sensor BLE GATT (si el OS lo expone), mismo rol que `lib/live/bleButton.ts` en la web.

### Configuración

Pantalla **Ajustes → Pasador de puntos** (y atajo desde Control):

- Ranura J1 y ranura J2.
- “Conectar”: captura la siguiente tecla/evento de hardware y la asigna a esa ranura.
- iPhone: preset **AB Shutter3** (botón que la app recibe; documentar que el de volumen lo come iOS).
- “Desconectar” limpia la ranura.
- Bindings en **almacenamiento persistente del dispositivo** (SecureStore o AsyncStorage), no por partido. Al abrir otro partido, los mismos clickers siguen asignados a J1/J2 de *ese* encuentro (J1 = jugador1 del partido actual).

### En Control

- Listener global de teclas / volumen / obturador según el binding.
- Debounce 400 ms (igual que `lib/live/buttonBindings.ts`).
- Pulsación → `awardPoint` → `POST /api/live/score`.
- No se usa el clicker para confirmar cierre de partido (evita cierres accidentales).

### Permisos nativos

Android: Bluetooth (y BLE si se usa GATT).  
iOS: descripción de Bluetooth en Info.plist si hay GATT; HID de sistema no pide permiso extra de cámara.

## Errores

| Caso | UX |
|---|---|
| Credenciales malas | “Email o contraseña incorrectos” |
| Rol no staff | “Esta app es solo para staff” |
| Red caída al guardar punto | Toast; se puede reintentar el último cambio |
| Finalizar inválido | Mensaje del server (set / empate / ya cerrado) |
| QR ajeno / sin acceso | “No autorizado” o “Partido no encontrado” |
| Cámara / Bluetooth denegado | Instrucción para Ajustes del sistema |

## Pruebas

- Unit (repo web): helper staff (admin / organizador propio / organizador ajeno / turno / jugador).
- Unit: bindings HID debounce y asignación de tecla (extraer o espejo de `buttonBindings.test.ts`).
- Manual iPhone + Android: login staff, lista, QR, live, finalizar, organizador vs admin vs turno vs jugador bloqueado, dos clickers J1/J2, preset AB Shutter3 en iPhone.

## Orden de implementación sugerido

1. Helper staff + Bearer en APIs live existentes  
2. APIs `GET /api/mobile/*`  
3. Scaffold Expo `mobile/` + login + sesión  
4. Torneos y partidos  
5. Control + finalizar (reuso tennisScore)  
6. QR + deep link  
7. Pasador Bluetooth persistente  
8. Builds Android + iOS de prueba
