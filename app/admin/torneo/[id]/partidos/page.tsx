import { createClient } from "@/lib/supabase/server";
import PartidosAdmin from "./PartidosAdmin";

export default async function PartidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: torneo }, { data: cuadros }] = await Promise.all([
    supabase.from("torneo").select("club:club_id(num_canchas)").eq("id", id).single(),
    supabase.from("cuadro").select("id, categoria").eq("torneo_id", id),
  ]);

  if (!cuadros?.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Partidos</h1>
        <p className="text-slate-500">No hay cuadros generados aún.</p>
      </div>
    );
  }

  const cuadroIds = cuadros.map((c) => c.id);

  const { data: partidos } = await supabase
    .from("partido")
    .select(`
      id, ronda, posicion, cancha, hora_inicio, ganador_id, resultado, started_at, ended_at,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido),
      ganador:jugador!ganador_id(nombre, apellido),
      cuadro:cuadro_id(categoria)
    `)
    .in("cuadro_id", cuadroIds)
    .not("jugador1_id", "is", null)
    .not("jugador2_id", "is", null)
    .order("hora_inicio", { ascending: true, nullsFirst: false })
    .order("ronda")
    .order("posicion");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Partidos</h1>
      <PartidosAdmin partidos={(partidos ?? []) as any[]} numCanchas={(torneo as any)?.club?.num_canchas} torneoId={id} />
    </div>
  );
}
