import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { contarAsignables, type PartidoScheduleInput } from "@/lib/scheduling/autoSchedule";
import PartidosAdmin from "@/app/admin/torneo/[id]/partidos/PartidosAdmin";

export default async function OrganizadorPartidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await requireTorneoAccess(id)) redirect("/organizador");

  const supabase = await createClient();

  const [{ data: torneo }, { data: cuadros }] = await Promise.all([
    supabase.from("torneo").select("nombre, fecha_inicio, fecha_fin, club:club_id(num_canchas)").eq("id", id).single(),
    supabase.from("cuadro").select("id, categoria, tamano").eq("torneo_id", id),
  ]);

  if (!torneo) notFound();

  if (!cuadros?.length) {
    return (
      <div>
        <Link href={`/organizador/torneo/${id}`} style={{ color: "#555" }} className="text-xs hover:text-white transition-colors">
          ← {(torneo as any).nombre}
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3 mb-4">Partidos</h1>
        <p className="text-slate-500">No hay cuadros generados aún.</p>
      </div>
    );
  }

  const cuadroIds = cuadros.map((c) => c.id);
  const { data: partidos } = await supabase
    .from("partido")
    .select(`
      id, cuadro_id, ronda, posicion, cancha, hora_inicio, ganador_id, resultado, started_at, ended_at,
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

  const asignablesCount = contarAsignables((partidos ?? []) as PartidoScheduleInput[]);

  return (
    <div>
      <Link href={`/organizador/torneo/${id}`} style={{ color: "#555" }} className="text-xs hover:text-white transition-colors">
        ← {(torneo as any).nombre}
      </Link>
      <h1 className="text-2xl font-bold text-white mt-3 mb-6">Partidos</h1>
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
