import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import AmistososPanel from "@/components/AmistososPanel";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda", segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos", semis: "Semifinal", final: "Final",
};

export default async function HomePage() {
  const supabase = await createClient();

  // getSession() reads from cookie — no network call to Supabase Auth
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Fire all independent queries in parallel.
  // Nested select collapses torneos → cuadros → partidos into a single round-trip.
  const [torneosRes, amistososPublicosRes, userDataRes] = await Promise.all([
    supabase
      .from("torneo")
      .select(`
        id, nombre, edicion, anio, estado, imagen_url, descripcion,
        cuadros:cuadro(
          id, categoria, torneo_id,
          partidos:partido(
            id, ronda, cancha, resultado, ganador_id,
            jugador1:jugador!jugador1_id(nombre, apellido),
            jugador2:jugador!jugador2_id(nombre, apellido)
          )
        )
      `)
      .in("estado", ["activo", "cerrado"])
      .order("anio", { ascending: false })
      .order("edicion", { ascending: false }),

    supabase
      .from("partido")
      .select(`
        id, ronda, cancha, resultado,
        jugador1:jugador!jugador1_id(nombre, apellido),
        jugador2:jugador!jugador2_id(nombre, apellido)
      `)
      .is("cuadro_id", null)
      .is("ganador_id", null)
      .not("resultado", "is", null),

    user
      ? Promise.all([
          (supabase as any)
            .from("partido_amistoso")
            .select("*, retador:retador_id(nombre, apellido), rival:rival_id(nombre, apellido)")
            .or(`retador_id.eq.${user.id},rival_id.eq.${user.id}`)
            .in("estado", ["pendiente", "aceptado", "en_curso"])
            .order("created_at", { ascending: false }),
          supabase.from("jugador").select("id, nombre, apellido").neq("id", user.id).order("apellido"),
          supabase.from("club").select("id, nombre").order("nombre"),
        ])
      : Promise.resolve(null),
  ]);

  // Derive cuadros and partidos from nested torneos response
  const torneosConCuadros = (torneosRes.data ?? []) as any[];
  const torneoIds = torneosConCuadros.map((t) => t.id);
  const allCuadros = torneosConCuadros.flatMap((t: any) => t.cuadros ?? []);

  const cuadrosPorTorneo: Record<string, string[]> = {};
  for (const c of allCuadros) {
    if (!cuadrosPorTorneo[c.torneo_id]) cuadrosPorTorneo[c.torneo_id] = [];
    cuadrosPorTorneo[c.torneo_id].push(c.categoria);
  }

  const allTorneoPartidos = allCuadros.flatMap((c: any) =>
    (c.partidos ?? []).map((p: any) => ({
      ...p,
      cuadro: { categoria: c.categoria, torneo_id: c.torneo_id },
    }))
  );

  const partidosEnVivo = [
    ...allTorneoPartidos.filter((p: any) => !p.ganador_id && p.resultado !== null && p.jugador1 && p.jugador2),
    ...((amistososPublicosRes.data ?? []) as any[]),
  ];

  // Strip cuadros from torneos for display
  const torneos = torneosConCuadros.map(({ cuadros: _c, ...t }: any) => t);
  const torneosActivos = torneos.filter((t: any) => t.estado === "activo");

  // misInscripciones depends on torneoIds — run after torneos resolves
  const { data: misInscripciones } = user && torneoIds.length
    ? await supabase
        .from("inscripcion")
        .select("torneo_id")
        .eq("jugador_id", user.id)
        .in("torneo_id", torneoIds)
    : { data: [] };

  const inscritoEnTorneoIds = new Set((misInscripciones ?? []).map((i) => i.torneo_id));
  const torneosActivosSinInscripcion = torneosActivos.filter((t: any) => !inscritoEnTorneoIds.has(t.id));

  let misAmistosos: any[] = [];
  let todosJugadores: any[] = [];
  let clubsLista: any[] = [];

  if (userDataRes) {
    const [amistososRes, jugadoresRes, clubsRes] = userDataRes;
    misAmistosos = amistososRes.data ?? [];
    todosJugadores = jugadoresRes.data ?? [];
    clubsLista = clubsRes.data ?? [];
  }

  return (
    <>
      <NavBar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#c5dc14 1px, transparent 1px), linear-gradient(90deg, #c5dc14 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-court/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-court/10 border border-court/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-court rounded-full" />
            <span className="text-court text-xs font-semibold uppercase tracking-widest">El portal del Tenis Chileno</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">Mis</span><span className="text-court">Torneos.cl</span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10">
            Gestión de torneos, cuadros en tiempo real y marcadores en vivo para el tenis chileno.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {torneosActivosSinInscripcion.length > 0 ? (
              <Link
                href="/inscribirse"
                className="bg-court text-navy-950 font-bold px-6 py-3 rounded-xl hover:bg-court-dark transition-colors text-sm"
              >
                Inscribirme en un torneo
              </Link>
            ) : !user ? (
              <Link
                href="/login?tab=registro"
                className="bg-court text-navy-950 font-bold px-6 py-3 rounded-xl hover:bg-court-dark transition-colors text-sm"
              >
                Crear cuenta
              </Link>
            ) : null}
            <a
              href="#torneos"
              className="border border-navy-700 text-slate-300 font-medium px-6 py-3 rounded-xl hover:border-navy-600 hover:text-white transition-colors text-sm"
            >
              Ver torneos
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section className="border-t border-navy-800 bg-navy-950/60">
        <div className="max-w-4xl mx-auto px-5 py-16 grid sm:grid-cols-3 gap-6">

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-court/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-court" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-bold text-white mb-2">Sigue tu cuadro</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Consulta tu posición en el cuadro, conoce a tu próximo rival y sigue cómo avanza el torneo en tiempo real.
            </p>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center mb-4">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <h3 className="font-bold text-white mb-2">Marcador en vivo</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sigue los partidos en tiempo real desde cualquier dispositivo. Marcador actualizado set a set.
            </p>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-ball/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-ball" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-white mb-2">Partidos amistosos</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Desafía a otros jugadores a partidos amistosos, acuerda club, cancha y horario, y juega con marcador oficial.
            </p>
          </div>

        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 py-10 space-y-12">

        {/* ── EN VIVO ─────────────────────────────────────────────── */}
        {partidosEnVivo.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">En vivo</h2>
              <span className="flex items-center gap-1.5 bg-red-900/30 border border-red-800 rounded-full px-2.5 py-0.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-medium">{partidosEnVivo.length} partido{partidosEnVivo.length !== 1 ? "s" : ""}</span>
              </span>
            </div>

            <div className="space-y-3">
              {partidosEnVivo.map((p: any) => {
                const res = (p.resultado as { j1: number; j2: number }[]) ?? [];
                return (
                  <Link
                    key={p.id}
                    href={`/live/${p.id}`}
                    className="flex items-center justify-between bg-navy-900 border border-navy-700 rounded-xl px-5 py-4 hover:border-red-800 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium mb-0.5">
                        {p.jugador1 ? `${p.jugador1.nombre} ${p.jugador1.apellido}` : "BYE"}
                        <span className="text-slate-600 mx-2">vs</span>
                        {p.jugador2 ? `${p.jugador2.nombre} ${p.jugador2.apellido}` : "BYE"}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {p.cuadro ? `${p.cuadro.categoria} · ${RONDA_LABELS[p.ronda] ?? p.ronda}` : "Amistoso"}
                        {p.cancha && <span className="ml-2">· Cancha {p.cancha}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {res.length > 0 && (
                        <div className="text-ball font-black text-lg tabular-nums">
                          {res.map((s, i) => (
                            <span key={i} className={i < res.length - 1 ? "opacity-50 text-sm mr-1" : ""}>
                              {s.j1}–{s.j2}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-xs font-medium">Ver</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}


        {/* ── TORNEOS ─────────────────────────────────────────────── */}
        <section id="torneos">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-5">Torneos</h2>

          {(torneos ?? []).length === 0 ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl px-6 py-10 text-center">
              <p className="text-slate-600 text-sm">No hay torneos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(torneos ?? []).map((t) => {
                const cats = cuadrosPorTorneo[t.id] ?? [];
                const esActivo = t.estado === "activo";
                return (
                  <div key={t.id} className="bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden">
                    <div className="flex">
                      {(t as any).imagen_url && (
                        <div className="w-28 sm:w-36 flex-shrink-0">
                          <img
                            src={(t as any).imagen_url}
                            alt={t.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white">{t.nombre}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                esActivo ? "bg-court/20 text-court" : "bg-slate-800 text-slate-500"
                              }`}>
                                {esActivo ? "Activo" : "Cerrado"}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">
                              Edición {t.edicion} · {t.anio}
                            </p>
                            {(t as any).descripcion && (
                              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{(t as any).descripcion}</p>
                            )}
                          </div>
                          {esActivo && !inscritoEnTorneoIds.has(t.id) && (
                            <Link
                              href="/inscribirse"
                              className="text-sm bg-court text-navy-950 px-3 py-1.5 rounded-lg hover:bg-court-dark transition-colors font-medium flex-shrink-0"
                            >
                              Inscribirme
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {cats.length > 0 && (
                      <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-navy-800 pt-3">
                        <span className="text-xs text-slate-600 self-center mr-1">Cuadros:</span>
                        {cats.map((c) => (
                          <Link
                            key={c}
                            href={`/bracket/${c}`}
                            className="px-3 py-1 bg-navy-800 border border-navy-700 rounded-full text-xs hover:border-court hover:text-court transition-colors capitalize"
                          >
                            {c}
                          </Link>
                        ))}
                      </div>
                    )}

                    {cats.length === 0 && (
                      <div className="px-5 pb-4 border-t border-navy-800 pt-3">
                        <p className="text-xs text-slate-700">Cuadros no generados aún.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* ── GESTIONAR ─────────────────────────────────────────────── */}
      <section id="organizadores" style={{ borderTop: "1px solid #1E1E1E" }}>
        <div className="max-w-5xl mx-auto px-5 py-20">

          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
              La plataforma para <span style={{ color: "#C8FF00" }}>todo</span> el tenis chileno
            </h2>
            <p style={{ color: "#666" }} className="text-sm max-w-md mx-auto">
              Gratis para jugadores que quieren organizar sus partidos. Para clubes y organizadores, gestión completa de torneos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">

            {/* ── JUGADORES (gratis) ── */}
            <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ border: "1px solid #444", color: "#888" }}
                >
                  Para jugadores
                </div>
                <span style={{ color: "#C8FF00" }} className="text-xs font-bold">Gratis</span>
              </div>

              <h3 className="text-xl font-black text-white mt-4 mb-2">
                Organiza tu partido amistoso
              </h3>
              <p style={{ color: "#666" }} className="text-sm leading-relaxed mb-6">
                Desafía a cualquier jugador registrado, coordina club, cancha y horario, y sigue el marcador en vivo desde cualquier dispositivo.
              </p>

              {user ? (
                <AmistososPanel
                  userId={user.id}
                  amistosos={misAmistosos}
                  jugadores={todosJugadores}
                  clubs={clubsLista}
                />
              ) : (
                <div style={{ backgroundColor: "#0F0F0F", border: "1px solid #242424" }} className="rounded-xl p-5 text-center">
                  <p style={{ color: "#555" }} className="text-sm mb-4">Crea una cuenta gratuita para organizar tus partidos amistosos.</p>
                  <Link
                    href="/login?tab=registro"
                    style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                    className="inline-block font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
                  >
                    Crear cuenta gratis
                  </Link>
                </div>
              )}
            </div>

            {/* ── ORGANIZADORES (pago) ── */}
            <div
              style={{ backgroundColor: "#161616", border: "1px solid #C8FF0030" }}
              className="rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ border: "1px solid #C8FF00", color: "#C8FF00", backgroundColor: "rgba(200,255,0,0.06)" }}
                >
                  Para organizadores
                </div>
              </div>

              <h3 className="text-xl font-black text-white mt-4 mb-2">
                Gestiona tu torneo<br />desde un solo lugar
              </h3>
              <p style={{ color: "#666" }} className="text-sm leading-relaxed mb-6">
                Diseñado para clubes y organizadores de tenis en Chile. Crea torneos, administra inscripciones y genera cuadros en minutos.
              </p>

              <div className="space-y-4 mb-6">
                {[
                  { title: "Crea y configura torneos", desc: "Define categorías, fechas y cupos en minutos." },
                  { title: "Gestiona inscripciones", desc: "Acepta inscripciones y controla el estado de cada jugador." },
                  { title: "Cuadros automáticos", desc: "Genera cuadros de eliminación con un clic, con soporte para byes." },
                  { title: "Control de partidos en vivo", desc: "Actualiza resultados en tiempo real desde la cancha." },
                  { title: "Ranking por organización", desc: "Puntos automáticos por categoría y torneo para tus jugadores." },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-2.5">
                    <span style={{ color: "#C8FF00" }} className="mt-0.5 flex-shrink-0 text-sm">✓</span>
                    <div>
                      <p className="text-white text-sm font-medium">{f.title}</p>
                      <p style={{ color: "#555" }} className="text-xs mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="mailto:contacto@mistorneos.cl"
                style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                className="inline-block font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity w-full text-center"
              >
                Contactar
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid #1E1E1E" }} className="px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs max-w-5xl mx-auto">
        <span style={{ color: "#555" }}><span style={{ color: "#C8FF00" }}>●</span> MisTorneos.cl</span>
        <span style={{ color: "#555" }}>Plataforma de torneos de tenis en Chile</span>
      </footer>
    </>
  );
}
