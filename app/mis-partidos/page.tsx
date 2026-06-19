import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";

const RONDA_LABEL: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos de final",
  semis: "Semifinal",
  final: "Final",
};

export default async function MisPartidosPage() {
  const supabase = await createClient();

  // getSession() reads from cookie — no network call; middleware already guards this route
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  // Fetch jugador profile and partidos in parallel
  const [jugadorRes, partidosRes] = await Promise.all([
    supabase.from("jugador").select("nombre, apellido").eq("id", user.id).single(),
    supabase
      .from("partido")
      .select(`
        id, ronda, resultado, ganador_id, hora_inicio,
        jugador1:jugador!jugador1_id(id, nombre, apellido),
        jugador2:jugador!jugador2_id(id, nombre, apellido),
        ganador:jugador!ganador_id(nombre, apellido),
        cuadro:cuadro_id(categoria, torneo:torneo_id(id, nombre, edicion, anio))
      `)
      .or(`jugador1_id.eq.${user.id},jugador2_id.eq.${user.id}`)
      .not("jugador1_id", "is", null)
      .not("jugador2_id", "is", null)
      .order("hora_inicio", { ascending: false, nullsFirst: false }),
  ]);

  const jugador = jugadorRes.data;
  const { data: partidos, error: partidosError } = partidosRes;

  const todos = (partidos ?? []) as any[];

  const jugado = (p: any) => !!(p.ganador_id || p.resultado);
  const proximos = todos.filter((p) => !jugado(p) && p.ronda !== "amistoso");
  const historial = todos.filter((p) => jugado(p) || p.ronda === "amistoso");

  function rival(p: any) {
    const esJ1 = p.jugador1?.id === user!.id;
    return esJ1 ? p.jugador2 : p.jugador1;
  }

  function gano(p: any) {
    return p.ganador_id === user!.id;
  }

  function formatFecha(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <>
      <NavBar />
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#0F0F0F", color: "#fff" }}
      >
        <div className="max-w-3xl mx-auto px-5 py-12">

          {/* Header */}
          <div className="mb-10">
            <p style={{ color: "#555" }} className="text-xs uppercase tracking-widest font-bold mb-2">
              {jugador?.nombre} {jugador?.apellido}
            </p>
            <h1 className="text-3xl font-black text-white">Mis partidos</h1>
          </div>

          {partidosError && (
            <div style={{ backgroundColor: "#1a0000", border: "1px solid #f87171" }} className="rounded-xl px-4 py-3 mb-6">
              <p className="text-red-400 text-xs font-mono">{partidosError.message}</p>
            </div>
          )}

          {!partidosError && todos.length === 0 && (
            <div
              style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
              className="rounded-2xl p-10 text-center"
            >
              <p style={{ color: "#555" }} className="text-sm">Aún no tienes partidos en torneos.</p>
              <Link
                href="/inscribirse"
                style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                className="inline-block mt-4 font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90"
              >
                Inscribirme a un torneo
              </Link>
            </div>
          )}

          {/* Próximos */}
          {proximos.length > 0 && (
            <section className="mb-10">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "#C8FF00" }}
              >
                Próximos
              </h2>
              <div className="space-y-3">
                {proximos.map((p) => {
                  const oponente = rival(p);
                  const cuadro = p.cuadro;
                  const torneo = cuadro?.torneo;
                  return (
                    <div
                      key={p.id}
                      style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                      className="rounded-2xl px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-white font-semibold text-sm">
                              vs {oponente?.nombre} {oponente?.apellido}
                            </span>
                            <span
                              style={{ color: "#888", backgroundColor: "#242424" }}
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            >
                              {RONDA_LABEL[p.ronda] ?? p.ronda}
                            </span>
                          </div>
                          <p style={{ color: "#555" }} className="text-xs">
                            {torneo?.nombre} · {cuadro?.categoria}
                          </p>
                          {p.hora_inicio && (
                            <p style={{ color: "#666" }} className="text-xs mt-0.5">
                              {formatFecha(p.hora_inicio)}
                            </p>
                          )}
                        </div>
                        {torneo?.id && (
                          <Link
                            href={`/bracket/${cuadro?.categoria}?torneo=${torneo.id}`}
                            style={{ color: "#555", border: "1px solid #2E2E2E" }}
                            className="text-xs px-3 py-1.5 rounded-lg hover:text-white hover:border-white/20 transition-colors flex-shrink-0"
                          >
                            Ver cuadro
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <section>
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "#555" }}
              >
                Historial
              </h2>
              <div className="space-y-3">
                {historial.map((p) => {
                  const oponente = rival(p);
                  const cuadro = p.cuadro;
                  const torneo = cuadro?.torneo;
                  const gane = gano(p);
                  const esAmistoso = p.ronda === "amistoso";
                  return (
                    <div
                      key={p.id}
                      style={{
                        backgroundColor: "#161616",
                        border: `1px solid ${gane ? "#C8FF0030" : "#242424"}`,
                      }}
                      className="rounded-2xl px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {p.ganador_id ? (
                              <span
                                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{
                                  color: gane ? "#C8FF00" : "#f87171",
                                  backgroundColor: gane ? "rgba(200,255,0,0.12)" : "rgba(248,113,113,0.12)",
                                }}
                              >
                                {gane ? "Victoria" : "Derrota"}
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{ color: "#888", backgroundColor: "#242424" }}
                              >
                                Jugado
                              </span>
                            )}
                            {!esAmistoso && (
                              <span style={{ color: "#555" }} className="text-[10px] uppercase tracking-wider">
                                {RONDA_LABEL[p.ronda] ?? p.ronda}
                              </span>
                            )}
                          </div>
                          <p className="text-white text-sm font-medium">
                            vs {oponente?.nombre} {oponente?.apellido}
                          </p>
                          <p style={{ color: "#555" }} className="text-xs mt-0.5">
                            {esAmistoso ? "Partido amistoso" : `${torneo?.nombre} · ${cuadro?.categoria}`}
                            {typeof p.resultado === "string" && ` · ${p.resultado}`}
                          </p>
                          {p.hora_inicio && (
                            <p style={{ color: "#444" }} className="text-xs mt-0.5">
                              {formatFecha(p.hora_inicio)}
                            </p>
                          )}
                        </div>
                        {torneo?.id && (
                          <Link
                            href={`/bracket/${cuadro?.categoria}?torneo=${torneo.id}`}
                            style={{ color: "#555", border: "1px solid #2E2E2E" }}
                            className="text-xs px-3 py-1.5 rounded-lg hover:text-white hover:border-white/20 transition-colors flex-shrink-0"
                          >
                            Ver cuadro
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
