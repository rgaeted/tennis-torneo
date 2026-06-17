"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgramarModal } from "@/components/admin/ProgramarModal";
import { ResultForm } from "@/components/admin/ResultForm";

type Jugador = { id: string; nombre: string; apellido: string };
type Set = { j1: number; j2: number };
type Partido = {
  id: string;
  ronda: string;
  cancha: string | null;
  hora_inicio: string | null;
  ganador_id: string | null;
  resultado: Set[] | null;
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  ganador: { nombre: string; apellido: string } | null;
};
type Cuadro = {
  id: string;
  categoria: string;
  partidos: Partido[];
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};
const RONDA_ORDER = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];

export default function PartidosPorCuadro({ cuadros, torneoId, numCanchas }: { cuadros: Cuadro[]; torneoId: string; numCanchas?: number }) {
  const router = useRouter();
  const [scheduleModal, setScheduleModal] = useState<Partido | null>(null);
  const [resultModal, setResultModal] = useState<Partido | null>(null);

  function formatResultado(sets: Set[] | null) {
    if (!sets?.length) return null;
    return sets.map((s) => `${s.j1}-${s.j2}`).join("  ");
  }

  function formatFechaHora(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return {
      fecha: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
      hora: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    };
  }

  if (cuadros.length === 0) {
    return <p className="text-slate-600 text-sm">No hay cuadros generados aún.</p>;
  }

  return (
    <>
      <div className="space-y-8">
        {cuadros.map((cuadro) => {
          const porRonda = RONDA_ORDER.reduce<Record<string, Partido[]>>((acc, r) => {
            const ps = cuadro.partidos.filter((p) => p.ronda === r && (p.jugador1 || p.jugador2));
            if (ps.length) acc[r] = ps;
            return acc;
          }, {});
          const rondas = Object.keys(porRonda);

          return (
            <div key={cuadro.id} className="bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden">
              {/* Header categoría */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-navy-800">
                <h3 className="font-bold capitalize text-white">{cuadro.categoria}</h3>
                <a
                  href={`/bracket/${cuadro.categoria}`}
                  className="text-xs text-slate-500 hover:text-court transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver cuadro →
                </a>
              </div>

              {rondas.length === 0 ? (
                <p className="px-5 py-4 text-slate-600 text-sm">Sin partidos asignados aún.</p>
              ) : (
                <div className="divide-y divide-navy-800">
                  {rondas.map((ronda) => (
                    <div key={ronda}>
                      {/* Ronda header */}
                      <div className="px-5 py-2 bg-navy-950/40">
                        <span className="text-xs font-semibold text-ball uppercase tracking-wider">
                          {RONDA_LABELS[ronda] ?? ronda}
                        </span>
                      </div>

                      {/* Partidos */}
                      {porRonda[ronda].map((p) => {
                        const fh = formatFechaHora(p.hora_inicio);
                        const finalizado = !!p.ganador_id;

                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-4 px-5 py-3 hover:bg-navy-800/30 transition-colors"
                          >
                            {/* Jugadores */}
                            <div className="flex-1 text-sm min-w-0">
                              {finalizado ? (
                                <span className="flex flex-col gap-0.5">
                                  <span>
                                    <span className="text-court font-medium">
                                      {p.ganador?.nombre} {p.ganador?.apellido}
                                    </span>
                                    <span className="text-slate-600 mx-2">vs</span>
                                    <span className="text-slate-600">
                                      {p.jugador1?.id === p.ganador_id
                                        ? (p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE")
                                        : (p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE")}
                                    </span>
                                  </span>
                                  {formatResultado(p.resultado) && (
                                    <span className="text-ball font-bold text-xs tabular-nums">
                                      {formatResultado(p.resultado)}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  {p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE"}
                                  <span className="text-slate-600 mx-2">vs</span>
                                  {p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE"}
                                </span>
                              )}
                            </div>

                            {/* Fecha / Hora / Cancha */}
                            <div className="flex items-center gap-3 text-xs flex-shrink-0">
                              {fh ? (
                                <>
                                  <span className="text-slate-400">{fh.fecha}</span>
                                  <span className="text-ball font-semibold">{fh.hora}</span>
                                </>
                              ) : (
                                <span className="text-slate-700">Sin horario</span>
                              )}
                              {p.cancha && (
                                <span className="text-slate-500">Cancha {p.cancha}</span>
                              )}
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => setScheduleModal(p)}
                                className="text-xs px-2.5 py-1 border border-navy-600 text-slate-400 hover:border-navy-500 hover:text-white rounded-lg transition-colors"
                              >
                                📅
                              </button>
                              {!finalizado && p.jugador1 && p.jugador2 && (
                                <button
                                  onClick={() => setResultModal(p)}
                                  className="text-xs px-2.5 py-1 border border-navy-600 text-ball hover:border-ball/40 rounded-lg transition-colors"
                                >
                                  Resultado →
                                </button>
                              )}
                              {finalizado && (
                                <span className="text-xs text-slate-600 px-2">Finalizado</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
