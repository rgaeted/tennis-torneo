# Foto de partido + Instagram

Fecha: 2026-09-02  
Estado: pendiente revisión del usuario

## Problema

Los organizadores sacan fotos en la cancha con ambos jugadores, pero hoy no hay dónde guardarlas ni usarlas en el hub de Contenido. El tipo **Resultado** genera una story tipográfica sin foto real del encuentro.

## Decisiones del usuario

| Tema | Decisión |
|---|---|
| Origen de la foto | Imagen real subida por admin/organizador |
| Instagram | Descarga cruda **y** story con plantilla (overlay) |
| Dónde subir | Partidos (panel detalle) **y** Contenido |
| Cuándo subir | Partido con **ambos jugadores** definidos (resultado no obligatorio) |

## Enfoque recomendado

**Nuevo tipo de story `foto_partido`** (no extender `resultado`).

Motivo: `resultado` exige marcador para generar; la foto puede existir antes del resultado. Mantener tipos separados evita reglas confusas en el wizard.

### Alternativas descartadas

| Enfoque | Por qué no |
|---|---|
| Solo extender `resultado` | Bloquea stories con foto si aún no hay score |
| Tabla `partido_foto` separada | YAGNI; una URL por partido basta en v1 |
| Bucket aparte | Reutilizar bucket `torneos` como patrocinadores y logos |

## Modelo de datos

```sql
alter table public.partido
  add column if not exists foto_url text;
```

- Una foto activa por partido (`foto_url` nullable).
- Reemplazo: `upsert` en storage con misma ruta.
- Eliminar: endpoint DELETE que borra storage + pone `foto_url = null`.

Storage: `partidos/{torneo_id}/{partido_id}.{ext}` en bucket `torneos`.

## API

`POST /api/admin/partidos/[id]/foto`

- Auth: `requirePartidoAccess(id)` (admin u organizador del torneo).
- Valida: `jugador1_id` y `jugador2_id` presentes.
- Body: `multipart/form-data`, campo `file`.
- Responde `{ url }` y persiste en `partido.foto_url`.

`DELETE /api/admin/partidos/[id]/foto`

- Misma auth.
- Borra archivo en storage (best effort) y limpia `foto_url`.

No se añade PATCH genérico de foto en el route existente (solo horario/cancha).

## UI — Partidos

Componente reutilizable `PartidoFotoUpload`:

- Preview thumbnail si hay `foto_url`.
- Input file + botón subir.
- Botón eliminar (confirmación simple).
- Deshabilitado si falta algún jugador; mensaje: "Define ambos jugadores para subir foto".
- Integrar en `PartidoDetallePanel` de `PartidosAdmin` (admin y organizador comparten componente).

Indicador opcional en fila de partido: icono 📷 si tiene foto (solo visual, sin bloquear espacio).

## UI — Contenido

En `GenerarStoryPanel`:

1. Nuevo tipo **Foto de partido** en el selector.
2. Selector de partido: todos con ambos jugadores (no exige resultado).
3. Bloque de foto:
   - Si no hay foto: `PartidoFotoUpload` inline.
   - Si hay foto: preview + reemplazar/eliminar.
4. Acciones:
   - **Descargar foto** — descarga directa del JPG/PNG original (`foto_url`).
   - **Descargar story** — PNG 1080×1920 vía `html-to-image` (flujo actual).
   - **Copiar caption** — caption sugerido.

Generar story requiere `foto_url`. Descargar foto cruda solo requiere `foto_url`.

## Story `foto_partido`

### Payload

```ts
{
  tipo: "foto_partido";
  categoria: string;
  ronda: string;
  j1: JugadorStory;
  j2: JugadorStory;
  fotoUrl: string;
  score?: string | null; // presente si hay resultado
}
```

### Layout (3 plantillas)

Común a Neon, Clásico y Bold:

- **Zona foto (~55–65% superior):** `object-cover`, `crossOrigin="anonymous"`.
- **Overlay inferior:** gradiente para legibilidad.
- **Texto:** categoría · ronda, nombres de ambos jugadores.
- **Score:** solo si existe; si no, omitir línea (no placeholder).
- **Header/footer:** torneo, club, franjas Oro/Plata, marca MisTorneos.cl (igual que otros tipos).

Variantes por plantilla:

| Plantilla | Foto |
|---|---|
| Neon | Rectángulo con borde acento lima |
| Clásico | Marco claro, tipografía serif en título |
| Bold | Foto casi full-bleed (como tipo Jugador) |

### Caption

Similar a Resultado:

```
🎾 Cuartos · 4ta — Torneo X
Juan Pérez vs Pedro Gómez — 6-4 6-2   // score omitido si no hay
#cuarta #torneox #tenischile #mistorneos
Patrocinan: ...
```

Si no hay score: línea principal solo `Juan Pérez vs Pedro Gómez`.

## Lógica compartida

- `lib/instagram/types.ts` — `TipoStory` incluye `foto_partido`; extender `PartidoStoryRow` con `foto_url`.
- `lib/instagram/payload.ts` — helper `lineaPrincipalFotoPartido(j1, j2, score?)`.
- `lib/instagram/captions.ts` — soporte en `buildCaption` / `lineaPrincipalDePayload`.
- `StoryCanvas.tsx` — case `foto_partido`.
- Tests en `payload.test.ts` y `captions.test.ts`.

## Queries existentes

Añadir `foto_url` al select de partidos en:

- `app/admin/torneo/[id]/partidos/page.tsx`
- `app/organizador/torneo/[id]/partidos/page.tsx`
- `app/admin/torneo/[id]/contenido/page.tsx`
- `app/organizador/torneo/[id]/contenido/page.tsx`

## Migración

`024_partido_foto_url.sql`:

```sql
alter table public.partido
  add column if not exists foto_url text;
```

Actualizar `lib/supabase/types.ts`.

## Fuera de v1

- Galería pública de fotos de partidos.
- Múltiples fotos por partido.
- Recorte/edición en browser.
- Autopost Instagram.
- Fotos en bracket público (se puede añadir después leyendo `foto_url`).

## Orden de implementación sugerido

1. Migración + types
2. API upload/delete foto
3. `PartidoFotoUpload` + integración Partidos
4. Tipo `foto_partido` (lib + StoryCanvas + tests)
5. Contenido hub (tipo, upload inline, descarga cruda + story)
6. Verificación: vitest, tsc, build
