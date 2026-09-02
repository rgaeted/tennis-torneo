"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { StoryCanvas } from "./StoryCanvas";
import { buildCaption, filenameStory } from "@/lib/instagram/captions";
import {
  campeonDeFinal,
  formatScore,
  lineasCuadro,
  lineaPrincipalDePayload,
  logroJugador,
} from "@/lib/instagram/payload";
import type {
  JugadorStory,
  PartidoStoryRow,
  PatrocinadorInput,
  PlantillaStory,
  StoryPayload,
  TipoStory,
} from "@/lib/instagram/types";

const PREVIEW_SCALE = 0.28;

type PartidoConCat = PartidoStoryRow & { categoria: string };

export function GenerarStoryPanel({
  torneoNombre,
  torneoEdicion,
  clubNombre,
  clubImagenUrl,
  patrocinadores,
  partidos,
  inscritos,
}: {
  torneoNombre: string;
  torneoEdicion?: string | number | null;
  clubNombre: string | null;
  clubImagenUrl: string | null;
  patrocinadores: PatrocinadorInput[];
  partidos: PartidoConCat[];
  inscritos: Array<{ categoria: string; jugador: JugadorStory }>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tipo, setTipo] = useState<TipoStory>("resultado");
  const [plantilla, setPlantilla] = useState<PlantillaStory>("neon");
  const [partidoId, setPartidoId] = useState("");
  const [categoriaCampeon, setCategoriaCampeon] = useState("");
  const [categoriaCuadro, setCategoriaCuadro] = useState("");
  const [rondaCuadro, setRondaCuadro] = useState("cuartos");
  const [patrocinadorId, setPatrocinadorId] = useState("");
  const [jugadorKey, setJugadorKey] = useState("");
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const partidosPorCategoria = useMemo(() => {
    const map = new Map<string, PartidoConCat[]>();
    for (const p of partidos) {
      const list = map.get(p.categoria) ?? [];
      list.push(p);
      map.set(p.categoria, list);
    }
    return map;
  }, [partidos]);

  const partidosConResultado = useMemo(
    () =>
      partidos.filter(
        (p) =>
          p.ganador_id &&
          p.jugador1 &&
          p.jugador2 &&
          formatScore(p.resultado as { j1: number; j2: number }[] | null)
      ),
    [partidos]
  );

  const categoriasCampeon = useMemo(() => {
    const cats: string[] = [];
    for (const [cat, ps] of partidosPorCategoria) {
      if (campeonDeFinal(ps)) cats.push(cat);
    }
    return cats;
  }, [partidosPorCategoria]);

  const patrocinadoresActivos = patrocinadores.filter((p) => p.activo);

  const payload: StoryPayload | null = useMemo(() => {
    const ctx = {
      torneoNombre,
      torneoEdicion,
      clubNombre,
      clubImagenUrl,
      patrocinadores,
    };
    switch (tipo) {
      case "resultado": {
        const p = partidosConResultado.find((x) => x.id === partidoId);
        if (!p || !p.jugador1 || !p.jugador2) return null;
        return {
          ...ctx,
          tipo: "resultado",
          categoria: p.categoria,
          ronda: p.ronda,
          j1: p.jugador1,
          j2: p.jugador2,
          score: formatScore(p.resultado as { j1: number; j2: number }[] | null),
        };
      }
      case "campeon": {
        const ps = partidosPorCategoria.get(categoriaCampeon) ?? [];
        const campeon = campeonDeFinal(ps);
        if (!campeon) return null;
        return {
          ...ctx,
          tipo: "campeon",
          categoria: categoriaCampeon,
          campeon,
        };
      }
      case "cuadro": {
        const ps = partidosPorCategoria.get(categoriaCuadro) ?? [];
        const lineas = lineasCuadro(ps, rondaCuadro);
        if (!lineas.length) return null;
        return {
          ...ctx,
          tipo: "cuadro",
          categoria: categoriaCuadro,
          ronda: rondaCuadro,
          lineas,
        };
      }
      case "patrocinador": {
        const dest = patrocinadoresActivos.find((p) => p.id === patrocinadorId);
        if (!dest) return null;
        return { ...ctx, tipo: "patrocinador", destacado: dest };
      }
      case "jugador": {
        const ins = inscritos.find((i) => `${i.jugador.id}|${i.categoria}` === jugadorKey);
        if (!ins) return null;
        const ps = partidosPorCategoria.get(ins.categoria) ?? [];
        return {
          ...ctx,
          tipo: "jugador",
          categoria: ins.categoria,
          jugador: ins.jugador,
          logro: logroJugador(ins.jugador.id, ps),
        };
      }
    }
  }, [
    tipo,
    partidoId,
    categoriaCampeon,
    categoriaCuadro,
    rondaCuadro,
    patrocinadorId,
    jugadorKey,
    partidosConResultado,
    partidosPorCategoria,
    patrocinadoresActivos,
    inscritos,
    torneoNombre,
    torneoEdicion,
    clubNombre,
    clubImagenUrl,
    patrocinadores,
  ]);

  const caption = useMemo(() => {
    if (!payload) return "";
    return buildCaption({
      tipo: payload.tipo,
      torneoNombre,
      categoria: "categoria" in payload ? payload.categoria : null,
      ronda: "ronda" in payload ? payload.ronda : null,
      lineaPrincipal: lineaPrincipalDePayload(payload),
      patrocinadores,
    });
  }, [payload, torneoNombre, patrocinadores]);

  const [captionEdit, setCaptionEdit] = useState("");
  const captionValue = captionEdit || caption;

  async function descargar() {
    setErrorExport(null);
    const node = canvasRef.current;
    if (!node || !payload) return;
    try {
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
      });
      const slug =
        payload.tipo === "patrocinador"
          ? payload.destacado.nombre
          : "categoria" in payload
            ? payload.categoria
            : "torneo";
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filenameStory(payload.tipo, slug, new Date().toISOString().slice(0, 10));
      a.click();
    } catch {
      setErrorExport("No se pudo generar el PNG. Prueba otra foto o recarga.");
    }
  }

  async function copiarCaption() {
    await navigator.clipboard.writeText(captionValue);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const emptyMsg =
    tipo === "resultado"
      ? "No hay partidos con resultado todavía."
      : tipo === "campeon"
        ? "Ninguna categoría tiene campeón (falta ganador de la final)."
        : tipo === "cuadro"
          ? "No hay partidos en esa ronda."
          : tipo === "patrocinador"
            ? "Agrega un patrocinador activo."
            : "No hay inscripciones.";

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-xs text-slate-500">
            Tipo de story
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoStory);
                setCaptionEdit("");
              }}
              className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
            >
              <option value="resultado">Resultado</option>
              <option value="campeon">Campeón</option>
              <option value="cuadro">Cuadro</option>
              <option value="patrocinador">Patrocinador</option>
              <option value="jugador">Jugador</option>
            </select>
          </label>

          {tipo === "resultado" && (
            <label className="block text-xs text-slate-500">
              Partido
              <select
                value={partidoId}
                onChange={(e) => setPartidoId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
              >
                <option value="">Seleccionar…</option>
                {partidosConResultado.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.categoria} · {p.jugador1?.apellido} vs {p.jugador2?.apellido}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo === "campeon" && (
            <label className="block text-xs text-slate-500">
              Categoría
              <select
                value={categoriaCampeon}
                onChange={(e) => setCategoriaCampeon(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
              >
                <option value="">Seleccionar…</option>
                {categoriasCampeon.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo === "cuadro" && (
            <>
              <label className="block text-xs text-slate-500">
                Categoría
                <select
                  value={categoriaCuadro}
                  onChange={(e) => setCategoriaCuadro(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {[...partidosPorCategoria.keys()].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Ronda
                <select
                  value={rondaCuadro}
                  onChange={(e) => setRondaCuadro(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
                >
                  <option value="cuartos">Cuartos</option>
                  <option value="semis">Semifinal</option>
                  <option value="final">Final</option>
                </select>
              </label>
            </>
          )}

          {tipo === "patrocinador" && (
            <label className="block text-xs text-slate-500">
              Patrocinador
              <select
                value={patrocinadorId}
                onChange={(e) => setPatrocinadorId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
              >
                <option value="">Seleccionar…</option>
                {patrocinadoresActivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.nivel})
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo === "jugador" && (
            <label className="block text-xs text-slate-500">
              Jugador
              <select
                value={jugadorKey}
                onChange={(e) => setJugadorKey(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
              >
                <option value="">Seleccionar…</option>
                {inscritos.map((i) => (
                  <option key={`${i.jugador.id}|${i.categoria}`} value={`${i.jugador.id}|${i.categoria}`}>
                    {i.jugador.nombre} {i.jugador.apellido} ({i.categoria})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="text-xs text-slate-500 mb-2">Plantilla</p>
            <div className="flex gap-2">
              {(["neon", "clasico", "bold"] as PlantillaStory[]).map((pl) => (
                <button
                  key={pl}
                  type="button"
                  onClick={() => setPlantilla(pl)}
                  className={`px-3 py-1.5 text-sm rounded-lg border capitalize ${
                    plantilla === pl
                      ? "border-court text-court bg-court/10"
                      : "border-navy-600 text-slate-400"
                  }`}
                >
                  {pl}
                </button>
              ))}
            </div>
          </div>

          {!payload && <p className="text-sm text-slate-500">{emptyMsg}</p>}

          {errorExport && (
            <p className="text-sm text-red-400">{errorExport}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!payload}
              onClick={descargar}
              className="px-4 py-2 text-sm border border-court/40 text-court rounded-lg disabled:opacity-40"
            >
              Descargar PNG
            </button>
            <button
              type="button"
              disabled={!payload}
              onClick={copiarCaption}
              className="px-4 py-2 text-sm border border-navy-600 text-slate-300 rounded-lg disabled:opacity-40"
            >
              {copiado ? "Copiado" : "Copiar caption"}
            </button>
          </div>

          <label className="block text-xs text-slate-500">
            Caption
            <textarea
              value={captionValue}
              onChange={(e) => setCaptionEdit(e.target.value)}
              rows={6}
              className="mt-1 w-full px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm font-mono"
            />
          </label>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2">Vista previa</p>
          <div
            className="overflow-hidden rounded-xl border border-navy-700 bg-black"
            style={{
              width: 1080 * PREVIEW_SCALE,
              height: 1920 * PREVIEW_SCALE,
            }}
          >
            {payload ? (
              <>
                <div
                  style={{
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "top left",
                    width: 1080,
                    height: 1920,
                  }}
                >
                  <StoryCanvas payload={payload} plantilla={plantilla} />
                </div>
                <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden>
                  <StoryCanvas ref={canvasRef} payload={payload} plantilla={plantilla} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600 text-sm p-4 text-center">
                Selecciona tipo y entidad
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
