"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Set = { j1: number; j2: number; tb?: { j1: number; j2: number } };
type Resultado = Set[];
type Partido = {
  id: string;
  ronda: string;
  cancha: string | null;
  hora_inicio: string | null;
  ganador_id: string | null;
  resultado: Resultado | null;
  jugador1_id: string;
  jugador2_id: string;
  jugador1: { nombre: string; apellido: string; foto_url: string | null } | null;
  jugador2: { nombre: string; apellido: string; foto_url: string | null } | null;
  cuadro: { categoria: string; torneo: { nombre: string; club: { nombre: string; imagen_url: string | null } | null } | null } | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};

function setsGanados(resultado: Resultado, player: "j1" | "j2"): number {
  return resultado.filter((s) => {
    const otro = player === "j1" ? "j2" : "j1";
    return s[player] > s[otro];
  }).length;
}

export default function LiveDisplayPage() {
  const { partidoId } = useParams<{ partidoId: string }>();
  const [partido, setPartido] = useState<Partido | null>(null);

  const fetchPartido = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("partido")
      .select(`
        id, ronda, cancha, hora_inicio, ganador_id, resultado, jugador1_id, jugador2_id,
        jugador1:jugador!jugador1_id(nombre, apellido, foto_url),
        jugador2:jugador!jugador2_id(nombre, apellido, foto_url),
        cuadro:cuadro_id(categoria, torneo:torneo_id(nombre, club:club_id(nombre, imagen_url)))
      `)
      .eq("id", partidoId)
      .single();
    if (data) setPartido(data as unknown as Partido);
  }, [partidoId]);

  useEffect(() => {
    fetchPartido();
    const interval = setInterval(fetchPartido, 3000);
    return () => clearInterval(interval);
  }, [fetchPartido]);

  // Supabase Realtime (si está habilitado en el dashboard)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`partido-live-${partidoId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "partido",
        filter: `id=eq.${partidoId}`,
      }, (payload) => {
        setPartido((prev) => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partidoId]);

  if (!partido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  const resultado: Resultado = partido.resultado ?? [{ j1: 0, j2: 0 }];
  const j1Sets = setsGanados(resultado, "j1");
  const j2Sets = setsGanados(resultado, "j2");
  const isFinished = !!partido.ganador_id;
  const j1Won = partido.ganador_id === partido.jugador1_id;
  const j2Won = partido.ganador_id === partido.jugador2_id;
  const club = partido.cuadro?.torneo?.club ?? null;

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col select-none">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          {club?.imagen_url && (
            <img src={club.imagen_url} alt={club.nombre} className="h-9 w-14 object-cover rounded-md flex-shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold text-court tracking-widest uppercase">MisTorneos.cl</div>
            <div className="text-xs text-slate-500 leading-tight flex flex-wrap gap-x-2">
              {club && <span>{club.nombre}</span>}
              {partido.cancha && <span>· Cancha {partido.cancha}</span>}
              {partido.hora_inicio && (
                <span>· {new Date(partido.hora_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Finalizado</span>
          ) : (
            <>
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-sm font-bold tracking-widest uppercase">En Vivo</span>
            </>
          )}
        </div>
      </div>

      {/* Category & round */}
      <div className="text-center pt-8 pb-2">
        <span className="text-slate-500 text-xs uppercase tracking-[0.3em]">
          {partido.cuadro?.categoria} · {RONDA_LABELS[partido.ronda] ?? partido.ronda}
        </span>
      </div>

      {/* Main scoreboard */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="w-full max-w-5xl">

          {/* Jugador 1 */}
          <div className="flex items-center mb-6">
            <div className="flex-1 pr-8 flex items-center gap-6">
              {partido.jugador1?.foto_url ? (
                <img
                  src={partido.jugador1.foto_url}
                  alt=""
                  className={`w-20 h-20 md:w-28 md:h-28 rounded-full object-cover flex-shrink-0 border-4
                    ${j1Won ? "border-court" : j2Won ? "border-navy-700 opacity-40" : "border-navy-700"}`}
                />
              ) : (
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex-shrink-0 border-4 bg-navy-800 flex items-center justify-center
                  ${j1Won ? "border-court" : j2Won ? "border-navy-700 opacity-40" : "border-navy-700"}`}>
                  <span className={`text-3xl md:text-4xl font-black
                    ${j1Won ? "text-court" : j2Won ? "text-slate-700" : "text-slate-600"}`}>
                    {partido.jugador1?.nombre?.[0]}
                  </span>
                </div>
              )}
              <div>
                <div className={`text-5xl md:text-7xl font-black uppercase tracking-tight leading-none
                  ${j1Won ? "text-court" : j2Won ? "text-slate-600" : "text-white"}`}>
                  {partido.jugador1?.nombre}
                </div>
                <div className={`text-3xl md:text-5xl font-black uppercase tracking-tight
                  ${j1Won ? "text-court" : j2Won ? "text-slate-600" : "text-slate-300"}`}>
                  {partido.jugador1?.apellido}
                </div>
              </div>
            </div>

            {/* Scores J1 */}
            <div className="flex gap-3 items-center">
              {resultado.map((set, i) => {
                const isCurrent = !isFinished && i === resultado.length - 1;
                const isTB = set.tb && (set.j1 === 7 && set.j2 === 6 || set.j1 === 6 && set.j2 === 7);
                const tbLoser = isTB ? (set.j1 < set.j2 ? set.tb!.j1 : null) : null;
                return (
                  <div key={i} className={`flex flex-col items-center
                    ${isCurrent ? "opacity-100" : "opacity-60"}`}>
                    <span className={`text-5xl md:text-8xl font-black leading-none tabular-nums
                      ${isCurrent ? "text-ball" : "text-slate-400"}`}>
                      {set.j1}
                    </span>
                    {tbLoser !== null && (
                      <span className="text-xs text-slate-500 tabular-nums">({tbLoser})</span>
                    )}
                    {resultado.length > 1 && (
                      <span className="text-xs text-slate-600 mt-1">Set {i + 1}</span>
                    )}
                  </div>
                );
              })}
              <div className="ml-4 text-4xl md:text-6xl font-black text-court">
                {j1Sets}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-navy-700 mb-6" />

          {/* Jugador 2 */}
          <div className="flex items-center">
            <div className="flex-1 pr-8 flex items-center gap-6">
              {partido.jugador2?.foto_url ? (
                <img
                  src={partido.jugador2.foto_url}
                  alt=""
                  className={`w-20 h-20 md:w-28 md:h-28 rounded-full object-cover flex-shrink-0 border-4
                    ${j2Won ? "border-court" : j1Won ? "border-navy-700 opacity-40" : "border-navy-700"}`}
                />
              ) : (
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex-shrink-0 border-4 bg-navy-800 flex items-center justify-center
                  ${j2Won ? "border-court" : j1Won ? "border-navy-700 opacity-40" : "border-navy-700"}`}>
                  <span className={`text-3xl md:text-4xl font-black
                    ${j2Won ? "text-court" : j1Won ? "text-slate-700" : "text-slate-600"}`}>
                    {partido.jugador2?.nombre?.[0]}
                  </span>
                </div>
              )}
              <div>
                <div className={`text-5xl md:text-7xl font-black uppercase tracking-tight leading-none
                  ${j2Won ? "text-court" : j1Won ? "text-slate-600" : "text-white"}`}>
                  {partido.jugador2?.nombre}
                </div>
                <div className={`text-3xl md:text-5xl font-black uppercase tracking-tight
                  ${j2Won ? "text-court" : j1Won ? "text-slate-600" : "text-slate-300"}`}>
                  {partido.jugador2?.apellido}
                </div>
              </div>
            </div>

            {/* Scores J2 */}
            <div className="flex gap-3 items-center">
              {resultado.map((set, i) => {
                const isCurrent = !isFinished && i === resultado.length - 1;
                const isTB = set.tb && (set.j1 === 7 && set.j2 === 6 || set.j1 === 6 && set.j2 === 7);
                const tbLoser = isTB ? (set.j2 < set.j1 ? set.tb!.j2 : null) : null;
                return (
                  <div key={i} className={`flex flex-col items-center
                    ${isCurrent ? "opacity-100" : "opacity-60"}`}>
                    <span className={`text-5xl md:text-8xl font-black leading-none tabular-nums
                      ${isCurrent ? "text-ball" : "text-slate-400"}`}>
                      {set.j2}
                    </span>
                    {tbLoser !== null && (
                      <span className="text-xs text-slate-500 tabular-nums">({tbLoser})</span>
                    )}
                    {resultado.length > 1 && (
                      <span className="text-xs text-slate-600 mt-1">Set {i + 1}</span>
                    )}
                  </div>
                );
              })}
              <div className="ml-4 text-4xl md:text-6xl font-black text-court">
                {j2Sets}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-8 py-4 border-t border-navy-800">
        <Link href="/" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
          ← Inicio
        </Link>
        {!isFinished && (
          <Link
            href={`/live/${partidoId}/control`}
            className="text-sm text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Actualizar marcador →
          </Link>
        )}
      </div>
    </div>
  );
}
