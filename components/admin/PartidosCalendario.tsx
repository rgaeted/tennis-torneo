"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIAS_ORDEN,
  colorCategoria,
  labelCategoria,
  type Categoria,
} from "@/lib/categorias";
import { DURATION } from "@/lib/scheduling/autoSchedule";
import { labelsPartido, primeraRondaDelCuadro, type Ronda } from "@/lib/bracket/matchLabels";

type Jugador = { id: string; nombre: string; apellido: string };

export type PartidoCalendario = {
  id: string;
  ronda: string;
  posicion: number;
  cancha: string | null;
  hora_inicio: string | null;
  ganador_id: string | null;
  resultado: unknown;
  started_at: string | null;
  ended_at: string | null;
  foto_url?: string | null;
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  ganador: { nombre: string; apellido: string } | null;
      cuadro: { categoria: string; tamano?: number | string } | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

const HORA_INICIO = 9 * 60;
const HORA_FIN = 21 * 60;

function parseDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseMinutos(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatHoraMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotKeyForTime(minutos: number): number {
  const offset = minutos - HORA_INICIO;
  if (offset < 0) return HORA_INICIO;
  const slotIndex = Math.floor(offset / DURATION);
  return HORA_INICIO + slotIndex * DURATION;
}

function generarSlotsHorario(): number[] {
  const slots: number[] = [];
  for (let m = HORA_INICIO; m <= HORA_FIN; m += DURATION) slots.push(m);
  return slots;
}

function labelsForPartido(p: PartidoCalendario) {
  const tamano = p.cuadro?.tamano ? (Number(p.cuadro.tamano) as 8 | 16 | 32) : undefined;
  return labelsPartido({
    ronda: p.ronda as Ronda,
    posicion: p.posicion,
    jugador1_id: p.jugador1?.id ?? null,
    jugador2_id: p.jugador2?.id ?? null,
    jugador1: p.jugador1,
    jugador2: p.jugador2,
    primeraRonda: primeraRondaDelCuadro(tamano),
  });
}

function labelPartido(p: PartidoCalendario): string {
  if (p.ganador_id && p.ganador) {
    return `${p.ganador.nombre} ${p.ganador.apellido}`;
  }
  const { j1, j2 } = labelsForPartido(p);
  return `${j1} vs ${j2}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDiaCorto(date: Date): string {
  return date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

function formatDiaLargo(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MatchCard({
  partido,
  onClick,
}: {
  partido: PartidoCalendario;
  onClick: () => void;
}) {
  const cat = partido.cuadro?.categoria ?? "cuarta";
  const colors = colorCategoria(cat);
  const enCurso = !!partido.started_at && !partido.ended_at;
  const terminado = !!partido.ganador_id;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border px-2 py-1.5 transition-opacity hover:opacity-90"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: colors.text }}
        >
          {labelCategoria(cat as Categoria)}
        </span>
        {enCurso && (
          <span className="text-[9px] text-red-400 font-medium animate-pulse">● En curso</span>
        )}
        {terminado && !enCurso && (
          <span className="text-[9px] text-slate-500">✓</span>
        )}
      </div>
      <p className="text-[11px] text-white leading-tight line-clamp-2">{labelPartido(partido)}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">
        {RONDA_LABELS[partido.ronda] ?? partido.ronda}
      </p>
    </button>
  );
}

export function PartidosCalendario({
  partidos,
  numCanchas = 1,
  fechaInicio,
  fechaFin,
  onSelectPartido,
}: {
  partidos: PartidoCalendario[];
  numCanchas?: number;
  fechaInicio?: string;
  fechaFin?: string;
  onSelectPartido: (p: PartidoCalendario) => void;
}) {
  const programados = useMemo(
    () => partidos.filter((p) => p.hora_inicio && p.cancha),
    [partidos]
  );
  const sinProgramar = useMemo(
    () => partidos.filter((p) => !p.hora_inicio || !p.cancha),
    [partidos]
  );

  const categoriasPresentes = useMemo(() => {
    const set = new Set(partidos.map((p) => p.cuadro?.categoria).filter(Boolean) as string[]);
    return CATEGORIAS_ORDEN.filter((c) => set.has(c));
  }, [partidos]);

  const fechasConPartidos = useMemo(() => {
    const keys = new Set(programados.map((p) => parseDateKey(p.hora_inicio!)));
    return [...keys].sort();
  }, [programados]);

  const rangoInicio = fechaInicio ? new Date(fechaInicio + "T12:00:00") : new Date();
  const rangoFin = fechaFin ? new Date(fechaFin + "T12:00:00") : addDays(rangoInicio, 6);

  const [semanaInicio, setSemanaInicio] = useState(() =>
    startOfWeek(fechasConPartidos[0] ? new Date(fechasConPartidos[0] + "T12:00:00") : rangoInicio)
  );

  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));
  }, [semanaInicio]);

  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(() => {
    if (fechasConPartidos.length) return fechasConPartidos[0];
    return parseDateKey(rangoInicio.toISOString());
  });

  const slotsHorario = useMemo(() => generarSlotsHorario(), []);
  const canchas = useMemo(
    () => Array.from({ length: Math.max(1, numCanchas) }, (_, i) => String(i + 1)),
    [numCanchas]
  );

  const grid = useMemo(() => {
    const map = new Map<string, PartidoCalendario>();
    for (const p of programados) {
      if (!p.hora_inicio || !p.cancha) continue;
      if (parseDateKey(p.hora_inicio) !== diaSeleccionado) continue;
      const slot = slotKeyForTime(parseMinutos(p.hora_inicio));
      const key = `${slot}|${p.cancha}`;
      map.set(key, p);
    }
    return map;
  }, [programados, diaSeleccionado]);

  const partidosDelDia = useMemo(
    () =>
      programados
        .filter((p) => p.hora_inicio && parseDateKey(p.hora_inicio) === diaSeleccionado)
        .sort((a, b) => parseMinutos(a.hora_inicio!) - parseMinutos(b.hora_inicio!)),
    [programados, diaSeleccionado]
  );

  function irSemana(delta: number) {
    const next = addDays(semanaInicio, delta * 7);
    setSemanaInicio(next);
    setDiaSeleccionado(parseDateKey(next.toISOString()));
  }

  return (
    <div className="space-y-4">
      {categoriasPresentes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoriasPresentes.map((cat) => {
            const colors = colorCategoria(cat);
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                {labelCategoria(cat)}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => irSemana(-1)}
          className="text-sm px-3 py-1.5 border border-navy-600 text-slate-400 hover:text-white rounded-lg"
        >
          ← Semana
        </button>
        <span className="text-sm text-slate-400 capitalize">
          {formatDiaLargo(new Date(diaSeleccionado + "T12:00:00"))}
        </span>
        <button
          type="button"
          onClick={() => irSemana(1)}
          className="text-sm px-3 py-1.5 border border-navy-600 text-slate-400 hover:text-white rounded-lg"
        >
          Semana →
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {diasSemana.map((dia) => {
          const key = parseDateKey(dia.toISOString());
          const count = programados.filter(
            (p) => p.hora_inicio && parseDateKey(p.hora_inicio) === key
          ).length;
          const selected = key === diaSeleccionado;
          const enRango = dia >= rangoInicio && dia <= rangoFin;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setDiaSeleccionado(key)}
              className={`shrink-0 min-w-[4.5rem] px-2 py-2 rounded-lg border text-center transition-colors ${
                selected
                  ? "border-court bg-court/15 text-court"
                  : enRango
                    ? "border-navy-700 text-slate-400 hover:border-navy-600 hover:text-white"
                    : "border-navy-800 text-slate-600"
              }`}
            >
              <div className="text-[10px] uppercase">{formatDiaCorto(dia).split(" ")[0]}</div>
              <div className="text-sm font-medium">{dia.getDate()}</div>
              {count > 0 && (
                <div className={`text-[10px] ${selected ? "text-court/80" : "text-slate-600"}`}>
                  {count} p.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {partidosDelDia.length === 0 ? (
        <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 text-center text-slate-500">
          No hay partidos programados para este día.
        </div>
      ) : (
        <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm border-collapse">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="px-3 py-2 text-left text-slate-500 font-normal w-16 sticky left-0 bg-navy-900 z-10">
                  Hora
                </th>
                {canchas.map((c) => (
                  <th key={c} className="px-2 py-2 text-center text-slate-500 font-normal min-w-[10rem]">
                    Cancha {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotsHorario.map((slotMin) => (
                <tr key={slotMin} className="border-b border-navy-800/80">
                  <td className="px-3 py-2 text-ball text-xs font-medium whitespace-nowrap sticky left-0 bg-navy-900 z-10 align-top">
                    {formatHoraMinutos(slotMin)}
                  </td>
                  {canchas.map((c) => {
                    const partido = grid.get(`${slotMin}|${c}`);
                    return (
                      <td key={c} className="px-2 py-1.5 align-top">
                        {partido ? (
                          <MatchCard partido={partido} onClick={() => onSelectPartido(partido)} />
                        ) : (
                          <div className="h-14 rounded-lg border border-dashed border-navy-800/60" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sinProgramar.length > 0 && (
        <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            Sin horario ({sinProgramar.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sinProgramar.map((p) => {
              const cat = p.cuadro?.categoria ?? "cuarta";
              const colors = colorCategoria(cat);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPartido(p)}
                  className="text-left rounded-lg border px-3 py-2 hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase" style={{ color: colors.text }}>
                    {labelCategoria(cat as Categoria)}
                  </span>
                  <p className="text-xs text-white mt-0.5">{labelPartido(p)}</p>
                  <p className="text-[10px] text-slate-500">
                    {RONDA_LABELS[p.ronda] ?? p.ronda}
                    {!p.hora_inicio && " · Sin hora"}
                    {!p.cancha && p.hora_inicio && " · Sin cancha"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
