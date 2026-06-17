import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import NavBar from "@/components/NavBar";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};

export default async function LiveIndexPage() {
  const supabase = await createClient();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio")
    .eq("estado", "activo")
    .single();

  if (!torneo) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500">No hay torneo activo.</p>
        </div>
      </>
    );
  }

  const { data: cuadros } = await supabase
    .from("cuadro").select("id").eq("torneo_id", torneo.id);

  const cuadroIds = (cuadros ?? []).map((c) => c.id);

  const { data: partidos } = cuadroIds.length
    ? await supabase
        .from("partido")
        .select(`
          id, ronda, ganador_id, resultado,
          jugador1:jugador!jugador1_id(nombre, apellido),
          jugador2:jugador!jugador2_id(nombre, apellido),
          cuadro:cuadro_id(categoria)
        `)
        .in("cuadro_id", cuadroIds)
        .not("jugador1_id", "is", null)
        .not("jugador2_id", "is", null)
        .order("ronda")
        .order("posicion")
    : { data: [] };

  const activos = (partidos ?? []).filter((p) => !p.ganador_id);

  return (
    <>
    <NavBar />
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold">En Vivo</h1>
        {activos.length > 0 && (
          <span className="flex items-center gap-1.5 bg-red-900/30 border border-red-800 rounded-full px-2.5 py-0.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs font-medium">{activos.length} partidos</span>
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-8">{torneo.nombre} · {torneo.anio}</p>

      {activos.length === 0 ? (
        <p className="text-slate-500">No hay partidos en curso en este momento.</p>
      ) : (
        <div className="space-y-3">
          {(activos as any[]).map((p) => (
            <Link
              key={p.id}
              href={`/live/${p.id}`}
              className="flex items-center justify-between bg-navy-900 border border-navy-700 rounded-xl px-5 py-4 hover:border-red-800 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium">
                  {p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE"}
                  <span className="text-slate-600 mx-2">vs</span>
                  {p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 capitalize">
                  {p.cuadro?.categoria} · {RONDA_LABELS[p.ronda] ?? p.ronda}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-medium">Ver</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
    </>
  );
}
