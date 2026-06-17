import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import BracketConAdmin from "./BracketConAdmin";
import Link from "next/link";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};

function diaLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "HOY";
  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  return dias[d.getDay()];
}

export default async function BracketPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let esAdmin = false;
  if (user) {
    const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
    esAdmin = jugador?.rol === "admin";
  }

  const { data: cuadro } = await supabase
    .from("cuadro")
    .select("id, categoria, tamano, torneo:torneo_id(id, nombre, edicion, anio, estado, club:club_id(num_canchas))")
    .eq("categoria", categoria as any)
    .order("generado_en", { ascending: false })
    .limit(1)
    .single();

  if (!cuadro) {
    return (
      <>
        <NavBar />
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-2 capitalize">Categoría {categoria}</h1>
          <p className="text-slate-500">No hay cuadro generado para esta categoría aún.</p>
        </div>
      </>
    );
  }

  const { data: partidos } = await supabase
    .from("partido")
    .select(`
      id, ronda, posicion, jugador1_id, jugador2_id, ganador_id, hora_inicio, cancha, resultado,
      jugador1:jugador1_id(nombre, apellido),
      jugador2:jugador2_id(nombre, apellido)
    `)
    .eq("cuadro_id", cuadro.id)
    .order("ronda")
    .order("posicion");

  const torneo = cuadro.torneo as any;
  const todosPartidos = (partidos ?? []) as any[];

  const proximos = todosPartidos
    .filter(p => p.jugador1_id && p.jugador2_id && p.hora_inicio && !p.ganador_id)
    .sort((a: any, b: any) => new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime());

  const enVivo = todosPartidos.some(p => p.jugador1_id && p.jugador2_id && !p.ganador_id);
  const torneoActivo = torneo?.estado === "activo";

  return (
    <>
      <NavBar />
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 items-start">

          {/* ── IZQUIERDA: cuadro ─────────────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Cuadro final</h1>
                <p style={{ color: "#666" }} className="text-sm mt-1 capitalize">
                  {torneo?.nombre} · {categoria} · {torneo?.anio}
                </p>
              </div>
              {enVivo && (
                <div className="flex items-center gap-2 bg-red-900/40 border border-red-800 rounded-full px-3 py-1 flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-300 font-medium">En vivo</span>
                </div>
              )}
            </div>

            <BracketConAdmin
              partidos={todosPartidos}
              esAdmin={esAdmin}
              numCanchas={torneo?.club?.num_canchas}
            />
          </div>

          {/* ── DERECHA: sidebar ──────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 space-y-3 pt-1">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#555" }}>
              Próximos partidos
            </h2>

            {proximos.length === 0 ? (
              <p style={{ color: "#444" }} className="text-sm">Sin partidos programados.</p>
            ) : (
              proximos.map((p: any) => {
                const hora = new Date(p.hora_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
                const dia = diaLabel(p.hora_inicio);
                const j1 = p.jugador1 ? `${p.jugador1.nombre[0]}. ${p.jugador1.apellido}` : "—";
                const j2 = p.jugador2 ? `${p.jugador2.nombre[0]}. ${p.jugador2.apellido}` : "—";

                return (
                  <div
                    key={p.id}
                    style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                    className="rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    <div className="flex-shrink-0 text-center w-12">
                      <div style={{ color: "#C8FF00" }} className="text-xl font-black tabular-nums leading-none">
                        {hora}
                      </div>
                      <div style={{ color: "#555" }} className="text-[10px] font-semibold uppercase tracking-widest mt-0.5">
                        {dia}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-semibold truncate">
                        {j1} vs {j2}
                      </div>
                      <div style={{ color: "#555" }} className="text-xs mt-0.5 truncate">
                        {RONDA_LABELS[p.ronda] ?? p.ronda}
                        {p.cancha && ` · Cancha ${p.cancha}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {torneoActivo && (
              <div
                style={{ backgroundColor: "#161616", border: "1px solid #C8FF00" }}
                className="rounded-xl px-4 py-4 mt-2"
              >
                <p className="text-white font-bold text-sm mb-1">¿Juegas el próximo?</p>
                <p style={{ color: "#666" }} className="text-xs mb-3 leading-relaxed">
                  Las inscripciones están abiertas para este torneo.
                </p>
                <Link
                  href="/inscribirse"
                  style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                  className="block w-full text-center font-bold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Inscribirme ahora
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
