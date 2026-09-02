# App móvil staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Expo (iOS + Android) para staff (admin, organizador, turno): login, lista de torneos/partidos, QR, control en vivo, confirmar resultado y pasador Bluetooth persistente.

**Architecture:** La app nativa es UI + sesión Supabase. Next.js sigue siendo la fuente de verdad. APIs aceptan cookie (web) o `Authorization: Bearer`. Un helper puro decide si un perfil es staff de un torneo. Score y cierre reutilizan `/api/live/score` y `/api/live/finalizar` (abiertos a organizador). El motor `lib/live/tennisScore.ts` se importa desde Metro vía `watchFolders`.

**Tech Stack:** Next.js 16 API routes, Supabase Auth/JWT, Expo (dev client, no solo Expo Go), Expo Router, `expo-secure-store`, `expo-camera`, `react-native-volume-manager` + teclas nativas para HID.

## Global Constraints

- Staff de un partido: `admin`, `turno`, o `organizador` cuyo `organizacion_id` coincide con el del torneo.
- iOS y Android desde el primer código (mismo `mobile/`).
- Login: email/password de MisTorneos. Rol `jugador` no entra a la app.
- APIs: cookie **o** `Authorization: Bearer <access_token>`.
- Lógica de BYE y avance de cuadro solo en server (`avanzarGanadorConByes`).
- Pasador: 2 ranuras J1/J2, persistentes en el dispositivo, debounce 400 ms, hardware HID selfie / AB Shutter3.
- Builds internos v1 (dev client / APK / simulador). No publicar stores en este plan.
- PowerShell: separar comandos con `;` no `&&`. Commits: `git commit -m "mensaje"`.
- Tests Vitest en `lib/` con imports relativos (no `@/`).

---

### Task 1: Helper puro de staff

**Files:**
- Create: `lib/auth/staffAccess.ts`
- Test: `lib/auth/staffAccess.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `export type StaffJugador = { rol: string; organizacion_id: string | null }`; `export type StaffTorneo = { organizacion_id: string | null }`; `export function isStaffRol(rol: string | null | undefined): boolean`; `export function isStaffForTorneo(jugador: StaffJugador, torneo: StaffTorneo): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isStaffRol, isStaffForTorneo } from "./staffAccess";

describe("isStaffRol", () => {
  it("acepta admin organizador y turno", () => {
    expect(isStaffRol("admin")).toBe(true);
    expect(isStaffRol("organizador")).toBe(true);
    expect(isStaffRol("turno")).toBe(true);
  });
  it("rechaza jugador y vacio", () => {
    expect(isStaffRol("jugador")).toBe(false);
    expect(isStaffRol(null)).toBe(false);
  });
});

