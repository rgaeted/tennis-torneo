import { createClient } from "@/lib/supabase/server";
import { contarAsignables, type PartidoScheduleInput } from "@/lib/scheduling/autoSchedule";
import PartidosAdmin from "./PartidosAdmin";

export default async function PartidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: torneo }, { data: cuadros }] = await Promise.all([
    supabase.from("torneo").select("fecha_inicio, fecha_fin, club:club_id(num_canchas)").eq("id", id).single(),
    supabase.from("cuadro").select("id, categoria, tamano").eq("torneo_id", id),
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
      id, cuadro_id, ronda, posicion, cancha, hora_inicio, ganador_id, resultado, started_at, ended_at, foto_url,
      jugador1_id, jugador2_id,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido),
      ganador:jugador!ganador_id(nombre, apellido),
      cuadro:cuadro_id(categoria, tamano)
    `)
    .in("cuadro_id", cuadroIds)
    .order("hora_inicio", { ascending: true, nullsFirst: false })
    .order("ronda")
    .order("posicion");

  const scheduleInput = (partidos ?? []) as PartidoScheduleInput[];
  const asignablesCount = contarAsignables(scheduleInput);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Partidos</h1>
      <PartidosAdmin
        partidos={(partidos ?? []) as any[]}
        numCanchas={(torneo as any)?.club?.num_canchas}
        torneoId={id}
        fechaInicioDefault={(torneo as any)?.fecha_inicio ?? ""}
        fechaFinDefault={(torneo as any)?.fecha_fin ?? ""}
        asignablesCount={asignablesCount}
      />
    </div>
  );
}
