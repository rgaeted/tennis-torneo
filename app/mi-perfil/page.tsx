import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import FotoUpload from "./FotoUpload";
import AmistosoForm from "./AmistosoForm";
import AmistososList from "./AmistososList";

const ESTADO_COLORS: Record<string, string> = {
  pagado: "bg-court/20 text-court",
  pendiente: "bg-ball/20 text-ball",
  rechazado: "bg-red-900/40 text-red-400",
};

export default async function MiPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase
    .from("jugador")
    .select("nombre, apellido, categoria_habitual, foto_url")
    .eq("id", user.id)
    .single();

  const { data: inscripciones } = await supabase
    .from("inscripcion")
    .select("id, categoria, estado_pago, monto, created_at, torneo_id, torneo:torneo_id(nombre, edicion, anio)")
    .eq("jugador_id", user.id)
    .order("created_at", { ascending: false });

  const { data: torneosActivos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, monto_inscripcion, categorias, imagen_url")
    .eq("estado", "activo")
    .order("anio", { ascending: false });

  const [{ data: jugadores }, { data: clubs }, { data: amistosos }] = await Promise.all([
    supabase
      .from("jugador")
      .select("id, nombre, apellido, categoria_habitual")
      .neq("id", user.id)
      .order("apellido"),
    supabase
      .from("club")
      .select("id, nombre, num_canchas")
      .order("nombre"),
    (supabase as any)
      .from("partido_amistoso")
      .select(`
        id, retador_id, cancha, fecha_hora, estado, partido_id, created_at,
        retador:retador_id(nombre, apellido),
        rival:rival_id(nombre, apellido),
        club:club_id(nombre)
      `)
      .or(`retador_id.eq.${user.id},rival_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
    <NavBar />
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header con foto */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
          <FotoUpload userId={user.id} fotoUrl={jugador?.foto_url ?? null} />
          <div>
            <h1 className="text-2xl font-bold">
              {jugador?.nombre} {jugador?.apellido}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{user.email}</p>
            {jugador?.categoria_habitual && (
              <p className="text-xs text-court capitalize mt-1">{jugador.categoria_habitual}</p>
            )}
          </div>
        </div>
        <Link
          href="/inscribirse"
          className="px-4 py-2 bg-court text-white font-bold rounded-lg text-sm hover:bg-court-dark transition-colors flex-shrink-0"
        >
          + Inscribirme
        </Link>
      </div>

      {/* Mis inscripciones */}
      <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Mis inscripciones</h2>
      {(!inscripciones || inscripciones.length === 0) ? (
        <p className="text-slate-600 text-sm mb-8">No estás inscrito a ningún torneo aún.</p>
      ) : (
        <div className="space-y-3 mb-10">
          {(inscripciones as any[]).map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between bg-navy-900 border border-navy-700 rounded-xl px-4 py-3"
            >
              <div>
                <div className="font-medium text-sm capitalize">
                  {i.torneo?.nombre} · {i.categoria}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Edición {i.torneo?.edicion} · {i.torneo?.anio} · ${i.monto}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[i.estado_pago] ?? ""}`}>
                {i.estado_pago}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Torneos disponibles */}
      {(torneosActivos ?? []).length > 0 && (
        <>
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Torneos disponibles</h2>
          <div className="space-y-3">
            {(() => {
              const catsPorTorneo: Record<string, Set<string>> = {};
              for (const i of (inscripciones as any[] ?? [])) {
                if (!catsPorTorneo[i.torneo_id]) catsPorTorneo[i.torneo_id] = new Set();
                catsPorTorneo[i.torneo_id].add(i.categoria);
              }
              return (torneosActivos as any[]).map((t) => {
              const inscritasEnTorneo = catsPorTorneo[t.id] ?? new Set();
              const yaInscripto = inscritasEnTorneo.size > 0;
              return (
                <div key={t.id} className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden flex">
                  {t.imagen_url && (
                    <img src={t.imagen_url} alt={t.nombre} className="w-24 object-cover flex-shrink-0" />
                  )}
                  <div className="flex items-center justify-between gap-4 px-4 py-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-white truncate">{t.nombre}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Edición {t.edicion} · {t.anio} · ${t.monto_inscripcion.toLocaleString("es-CL")}
                      </div>
                      {t.categorias?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.categorias.map((c: string) => {
                            const inscrito = inscritasEnTorneo.has(c);
                            return (
                              <span key={c} className={`px-1.5 py-0.5 rounded text-xs capitalize font-medium border ${
                                inscrito
                                  ? "bg-court/20 border-court/50 text-court"
                                  : "bg-navy-800 border-navy-700 text-slate-400"
                              }`}>
                                {c}{inscrito && " ✓"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {yaInscripto ? (
                      <span className="text-sm px-3 py-1.5 rounded-lg font-medium flex-shrink-0 bg-navy-800 border border-navy-700 text-slate-500 cursor-default">
                        Inscrito ✓
                      </span>
                    ) : (
                      <Link
                        href={`/inscribirse?torneo=${t.id}`}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium flex-shrink-0 bg-court text-white hover:bg-court-dark transition-colors"
                      >
                        Inscribirme
                      </Link>
                    )}
                  </div>
                </div>
              );
            });
            })()}
          </div>
        </>
      )}

      {/* Partidos amistosos */}
      <div className="mt-10">
        <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Desafiar rival</h2>
        <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
          <AmistosoForm
            jugadores={(jugadores ?? []) as any[]}
            clubs={(clubs ?? []) as any[]}
          />
        </div>
      </div>

      {(amistosos ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Mis amistosos</h2>
          <AmistososList amistosos={(amistosos ?? []) as any[]} userId={user.id} />
        </div>
      )}
    </div>
    </>
  );
}
