import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import IniciarButton from "./IniciarButton";
import ConfirmarButton from "./ConfirmarButton";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};

export default async function TurnoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  if (jugador?.rol !== "admin" && jugador?.rol !== "turno") redirect("/");

  // Fetch active tournaments
  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, club:club_id(num_canchas)")
    .order("anio", { ascending: false });

  const torneoIds = (torneos ?? []).map((t) => t.id);

  const { data: cuadros } = torneoIds.length
    ? await supabase.from("cuadro").select("id, categoria, torneo_id").in("torneo_id", torneoIds)
    : { data: [] };

  const cuadroIds = (cuadros ?? []).map((c) => c.id);

  const { data: partidos, error: partidosError } = cuadroIds.length
    ? await supabase
        .from("partido")
        .select(`
          id, cuadro_id, ronda, posicion, resultado, ganador_id, resultado_confirmado,
          jugador1:jugador!jugador1_id(id, nombre, apellido),
          jugador2:jugador!jugador2_id(id, nombre, apellido)
        `)
        .in("cuadro_id", cuadroIds)
        .not("jugador1_id", "is", null)
        .not("jugador2_id", "is", null)
        .order("ronda")
        .order("posicion")
    : { data: [], error: null };

  const cuadroMap = Object.fromEntries((cuadros ?? []).map((c) => [c.id, c]));
  const torneoMap = Object.fromEntries((torneos ?? []).map((t) => [t.id, t]));

  // Build canchas list per torneo from club's num_canchas
  const canchasMap = Object.fromEntries(
    (torneos ?? []).map((t) => {
      const n = (t as any).club?.num_canchas ?? 0;
      return [t.id, Array.from({ length: n }, (_, i) => String(i + 1))];
    })
  );
  const todos = (partidos ?? []) as any[];

  if (partidosError) {
    return (
      <>
        <NavBar />
        <div className="max-w-2xl mx-auto px-5 py-8">
          <p className="text-red-400 text-sm font-mono">Error: {partidosError.message}</p>
          <p className="text-slate-500 text-xs mt-2">Es posible que falte aplicar migraciones pendientes en Supabase.</p>
        </div>
      </>
    );
  }
  const noIniciados = todos.filter((p) => p.resultado === null && !p.ganador_id);
  const enCurso = todos.filter((p) => p.resultado !== null && !p.ganador_id);
  const pendienteConfirmacion = todos.filter((p) => p.ganador_id && !p.resultado_confirmado);
  const finalizados = todos.filter((p) => p.ganador_id && p.resultado_confirmado);

  function PartidoFila({ p, acciones }: { p: any; acciones: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-3 px-4">
        <div>
          <div className="text-sm font-medium">
            {p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE"}
            <span className="text-slate-600 mx-2">vs</span>
            {p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 capitalize">
            {torneoMap[cuadroMap[p.cuadro_id]?.torneo_id]?.nombre}
            {" · "}{cuadroMap[p.cuadro_id]?.categoria}
            {" · "}{RONDA_LABELS[p.ronda] ?? p.ronda}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">{acciones}</div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-court text-xs font-bold uppercase tracking-widest mb-1">Panel de marcadores</p>
          <h1 className="text-2xl font-bold">Control de partidos</h1>
          {torneos?.[0] && (
            <p className="text-slate-500 text-sm mt-1">{torneos[0].nombre} · {torneos[0].anio}</p>
          )}
        </div>

        {todos.length === 0 && (
          <p className="text-slate-500">No hay partidos generados.</p>
        )}

        {/* En curso */}
        {enCurso.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">En curso</h2>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="bg-navy-900 border border-navy-700 rounded-xl divide-y divide-navy-800">
              {enCurso.map((p) => {
                const res = (p.resultado as { j1: number; j2: number }[]) ?? [];
                const ultimo = res[res.length - 1];
                return (
                  <PartidoFila
                    key={p.id}
                    p={p}
                    acciones={
                      <div className="flex items-center gap-3">
                        {ultimo && (
                          <span className="text-ball font-black text-base tabular-nums">
                            {ultimo.j1}–{ultimo.j2}
                          </span>
                        )}
                        <Link
                          href={`/live/${p.id}/control`}
                          className="px-3 py-1.5 border border-court text-court text-xs font-bold rounded-lg hover:bg-court/10 transition-colors"
                        >
                          Control →
                        </Link>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* No iniciados */}
        {noIniciados.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Pendientes</h2>
            <div className="bg-navy-900 border border-navy-700 rounded-xl divide-y divide-navy-800">
              {noIniciados.map((p) => (
                <PartidoFila
                  key={p.id}
                  p={p}
                  acciones={
                    <IniciarButton
                      partidoId={p.id}
                      canchas={canchasMap[cuadroMap[p.cuadro_id]?.torneo_id] ?? []}
                    />
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Pendiente de confirmación */}
        {pendienteConfirmacion.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Pendiente de confirmación</h2>
              <span className="w-2 h-2 bg-ball rounded-full animate-pulse" />
            </div>
            <div className="bg-navy-900 border border-ball/30 rounded-xl divide-y divide-navy-800">
              {pendienteConfirmacion.map((p) => {
                const res = (p.resultado as { j1: number; j2: number }[] | null) ?? [];
                return (
                  <PartidoFila
                    key={p.id}
                    p={p}
                    acciones={
                      <div className="flex items-center gap-3">
                        {res.length > 0 && (
                          <span className="text-ball font-bold text-sm tabular-nums">
                            {res.map((s: { j1: number; j2: number }) => `${s.j1}-${s.j2}`).join("  ")}
                          </span>
                        )}
                        <ConfirmarButton partidoId={p.id} />
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Finalizados */}
        {finalizados.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Finalizados</h2>
            <div className="bg-navy-900 border border-navy-800 rounded-xl divide-y divide-navy-800 opacity-60">
              {finalizados.map((p) => {
                const res = (p.resultado as { j1: number; j2: number }[] | null) ?? [];
                return (
                  <PartidoFila
                    key={p.id}
                    p={p}
                    acciones={
                      <div className="text-right">
                        {res.length > 0 && (
                          <div className="text-ball font-bold text-sm tabular-nums">
                            {res.map((s: { j1: number; j2: number }) => `${s.j1}-${s.j2}`).join("  ")}
                          </div>
                        )}
                        <span className="text-xs text-slate-600">Finalizado</span>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
