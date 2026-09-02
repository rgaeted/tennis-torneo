"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgramarModal } from "@/components/admin/ProgramarModal";
import { ProgramarAutomaticoModal } from "@/components/admin/ProgramarAutomaticoModal";
import { ResultForm } from "@/components/admin/ResultForm";
import { PartidosCalendario, type PartidoCalendario } from "@/components/admin/PartidosCalendario";
import { PartidoFotoUpload } from "@/components/partidos/PartidoFotoUpload";
import { colorCategoria, labelCategoria, type Categoria } from "@/lib/categorias";
import { labelsPartido, primeraRondaDelCuadro, type Ronda } from "@/lib/bracket/matchLabels";

type Partido = PartidoCalendario & {
  cuadro: { categoria: string; tamano?: number | string } | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

function formatDuracion(started: string, ended: string): string {
  const mins = Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatFechaHora(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hora: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

function labelsForPartido(p: Partido) {
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

function labelJugadores(p: Partido): string {
  if (p.ganador_id && p.ganador) {
    return `${p.ganador.nombre} ${p.ganador.apellido} (ganó)`;
  }
  const { j1, j2 } = labelsForPartido(p);
  return `${j1} vs ${j2}`;
}

function PartidoDetallePanel({
  partido,
  fotoUrl,
  loading,
  onClose,
  onSchedule,
  onIniciar,
  onTerminar,
  onResultado,
  onFotoChange,
}: {
  partido: Partido;
  fotoUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onSchedule: () => void;
  onIniciar: () => void;
  onTerminar: () => void;
  onResultado: () => void;
  onFotoChange: (url: string | null) => void;
}) {
  const cat = partido.cuadro?.categoria ?? "cuarta";
  const colors = colorCategoria(cat);
  const fh = formatFechaHora(partido.hora_inicio);
  const enCurso = !!partido.started_at && !partido.ended_at;
  const terminado = !!partido.started_at && !!partido.ended_at;
  const duracion = terminado ? formatDuracion(partido.started_at!, partido.ended_at!) : null;
  const tieneJugadores = partido.jugador1 && partido.jugador2;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-navy-900 border border-navy-700 rounded-t-2xl sm:rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.text }}
            >
              {labelCategoria(cat as Categoria)}
            </span>
            <h3 className="text-lg font-semibold text-white mt-0.5">
              {RONDA_LABELS[partido.ronda] ?? partido.ronda}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-slate-300 mb-4">{labelJugadores(partido)}</p>

        {(partido.resultado as { j1: number; j2: number }[] | null)?.length ? (
          <p className="text-ball font-bold text-sm mb-4 tabular-nums">
            {(partido.resultado as { j1: number; j2: number }[])
              .map((s) => `${s.j1}-${s.j2}`)
              .join("  ")}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div>
            <dt className="text-slate-500 text-xs">Fecha</dt>
            <dd className="text-white">{fh?.fecha ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Hora</dt>
            <dd className="text-ball">{fh?.hora ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Cancha</dt>
            <dd className="text-white">{partido.cancha ? `C${partido.cancha}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs">Estado</dt>
            <dd className={enCurso ? "text-red-400" : terminado ? "text-court" : "text-slate-400"}>
              {enCurso ? "En curso" : terminado ? `Terminado (${duracion})` : "Pendiente"}
            </dd>
          </div>
        </dl>

        <div className="mb-5 pb-5 border-b border-navy-800">
          <PartidoFotoUpload
            partidoId={partido.id}
            fotoUrl={fotoUrl}
            canUpload={!!tieneJugadores}
            onChange={onFotoChange}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSchedule}
            className="text-xs px-3 py-1.5 border border-navy-600 text-slate-300 hover:text-white rounded-lg"
          >
            📅 Programar
          </button>
          {tieneJugadores && !partido.started_at && !partido.ganador_id && (
            <button
              type="button"
              onClick={onIniciar}
              disabled={loading}
              className="text-xs px-3 py-1.5 border border-green-800 text-green-400 rounded-lg disabled:opacity-50"
            >
              ▶ Iniciar
            </button>
          )}
          {partido.started_at && !partido.ended_at && (
            <button
              type="button"
              onClick={onTerminar}
              disabled={loading}
              className="text-xs px-3 py-1.5 border border-red-800 text-red-400 rounded-lg disabled:opacity-50"
            >
              ■ Terminar
            </button>
          )}
          {tieneJugadores && (
            <button
              type="button"
              onClick={onResultado}
              className="text-xs px-3 py-1.5 border border-navy-600 text-ball rounded-lg"
            >
              {partido.ganador_id ? "Modificar resultado" : "Resultado →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartidosAdmin({
  partidos,
  numCanchas,
  torneoId,
  fechaInicioDefault,
  fechaFinDefault,
  asignablesCount = 0,
}: {
  partidos: Partido[];
  numCanchas?: number;
  torneoId?: string;
  fechaInicioDefault?: string;
  fechaFinDefault?: string;
  asignablesCount?: number;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<"tabla" | "calendario">("tabla");
  const [scheduleModal, setScheduleModal] = useState<Partido | null>(null);
  const [resultModal, setResultModal] = useState<Partido | null>(null);
  const [detallePartido, setDetallePartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [autoModal, setAutoModal] = useState(false);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(partidos.map((p) => [p.id, p.foto_url ?? null]))
  );

  function fotoUrlDe(p: Partido) {
    return fotoUrls[p.id] ?? p.foto_url ?? null;
  }

  function actualizarFoto(partidoId: string, url: string | null) {
    setFotoUrls((prev) => ({ ...prev, [partidoId]: url }));
    setDetallePartido((prev) => (prev?.id === partidoId ? { ...prev, foto_url: url } : prev));
  }

  async function patchPartido(id: string, body: Record<string, unknown>) {
    setLoading(id);
    await fetch(`/api/admin/partidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(null);
    router.refresh();
  }

  function iniciar(p: Partido) {
    patchPartido(p.id, { started_at: new Date().toISOString() });
  }

  function terminar(p: Partido) {
    patchPartido(p.id, { ended_at: new Date().toISOString() });
  }

  if (partidos.length === 0) {
    return <p className="text-slate-500">No hay partidos aún.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex rounded-lg border border-navy-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setVista("tabla")}
            className={`text-sm px-4 py-2 transition-colors ${
              vista === "tabla"
                ? "bg-court/15 text-court border-r border-navy-700"
                : "text-slate-400 hover:text-white border-r border-navy-700"
            }`}
          >
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setVista("calendario")}
            className={`text-sm px-4 py-2 transition-colors ${
              vista === "calendario"
                ? "bg-court/15 text-court"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Calendario
          </button>
        </div>

        {torneoId && asignablesCount > 0 && (
          <button
            onClick={() => setAutoModal(true)}
            className="text-sm px-4 py-2 border border-navy-600 text-slate-300 hover:border-navy-500 hover:text-white rounded-lg transition-colors"
          >
            📅 Programar automáticamente ({asignablesCount} partidos)
          </button>
        )}
      </div>

      {vista === "calendario" ? (
        <PartidosCalendario
          partidos={partidos}
          numCanchas={numCanchas}
          fechaInicio={fechaInicioDefault}
          fechaFin={fechaFinDefault}
          onSelectPartido={setDetallePartido}
        />
      ) : (
        <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-slate-500 text-left">
                <th className="px-4 py-3 font-normal">Categoría · Ronda</th>
                <th className="px-4 py-3 font-normal">Jugadores</th>
                <th className="px-4 py-3 font-normal">Hora · Cancha</th>
                <th className="px-4 py-3 font-normal">Duración</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {partidos.map((p) => {
                const fh = formatFechaHora(p.hora_inicio);
                const enCurso = !!p.started_at && !p.ended_at;
                const terminado = !!p.started_at && !!p.ended_at;
                const duracion = terminado ? formatDuracion(p.started_at!, p.ended_at!) : null;
                const tieneJugadores = p.jugador1 && p.jugador2;
                const isLoading = loading === p.id;
                const cat = p.cuadro?.categoria ?? "cuarta";
                const colors = colorCategoria(cat);

                return (
                  <tr key={p.id} className="hover:bg-navy-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 capitalize"
                        style={{ color: colors.text }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colors.border }}
                        />
                        {p.cuadro?.categoria}
                      </span>
                      <span className="text-slate-600 mx-1">·</span>
                      <span className="text-slate-400">
                        {RONDA_LABELS[p.ronda] ?? p.ronda}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {fotoUrlDe(p) && (
                        <span className="text-xs mr-1.5" title="Tiene foto">📷</span>
                      )}
                      {p.ganador_id ? (
                        <div className="flex flex-col gap-0.5">
                          <span>
                            <span className="text-court font-medium">
                              {p.ganador?.nombre} {p.ganador?.apellido}
                            </span>
                            <span className="text-slate-600 text-xs ml-1">ganó</span>
                          </span>
                          {(p.resultado as { j1: number; j2: number }[] | null)?.length ? (
                            <span className="text-ball font-bold text-xs tabular-nums">
                              {(p.resultado as { j1: number; j2: number }[])
                                .map((s) => `${s.j1}-${s.j2}`)
                                .join("  ")}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        (() => {
                          const { j1, j2 } = labelsForPartido(p);
                          return (
                            <span className="text-slate-300">
                              {j1}
                              <span className="text-slate-600 mx-1.5">vs</span>
                              {j2}
                            </span>
                          );
                        })()
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {fh ? (
                        <span>
                          <span className="text-ball font-medium">{fh.hora}</span>
                          <span className="text-slate-600 text-xs ml-1">{fh.fecha}</span>
                          {p.cancha && (
                            <span className="text-slate-500 text-xs ml-2">C{p.cancha}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {duracion ? (
                        <span className="text-court font-medium text-xs">{duracion}</span>
                      ) : enCurso ? (
                        <span className="text-red-400 text-xs font-medium animate-pulse">
                          En curso
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <button
                          onClick={() => setScheduleModal(p)}
                          className="text-xs px-2.5 py-1 border border-navy-600 text-slate-400 hover:border-navy-500 hover:text-white rounded-lg transition-colors"
                        >
                          📅
                        </button>

                        {tieneJugadores && !p.started_at && !p.ganador_id && (
                          <button
                            onClick={() => iniciar(p)}
                            disabled={isLoading}
                            className="text-xs px-2.5 py-1 border border-green-800 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? "..." : "▶ Iniciar"}
                          </button>
                        )}

                        {p.started_at && !p.ended_at && (
                          <button
                            onClick={() => terminar(p)}
                            disabled={isLoading}
                            className="text-xs px-2.5 py-1 border border-red-800 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? "..." : "■ Terminar"}
                          </button>
                        )}

                        {!p.ganador_id && tieneJugadores && (
                          <button
                            onClick={() => setResultModal(p)}
                            className="text-xs px-2.5 py-1 border border-navy-600 text-ball hover:border-ball/40 rounded-lg transition-colors"
                          >
                            Resultado →
                          </button>
                        )}

                        {p.ganador_id && tieneJugadores && (
                          <button
                            onClick={() => setResultModal(p)}
                            className="text-xs px-2.5 py-1 border border-navy-700 text-slate-400 hover:border-navy-500 hover:text-white rounded-lg transition-colors"
                          >
                            Modificar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detallePartido && (
        <PartidoDetallePanel
          partido={detallePartido}
          fotoUrl={fotoUrlDe(detallePartido)}
          loading={loading === detallePartido.id}
          onClose={() => setDetallePartido(null)}
          onSchedule={() => {
            setScheduleModal(detallePartido);
            setDetallePartido(null);
          }}
          onIniciar={() => {
            iniciar(detallePartido);
            setDetallePartido(null);
          }}
          onTerminar={() => {
            terminar(detallePartido);
            setDetallePartido(null);
          }}
          onResultado={() => {
            setResultModal(detallePartido);
            setDetallePartido(null);
          }}
          onFotoChange={(url) => actualizarFoto(detallePartido.id, url)}
        />
      )}

      {scheduleModal && (
        <ProgramarModal
          partidoId={scheduleModal.id}
          jugador1={labelsForPartido(scheduleModal).j1}
          jugador2={labelsForPartido(scheduleModal).j2}
          horaInicioActual={scheduleModal.hora_inicio}
          canchaActual={scheduleModal.cancha}
          numCanchas={numCanchas}
          onClose={() => setScheduleModal(null)}
          onSuccess={() => {
            setScheduleModal(null);
            router.refresh();
          }}
        />
      )}

      {autoModal && torneoId && (
        <ProgramarAutomaticoModal
          torneoId={torneoId}
          fechaInicioDefault={fechaInicioDefault}
          fechaFinDefault={fechaFinDefault}
          numCanchas={numCanchas}
          onClose={() => setAutoModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {resultModal && resultModal.jugador1 && resultModal.jugador2 && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setResultModal(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ResultForm
              partidoId={resultModal.id}
              jugador1={resultModal.jugador1}
              jugador2={resultModal.jugador2}
              initialGanadorId={resultModal.ganador_id ?? undefined}
              initialResultado={
                (resultModal.resultado as { j1: number; j2: number }[] | null) ?? undefined
              }
              onSuccess={() => {
                setResultModal(null);
                router.refresh();
              }}
            />
            <button
              onClick={() => setResultModal(null)}
              className="mt-3 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
