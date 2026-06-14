import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const CATEGORIAS = ["primera", "segunda", "tercera", "cuarta", "damas", "dobles"] as const;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, estado")
    .in("estado", ["activo", "cerrado"])
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false })
    .limit(1)
    .single();

  let proximosPartidos: any[] = [];

  if (torneo) {
    const { data: cuadros } = await supabase
      .from("cuadro")
      .select("id")
      .eq("torneo_id", torneo.id);

    if (cuadros?.length) {
      const cuadroIds = cuadros.map((c) => c.id);
      const { data } = await supabase
        .from("partido")
        .select(`
          id, ronda, cancha, hora_inicio,
          jugador1:jugador1_id (nombre, apellido),
          jugador2:jugador2_id (nombre, apellido),
          cuadro:cuadro_id (categoria)
        `)
        .in("cuadro_id", cuadroIds)
        .is("ganador_id", null)
        .not("jugador1_id", "is", null)
        .not("jugador2_id", "is", null)
        .not("hora_inicio", "is", null)
        .order("hora_inicio")
        .limit(10);
      proximosPartidos = (data as any[]) ?? [];
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🎾 Torneo Ciudad</h1>
        {torneo ? (
          <>
            <p className="text-gray-400">{torneo.nombre} · Edición {torneo.edicion} · {torneo.anio}</p>
            {torneo.estado === "activo" && (
              <Link
                href="/inscribirse"
                className="inline-block mt-4 px-6 py-2 bg-green-500 text-black font-bold rounded-full hover:bg-green-400 transition-colors"
              >
                Inscribirme
              </Link>
            )}
          </>
        ) : (
          <p className="text-gray-500">No hay torneos activos.</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Ver cuadros</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <Link
              key={c}
              href={`/bracket/${c}`}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-sm hover:border-green-500 hover:text-green-400 transition-colors capitalize"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {proximosPartidos.length > 0 && (
        <div>
          <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Próximos partidos</h2>
          <div className="space-y-2">
            {proximosPartidos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
              >
                <div className="text-sm">
                  <span className="text-gray-300">
                    {p.jugador1?.nombre} {p.jugador1?.apellido}
                  </span>
                  <span className="text-gray-600 mx-2">vs</span>
                  <span className="text-gray-300">
                    {p.jugador2?.nombre} {p.jugador2?.apellido}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500 ml-4">
                  <div className="text-yellow-400">
                    {p.hora_inicio
                      ? new Date(p.hora_inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </div>
                  <div className="capitalize">{p.cuadro?.categoria}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
