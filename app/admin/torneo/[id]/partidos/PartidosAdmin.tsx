"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgramarModal } from "@/components/admin/ProgramarModal";
import { ResultForm } from "@/components/admin/ResultForm";

type Jugador = { id: string; nombre: string; apellido: string };
type Partido = {
  id: string;
  ronda: string;
  posicion: number;
  cancha: string | null;
  hora_inicio: string | null;
  ganador_id: string | null;
  resultado: unknown;
  started_at: string | null;
  ended_at: string | null;
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  ganador: { nombre: string; apellido: string } | null;
  cuadro: { categoria: string } | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
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
    fecha: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
    hora: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function PartidosAdmin({ partidos, numCanchas }: { partidos: Partido[]; numCanchas?: number }) {
  const router = useRouter();
  const [scheduleModal, setScheduleModal] = useState<Partido | null>(null);
  const [resultModal, setResultModal] = useState<Partido | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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

              return (
                <tr key={p.id} className="hover:bg-navy-800/30 transition-colors">

                  {/* Categoría · Ronda */}
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    <span className="capitalize">{p.cuadro?.categoria}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    {RONDA_LABELS[p.ronda] ?? p.ronda}
                  </td>

                  {/* Jugadores */}
                  <td className="px-4 py-3">
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
                            {(p.resultado as { j1: number; j2: number }[]).map((s) => `${s.j1}-${s.j2}`).join("  ")}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-300">
                        {p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE"}
                        <span className="text-slate-600 mx-1.5">vs</span>
                        {p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE"}
                      </span>
                    )}
                  </td>

                  {/* Hora · Cancha */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fh ? (
                      <span>
                        <span className="text-ball font-medium">{fh.hora}</span>
                        <span className="text-slate-600 text-xs ml-1">{fh.fecha}</span>
                        {p.cancha && <span className="text-slate-500 text-xs ml-2">C{p.cancha}</span>}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>

                  {/* Duración */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {duracion ? (
                      <span className="text-court font-medium text-xs">{duracion}</span>
                    ) : enCurso ? (
                      <span className="text-red-400 text-xs font-medium animate-pulse">En curso</span>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => setScheduleModal(p)}
                        className="text-xs px-2.5 py-1 border border-navy-600 text-slate-400 hover:border-navy-500 hover:text-white rounded-lg transition-colors"
                      >
                        📅
                      </button>

                      {/* Iniciar partido */}
                      {tieneJugadores && !p.started_at && !p.ganador_id && (
                        <button
                          onClick={() => iniciar(p)}
                          disabled={isLoading}
                          className="text-xs px-2.5 py-1 border border-green-800 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isLoading ? "..." : "▶ Iniciar"}
                        </button>
                      )}

                      {/* Terminar partido */}
                      {p.started_at && !p.ended_at && (
                        <button
                          onClick={() => terminar(p)}
                          disabled={isLoading}
                          className="text-xs px-2.5 py-1 border border-red-800 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isLoading ? "..." : "■ Terminar"}
                        </button>
                      )}

                      {/* Registrar resultado */}
                      {!p.ganador_id && tieneJugadores && (
                        <button
                          onClick={() => setResultModal(p)}
                          className="text-xs px-2.5 py-1 border border-navy-600 text-ball hover:border-ball/40 rounded-lg transition-colors"
                        >
                          Resultado →
                        </button>
                      )}

                      {/* Modificar resultado existente */}
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

      {scheduleModal && (
        <ProgramarModal
          partidoId={scheduleModal.id}
          jugador1={scheduleModal.jugador1 ? `${scheduleModal.jugador1.nombre} ${scheduleModal.jugador1.apellido}` : "BYE"}
          jugador2={scheduleModal.jugador2 ? `${scheduleModal.jugador2.nombre} ${scheduleModal.jugador2.apellido}` : "BYE"}
          horaInicioActual={scheduleModal.hora_inicio}
          canchaActual={scheduleModal.cancha}
          numCanchas={numCanchas}
          onClose={() => setScheduleModal(null)}
          onSuccess={() => { setScheduleModal(null); router.refresh(); }}
        />
      )}

      {resultModal && resultModal.jugador1 && resultModal.jugador2 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setResultModal(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ResultForm
              partidoId={resultModal.id}
              jugador1={resultModal.jugador1}
              jugador2={resultModal.jugador2}
              initialGanadorId={resultModal.ganador_id ?? undefined}
              initialResultado={(resultModal.resultado as { j1: number; j2: number }[] | null) ?? undefined}
              onSuccess={() => { setResultModal(null); router.refresh(); }}
            />
            <button onClick={() => setResultModal(null)} className="mt-3 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