describe("isStaffForTorneo", () => {
  const torneoOrg = { organizacion_id: "org-1" };
  const torneoSinOrg = { organizacion_id: null };

  it("admin y turno entran a cualquier torneo", () => {
    expect(isStaffForTorneo({ rol: "admin", organizacion_id: null }, torneoOrg)).toBe(true);
    expect(isStaffForTorneo({ rol: "turno", organizacion_id: null }, torneoSinOrg)).toBe(true);
  });
  it("organizador solo si coincide organizacion_id", () => {
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-1" }, torneoOrg)).toBe(true);
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-2" }, torneoOrg)).toBe(false);
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-1" }, torneoSinOrg)).toBe(false);
  });
  it("jugador nunca", () => {
    expect(isStaffForTorneo({ rol: "jugador", organizacion_id: "org-1" }, torneoOrg)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/staffAccess.test.ts`

Expected: FAIL (módulo no existe)

- [ ] **Step 3: Write minimal implementation**

```ts
export type StaffJugador = { rol: string; organizacion_id: string | null };
export type StaffTorneo = { organizacion_id: string | null };

export function isStaffRol(rol: string | null | undefined): boolean {
  return rol === "admin" || rol === "organizador" || rol === "turno";
}

export function isStaffForTorneo(jugador: StaffJugador, torneo: StaffTorneo): boolean {
  if (jugador.rol === "admin" || jugador.rol === "turno") return true;
  if (
    jugador.rol === "organizador" &&
    jugador.organizacion_id &&
    torneo.organizacion_id &&
    jugador.organizacion_id === torneo.organizacion_id
  ) {
    return true;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/staffAccess.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth/staffAccess.ts lib/auth/staffAccess.test.ts
git commit -m "feat: helper isStaffForTorneo para acceso staff movil"
```

---

### Task 2: Bearer + gates de staff en server

**Files:**
- Create: `lib/supabase/requestUser.ts`
- Modify: `lib/supabase/orgAuth.ts` (añadir funciones al final; no romper `requireTorneoAccess`)

**Interfaces:**
- Consumes: `isStaffForTorneo`, `isStaffRol` from `lib/auth/staffAccess.ts`
- Produces: `export async function getRequestUser(request: Request): Promise<{ id: string } | null>`; `export async function requireStaffTorneoAccess(request: Request, torneoId: string): Promise<{ id: string } | null>`; `export async function requireStaffPartidoAccess(request: Request, partidoId: string): Promise<{ id: string } | null>`

- [ ] **Step 1: Add `getRequestUser`**

En `lib/supabase/requestUser.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { Database } from "./types";

export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (!token) return null;
    const anon = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}
```

- [ ] **Step 2: Add staff gates to `orgAuth.ts`**

Al final de `lib/supabase/orgAuth.ts`, importar `getRequestUser`, `createAdminClient`, `isStaffForTorneo`. Añadir:

```ts
export async function requireStaffTorneoAccess(request: Request, torneoId: string) {
  const user = await getRequestUser(request);
  if (!user) return null;
  const admin = createAdminClient();
  const [{ data: jugador }, { data: torneo }] = await Promise.all([
    admin.from("jugador").select("rol, organizacion_id").eq("id", user.id).single(),
    admin.from("torneo").select("organizacion_id").eq("id", torneoId).single(),
  ]);
  if (!jugador || !torneo) return null;
  if (!isStaffForTorneo(jugador, torneo)) return null;
  return user;
}

export async function requireStaffPartidoAccess(request: Request, partidoId: string) {
  const admin = createAdminClient();
  const { data: partido } = await admin
    .from("partido")
    .select("cuadro_id")
    .eq("id", partidoId)
    .single();
  if (!partido?.cuadro_id) return null;
  const { data: cuadro } = await admin
    .from("cuadro")
    .select("torneo_id")
    .eq("id", partido.cuadro_id)
    .single();
  if (!cuadro) return null;
  return requireStaffTorneoAccess(request, cuadro.torneo_id);
}
```

Usar queries separadas `cuadro_id` → `cuadro` (evitar join tipado `cuadro:cuadro_id` que ya falló en foto).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS (sin errores nuevos)

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/requestUser.ts lib/supabase/orgAuth.ts
git commit -m "feat: auth Bearer y gates staff por torneo y partido"
```

---

### Task 3: Live score y finalizar aceptan organizador + Bearer

**Files:**
- Modify: `app/api/live/score/route.ts`
- Modify: `app/api/live/finalizar/route.ts`

**Interfaces:**
- Consumes: `getRequestUser`, `isStaffForTorneo` (o `requireStaffPartidoAccess`)
- Produces: mismas rutas POST; 401 sin user; 403 si no es staff del torneo **ni** jugador del partido

Regla (spec): web sigue dejando a los dos jugadores del partido; staff incluye organizador.

- [ ] **Step 1: Extraer check compartido en cada route (inline, DRY local)**

En **ambos** archivos, reemplazar el bloque `createClient` + `esTurnoOAdmin` + `esJugador` por:

```ts
import { getRequestUser } from "@/lib/supabase/requestUser";
import { createAdminClient } from "@/lib/supabase/server";
import { isStaffForTorneo } from "@/lib/auth/staffAccess";

// dentro del handler, con request: Request ya recibido:
const user = await getRequestUser(request);
if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

const admin = createAdminClient();
const { data: partido } = await admin
  .from("partido")
  .select("jugador1_id, jugador2_id, cuadro_id, ronda, posicion, ganador_id")
  .eq("id", partidoId)
  .single();
if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

const { data: jugador } = await admin
  .from("jugador")
  .select("rol, organizacion_id")
  .eq("id", user.id)
  .single();

let torneoOrg: { organizacion_id: string | null } | null = null;
if (partido.cuadro_id) {
  const { data: cuadro } = await admin
    .from("cuadro")
    .select("torneo_id")
    .eq("id", partido.cuadro_id)
    .single();
  if (cuadro) {
    const { data: torneo } = await admin
      .from("torneo")
      .select("organizacion_id")
      .eq("id", cuadro.torneo_id)
      .single();
    torneoOrg = torneo;
  }
}

const esStaff = !!(jugador && torneoOrg && isStaffForTorneo(jugador, torneoOrg));
const esJugador = partido.jugador1_id === user.id || partido.jugador2_id === user.id;
if (!esStaff && !esJugador) {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}
```

En `score/route.ts` el update de `resultado` queda igual después de este gate.  
En `finalizar/route.ts` conservar validación de sets, `stripPuntos`, `avanzarGanadorConByes` y amistoso; solo cambia auth. Si el partido no tiene `cuadro_id` (amistoso), `esStaff` es false salvo que se trate como admin/turno:

Tras calcular `torneoOrg`, si no hay cuadro:

```ts
const esStaff =
  jugador &&
  (torneoOrg
    ? isStaffForTorneo(jugador, torneoOrg)
    : jugador.rol === "admin" || jugador.rol === "turno");
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/live/score/route.ts app/api/live/finalizar/route.ts
git commit -m "feat: live score y finalizar aceptan organizador y Bearer"
```

---

### Task 4: APIs GET /api/mobile/*

**Files:**
- Create: `app/api/mobile/torneos/route.ts`
- Create: `app/api/mobile/torneos/[id]/partidos/route.ts`
- Create: `app/api/mobile/partidos/[id]/route.ts`

**Interfaces:**
- Consumes: `getRequestUser`, `isStaffRol`, `isStaffForTorneo`, `requireStaffTorneoAccess`, `requireStaffPartidoAccess`
- Produces:
  - `GET /api/mobile/torneos` → `{ torneos: Array<{ id, nombre, edicion, fecha_inicio, fecha_fin, estado }> }`
  - `GET /api/mobile/torneos/[id]/partidos` → `{ partidos: MobilePartido[] }`
  - `GET /api/mobile/partidos/[id]` → `{ partido: MobilePartido }`
  - `MobilePartido`: `{ id, ronda, posicion, categoria, hora_inicio, cancha, started_at, ended_at, ganador_id, foto_url, resultado, jugador1: { id, nombre, apellido } | null, jugador2: { id, nombre, apellido } | null }`

- [ ] **Step 1: `app/api/mobile/torneos/route.ts`**

```ts
import { getRequestUser } from "@/lib/supabase/requestUser";
import { createAdminClient } from "@/lib/supabase/server";
import { isStaffForTorneo, isStaffRol } from "@/lib/auth/staffAccess";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: jugador } = await admin
    .from("jugador")
    .select("rol, organizacion_id")
    .eq("id", user.id)
    .single();
  if (!jugador || !isStaffRol(jugador.rol)) {
    return NextResponse.json({ error: "Esta app es solo para staff" }, { status: 403 });
  }

  const { data: torneos } = await admin
    .from("torneo")
    .select("id, nombre, edicion, fecha_inicio, fecha_fin, estado, organizacion_id")
    .neq("estado", "cancelado")
    .order("fecha_inicio", { ascending: false });

  const visibles = (torneos ?? []).filter((t) =>
    isStaffForTorneo(jugador, { organizacion_id: t.organizacion_id })
  );

  return NextResponse.json({
    torneos: visibles.map(({ organizacion_id: _o, ...rest }) => rest),
  });
}
```

Si el enum `estado` no incluye `cancelado`, quitar `.neq("estado", "cancelado")` y filtrar en JS los que existan (`borrador` se incluye; el staff los ve).

- [ ] **Step 2: `app/api/mobile/torneos/[id]/partidos/route.ts`**

```ts
import { requireStaffTorneoAccess } from "@/lib/supabase/orgAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireStaffTorneoAccess(request, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: cuadros } = await admin.from("cuadro").select("id, categoria").eq("torneo_id", id);
  const cuadroIds = (cuadros ?? []).map((c) => c.id);
  const catByCuadro = new Map((cuadros ?? []).map((c) => [c.id, c.categoria]));

  if (!cuadroIds.length) return NextResponse.json({ partidos: [] });

  const { data: rows } = await admin
    .from("partido")
    .select(`
      id, cuadro_id, ronda, posicion, hora_inicio, cancha, started_at, ended_at,
      ganador_id, foto_url, resultado, jugador1_id, jugador2_id,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido)
    `)
    .in("cuadro_id", cuadroIds)
    .order("hora_inicio", { ascending: true, nullsFirst: false });

  const partidos = (rows ?? []).map((p: any) => ({
    id: p.id,
    ronda: p.ronda,
    posicion: p.posicion,
    categoria: catByCuadro.get(p.cuadro_id) ?? "",
    hora_inicio: p.hora_inicio,
    cancha: p.cancha,
    started_at: p.started_at,
    ended_at: p.ended_at,
    ganador_id: p.ganador_id,
    foto_url: p.foto_url,
    resultado: p.resultado,
    jugador1: p.jugador1,
    jugador2: p.jugador2,
  }));

  return NextResponse.json({ partidos });
}
```

- [ ] **Step 3: `app/api/mobile/partidos/[id]/route.ts`**

```ts
import { requireStaffPartidoAccess } from "@/lib/supabase/orgAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireStaffPartidoAccess(request, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("partido")
    .select(`
      id, cuadro_id, ronda, posicion, hora_inicio, cancha, started_at, ended_at,
      ganador_id, foto_url, resultado,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido)
    `)
    .eq("id", id)
    .single();
  if (!p) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let categoria = "";
  if (p.cuadro_id) {
    const { data: cuadro } = await admin
      .from("cuadro")
      .select("categoria")
      .eq("id", p.cuadro_id)
      .single();
    categoria = cuadro?.categoria ?? "";
  }

  return NextResponse.json({
    partido: {
      id: p.id,
      ronda: p.ronda,
      posicion: p.posicion,
      categoria,
      hora_inicio: p.hora_inicio,
      cancha: p.cancha,
      started_at: p.started_at,
      ended_at: p.ended_at,
      ganador_id: p.ganador_id,
      foto_url: p.foto_url,
      resultado: p.resultado,
      jugador1: p.jugador1,
      jugador2: p.jugador2,
    },
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/mobile
git commit -m "feat: APIs mobile de torneos y partidos para staff"
```

---

### Task 5: Scaffold Expo en `mobile/`

**Files:**
- Create: `mobile/` (app Expo TypeScript blank, Expo Router)
- Create: `mobile/src/api/client.ts`
- Create: `mobile/src/api/types.ts`
- Modify: root `.gitignore` si hace falta (`mobile/node_modules`, `.expo`)

**Interfaces:**
- Consumes: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Produces: `apiFetch(path: string, accessToken: string | null, init?: RequestInit): Promise<Response>`; tipos `MobileTorneo`, `MobilePartido`, `MobileJugador`

- [ ] **Step 1: Crear la app**

Desde `C:\Users\ricar\Projects\tennis-torneo`:

```bash
npx create-expo-app@latest mobile --template blank-typescript
```

Si pide extras, aceptar TypeScript. Luego en `mobile/app.json` setear:

```json
{
  "expo": {
    "name": "MisTorneos Staff",
    "slug": "mistorneos-staff",
    "scheme": "mistorneos",
    "ios": { "bundleIdentifier": "cl.mistorneos.staff", "supportsTablet": false },
    "android": { "package": "cl.mistorneos.staff" },
    "plugins": ["expo-secure-store", "expo-camera"]
  }
}
```

- [ ] **Step 2: Dependencias**

```bash
cd mobile
npx expo install expo-router expo-secure-store expo-camera expo-linking react-native-safe-area-context react-native-screens @supabase/supabase-js
```

Entry: `"main": "expo-router/entry"` en `mobile/package.json`.  
`mobile/metro.config.js` (crear si no existe con `npx expo customize metro.config.js`) debe incluir:

```js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "..")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../node_modules"),
];
module.exports = config;
```

Así `import { awardPoint } from "../../lib/live/tennisScore"` funciona.

- [ ] **Step 3: `mobile/src/api/types.ts` y `client.ts`**

```ts
export type MobileJugador = { id: string; nombre: string; apellido: string };

export type MobileTorneo = {
  id: string;
  nombre: string;
  edicion: string | number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
};

export type MobilePartido = {
  id: string;
  ronda: string;
  posicion: number;
  categoria: string;
  hora_inicio: string | null;
  cancha: string | null;
  started_at: string | null;
  ended_at: string | null;
  ganador_id: string | null;
  foto_url: string | null;
  resultado: { j1: number; j2: number; tb?: { j1: number; j2: number }; puntos?: { j1: number; j2: number } }[] | null;
  jugador1: MobileJugador | null;
  jugador2: MobileJugador | null;
};
```

```ts
const API = process.env.EXPO_PUBLIC_API_URL ?? "";

export async function apiFetch(path: string, accessToken: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API}${path}`, { ...init, headers });
}
```

- [ ] **Step 4: Env de ejemplo**

Crear `mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Copiar URL/anon del `.env.local` del root a `mobile/.env` (no commitear `.env`).

- [ ] **Step 5: Commit**

```bash
git add mobile .gitignore
git commit -m "chore: scaffold Expo staff app con client API y Metro compartido"
```

---

### Task 6: Login, sesión y bloqueo de no-staff

**Files:**
- Create: `mobile/src/auth/supabase.ts`
- Create: `mobile/src/auth/session.tsx`
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/login.tsx`
- Create: `mobile/app/index.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `isStaffRol` (copiar la función de 3 líneas en `mobile/src/auth/staffRol.ts` — no importar `lib/auth` si Metro rompe path; o importar `../../lib/auth/staffAccess` si Task 5 watchFolders funciona)
- Produces: `useSession(): { accessToken: string | null; userId: string | null; rol: string | null; signIn(email, password): Promise<string | null>; signOut(): Promise<void> }`

Preferir `import { isStaffRol } from "../../lib/auth/staffAccess"`.

- [ ] **Step 1: Supabase RN + SecureStore**

`mobile/src/auth/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);
```

- [ ] **Step 2: Session provider**

Tras `signInWithPassword`, `supabase.from("jugador").select("rol").eq("id", user.id).single()`. Si `!isStaffRol(rol)`, `signOut()` y devolver el string `"Esta app es solo para staff"`.

- [ ] **Step 3: Login UI**

`login.tsx`: email, password, botón Entrar, texto de error. `_layout.tsx`: si no hay sesión → `Redirect` a `/login`; si hay → children. `index.tsx` redirige a `/torneos`.

- [ ] **Step 4: Probar login**

Run: `cd mobile; npx expo start`  
Expected: login con cuenta admin funciona; cuenta `jugador` muestra el mensaje staff.

- [ ] **Step 5: Commit**

```bash
git add mobile
git commit -m "feat: login staff Expo con sesion SecureStore"
```

---

### Task 7: Pantallas Torneos y Partidos

**Files:**
- Create: `mobile/app/torneos/index.tsx`
- Create: `mobile/app/torneos/[id].tsx`
- Create: `mobile/src/partidos/filters.ts`
- Test (repo root): `lib/mobile/partidoFilters.test.ts` **y** `lib/mobile/partidoFilters.ts` (lógica de filtros compartida, importable desde tests Node)

**Interfaces:**
- Consumes: `MobileTorneo`, `MobilePartido`, `apiFetch`
- Produces: `export type FiltroPartido = "hoy" | "en_curso" | "pendientes" | "todos"`; `export function filtrarPartidos(partidos: MobilePartidoLike[], filtro: FiltroPartido, now: Date): MobilePartidoLike[]`

`MobilePartidoLike` en `lib/mobile/partidoFilters.ts`:

```ts
export type MobilePartidoLike = {
  hora_inicio: string | null;
  started_at: string | null;
  ended_at: string | null;
  ganador_id: string | null;
  jugador1: { id: string } | null;
  jugador2: { id: string } | null;
};
```

- [ ] **Step 1: Failing tests de filtros**

```ts
import { describe, it, expect } from "vitest";
import { filtrarPartidos } from "./partidoFilters";

const now = new Date("2026-09-02T15:00:00-04:00");
const base = {
  started_at: null as string | null,
  ended_at: null as string | null,
  ganador_id: null as string | null,
  jugador1: { id: "a" },
  jugador2: { id: "b" },
};

describe("filtrarPartidos", () => {
  it("hoy usa fecha America/Santiago de hora_inicio", () => {
    const list = [
      { ...base, hora_inicio: "2026-09-02T18:00:00.000Z" },
      { ...base, hora_inicio: "2026-09-01T18:00:00.000Z" },
    ];
    expect(filtrarPartidos(list, "hoy", now)).toHaveLength(1);
  });
  it("pendientes exige ambos jugadores y sin ganador", () => {
    const bye = { ...base, jugador2: null, ganador_id: "a" };
    const real = { ...base, hora_inicio: null };
    expect(filtrarPartidos([bye, real], "pendientes", now)).toEqual([real]);
  });
  it("en_curso es started sin ended y sin ganador", () => {
    const live = { ...base, started_at: now.toISOString(), ended_at: null, ganador_id: null, hora_inicio: null };
    expect(filtrarPartidos([live], "en_curso", now)).toHaveLength(1);
  });
});
```

Run: `npx vitest run lib/mobile/partidoFilters.test.ts`  
Expected: FAIL

- [ ] **Step 2: Implement `filtrarPartidos`**

- `hoy`: `hora_inicio` formateada `en-CA` con `timeZone: "America/Santiago"` igual a la de `now`.
- `en_curso`: `started_at && !ended_at && !ganador_id`.
- `pendientes`: `jugador1 && jugador2 && !ganador_id`.
- `todos`: sin filtro (incluye BYE).

- [ ] **Step 3: UI**

Torneos: FlatList, tap → `/torneos/[id]`.  
Partidos: chips Hoy / En curso / Pendientes / Todos; fila categoría · ronda · nombres · hora · cancha. Tap → `/partido/[id]`. Header botón QR → `/qr`.

- [ ] **Step 4: Commit**

```bash
git add lib/mobile mobile/app/torneos mobile/src/partidos
git commit -m "feat: listas de torneos y partidos staff en Expo"
```

---

### Task 8: Control en vivo y confirmar resultado

**Files:**
- Create: `mobile/app/partido/[id].tsx`
- Create: `mobile/src/live/useLiveScore.ts`

**Interfaces:**
- Consumes: `awardPoint`, `removePoint`, `currentSetIndex`, `inTiebreak`, `isMatchOver`, `formatPuntos` from `lib/live/tennisScore.ts`; `POST /api/live/score`; `POST /api/live/finalizar`; `GET /api/mobile/partidos/[id]`
- Produces: pantalla Control con +/− punto, +/− juego, Confirmar

- [ ] **Step 1: Hook `useLiveScore`**

Carga partido. Estado `resultado` inicial `partido.resultado ?? [{ j1: 0, j2: 0 }]`.  
`apply(nuevo)` setea estado y `apiFetch("/api/live/score", token, { method: "POST", body: JSON.stringify({ partidoId, resultado: nuevo }) })`.  
`finalizar()` → `POST /api/live/finalizar` con el `resultado` actual; si `!res.ok` muestra `error` del JSON.

- [ ] **Step 2: UI Control**

Dos columnas J1/J2 (nombres, sets, puntos). Botones grandes. Si `ganador_id`, banner “Partido cerrado” y no enviar puntos (v1: sin PATCH modificar; el spec lo permite después — **v1 de este plan: solo lectura si ya hay ganador**, mensaje “Modificar desde el admin web”).  
Botón Confirmar → modal “¿Cerrar partido?” → `finalizar` → `router.replace` a torneo.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/partido mobile/src/live
git commit -m "feat: control live y confirmar resultado en la app staff"
```

---

### Task 9: QR y deep link

**Files:**
- Create: `mobile/app/qr.tsx`
- Create: `mobile/src/qr/parsePartido.ts`
- Test: `lib/mobile/parsePartidoQr.test.ts` y `lib/mobile/parsePartidoQr.ts` (misma función, tests en Vitest)

**Interfaces:**
- Consumes: scheme `mistorneos`, URL `https://<host>/live/{uuid}`
- Produces: `export function parsePartidoIdFromQr(raw: string): string | null`

UUID regex: `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { parsePartidoIdFromQr } from "./parsePartidoQr";

const id = "11111111-1111-1111-1111-111111111111";

describe("parsePartidoIdFromQr", () => {
  it("acepta URL live", () => {
    expect(parsePartidoIdFromQr(`https://mistorneos.cl/live/${id}`)).toBe(id);
  });
  it("acepta deep link", () => {
    expect(parsePartidoIdFromQr(`mistorneos://partido/${id}`)).toBe(id);
  });
  it("acepta UUID suelto", () => {
    expect(parsePartidoIdFromQr(id)).toBe(id);
  });
  it("rechaza basura", () => {
    expect(parsePartidoIdFromQr("https://google.com")).toBeNull();
  });
});
```

- [ ] **Step 2: Implement parse + pantalla QR**

`expo-camera` BarCodeScanner. Al leer, `parsePartidoIdFromQr`; si null, “Código inválido”; si ok, `router.replace(`/partido/${id}`)`.  
En `_layout` o `app/index`, `expo-linking` `getInitialURL` / `addEventListener`: si path `/live/:id` o `partido/:id`, navegar.

En web, no hace falta cambiar `/live/[partidoId]` (ya existe).

- [ ] **Step 3: Commit**

```bash
git add lib/mobile/parsePartidoQr.ts lib/mobile/parsePartidoQr.test.ts mobile/app/qr.tsx mobile/src/qr
git commit -m "feat: QR y deep link hacia control de partido"
```

---

### Task 10: Pasador Bluetooth persistente

**Files:**
- Modify: `lib/live/buttonBindings.ts` — añadir `DEVICE_BINDINGS_STORAGE_KEY = "score-buttons:device"`
- Modify: `lib/live/buttonBindings.test.ts` — un test del key
- Create: `mobile/src/bluetooth/useDeviceBindings.ts`
- Create: `mobile/app/ajustes/pasador.tsx`
- Modify: `mobile/app/partido/[id].tsx` — escuchar pulsaciones

**Interfaces:**
- Consumes: `parseBindings`, `serializeBindings`, `shouldAcceptPress`, `playerForKeyEvent`, `AB_SHUTTER3_IOS_BINDING`, `DEFAULT_DEBOUNCE_MS`
- Produces: bindings **globales de dispositivo** (no por `partidoId`); ranuras J1/J2

Cambio respecto a la web: la web usa `storageKey(partidoId)`. La app usa **una** clave de dispositivo. No romper la web: solo añadir constante nueva.

- [ ] **Step 1: Test de constante + parse roundtrip ya existe; añadir**

```ts
import { DEVICE_BINDINGS_STORAGE_KEY, parseBindings, serializeBindings, AB_SHUTTER3_IOS_BINDING } from "../live/buttonBindings";

