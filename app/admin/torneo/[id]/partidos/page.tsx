import { createClient } from "@/lib/supabase/server";
import { ResultFormWrapper } from "@/components/admin/ResultFormWrapper";

export default async function PartidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cuadros } = await supabase
    .from("cuadro")
    .select("id, categoria")
    .eq("torneo_id", id);

  if (!cuadros?.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Partidos</h1>
        <p className="text-gray-500">No hay cuadros generados aún.</p>
      </div>
    );
  }

  const cuadroIds = cuadros.map((c) => c.id);

  const { data: partidos } = await supabase
    .from("partido")
    .select(`
      id, ronda, posicion, cancha, hora_inicio, ganador_id, resultado,
      jugador1:jugador1_id (id, nombre, apellido),
      jugador2:jugador2_id (id, nombre, apellido),
      cuadro:cuadro_id (categoria)
    `)
    .in("cuadro_id", cuadroIds)
    .is("ganador_id", null)
    .not("jugador1_id", "is", null)
    .not("jugador2_id", "is", null)
    .order("ronda")
    .order("posicion");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cargar resultados</h1>
      {(!partidos || partidos.length === 0) ? (
        <p className="text-gray-500">No hay partidos pendientes de resultado.</p>
      ) : (
        <div className="space-y-4">
          {(partidos as any[]).map((p) => (
            <div key={p.id}>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                {p.cuadro?.categoria} · {p.ronda?.replace("_", " ")}
              </p>
              <ResultFormWrapper
                partidoId={p.id}
                jugador1={p.jugador1}
                jugador2={p.jugador2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