it("device key es fija", () => {
  expect(DEVICE_BINDINGS_STORAGE_KEY).toBe("score-buttons:device");
});
it("roundtrip device bindings", () => {
  const raw = serializeBindings({ j1: AB_SHUTTER3_IOS_BINDING, j2: null });
  expect(parseBindings(raw).j1).toEqual(AB_SHUTTER3_IOS_BINDING);
});
```

- [ ] **Step 2: Export `DEVICE_BINDINGS_STORAGE_KEY`**

En `buttonBindings.ts`:

```ts
export const DEVICE_BINDINGS_STORAGE_KEY = "score-buttons:device";
```

- [ ] **Step 3: Persistencia RN**

`useDeviceBindings`: lee/escribe AsyncStorage (o SecureStore) con `DEVICE_BINDINGS_STORAGE_KEY`.  
`assignAbShutter3(player)` setea `AB_SHUTTER3_IOS_BINDING`.  
`assignHid(player, { code, key })` setea `{ kind: "hid", code, key }`.  
`clear(player)` pone null.

- [ ] **Step 4: Captura de hardware**

Instalar en `mobile`:

```bash
npx expo install react-native-volume-manager @react-native-async-storage/async-storage
```

- iOS: `VolumeManager.addVolumeListener` — si el evento es volume up y `playerForKeyEvent({ code: "AudioVolumeUp", key: "VolumeUp" }, bindings)` → `awardPoint`.
- Android: listener de teclas del activity (Volume Up / Enter / Camera). Si Expo no expone KeyEvent en managed, usar config plugin mínimo `android.volume` documentado en `mobile/README.md`: “Bluetooth HID requiere development build (`npx expo run:android` / `run:ios`), no Expo Go”.

Pantalla Pasador: dos ranuras, Conectar (espera 8s la próxima tecla), preset AB Shutter3, Desconectar.

Control: monta el listener; debounce `shouldAcceptPress`. **No** usar el clicker para abrir el modal Confirmar.

- [ ] **Step 5: Tests bindings + commit**

```bash
npx vitest run lib/live/buttonBindings.test.ts
git add lib/live/buttonBindings.ts lib/live/buttonBindings.test.ts mobile/src/bluetooth mobile/app/ajustes
git commit -m "feat: pasador Bluetooth persistente J1/J2 en la app staff"
```

---

### Task 11: Verificación y README de builds

**Files:**
- Create: `mobile/README.md`
- Modify: root no necesario

- [ ] **Step 1: Tests y tsc del monorepo**

```bash
npx vitest run lib/auth lib/mobile lib/live/buttonBindings.test.ts
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 2: README**

`mobile/README.md` debe decir exactamente:

1. Copiar env desde root `.env.local` a `mobile/.env`.
2. `EXPO_PUBLIC_API_URL` en dispositivo físico = IP LAN de la máquina (`http://192.168.x.x:3000`), no `localhost`.
3. `npx expo run:ios` y `npx expo run:android` (dev client) para pasador HID.
4. Login solo staff.
5. QR espera `https://<prod>/live/<uuid>` o `mistorneos://partido/<uuid>`.

- [ ] **Step 3: Commit**

```bash
git add mobile/README.md
git commit -m "docs: como correr la app staff en iOS y Android"
```

---

## Self-review

**Spec coverage:**
- Staff C → Tasks 1–3, 6
- Bearer → Task 2–4
- APIs mobile → Task 4
- Expo iOS+Android → Task 5
- Login / torneos / partidos / filtros BYE → Tasks 6–7
- Live + confirmar → Task 8
- QR + deep link → Task 9
- Bluetooth persistente J1/J2 + AB Shutter3 → Task 10
- Builds internos, no stores → Task 11 README

**Placeholders:** ninguno. BLE GATT opcional de la spec no tiene tarea propia (HID es el camino v1; se puede añadir después sin romper bindings `kind: "ble"` ya existentes en `buttonBindings.ts`).

**Tipos:** `MobilePartido`, `isStaffForTorneo`, `getRequestUser`, `parsePartidoIdFromQr`, `DEVICE_BINDINGS_STORAGE_KEY` consistentes en todas las tareas.
