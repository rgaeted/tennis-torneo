import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { ContenidoHub } from "@/components/instagram/ContenidoHub";
import type { JugadorStory, PartidoStoryRow } from "@/lib/instagram/types";

export default async function OrganizadorContenidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!await requireTorneoAccess(id)) redirect("/organizador");

  const supabase = await createClient();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("nombre, edicion, club:club_id(nombre, imagen_url)")
    .eq("id", id)
    .single();

  if (!torneo) notFound();

  const [{ data: cuadros }, { data: patrocinadores }, { data: inscripciones }] = await Promise.all([
    supabase.from("cuadro").select("id, categoria").eq("torneo_id", id),
    supabase
      .from("patrocinador_torneo")
      .select("id, nombre, logo_url, nivel, orden, activo")
      .eq("torneo_id", id)
      .order("nivel")
      .order("orden"),
    supabase
      .from("inscripcion")
      .select("categoria, jugador:jugador_id(id, nombre, apellido, foto_url)")
      .eq("torneo_id", id)
      .eq("estado_pago", "pagado"),
  ]);

  const cuadroIds = (cuadros ?? []).map((c) => c.id);

  const { data: partidosRaw } = cuadroIds.length
    ? await supabase
        .from("partido")
        .select(`
          id, ronda, posicion, ganador_id, resultado, jugador1_id, jugador2_id,
          jugador1:jugador!jugador1_id(id, nombre, apellido, foto_url),
          jugador2:jugador!jugador2_id(id, nombre, apellido, foto_url),
          cuadro:cuadro_id(categoria)
        `)
        .in("cuadro_id", cuadroIds)
    : { data: [] };

  const partidos = ((partidosRaw ?? []) as any[]).map((p) => ({
    id: p.id,
    ronda: p.ronda,
    posicion: p.posicion,
    ganador_id: p.ganador_id,
    resultado: p.resultado as { j1: number; j2: number }[] | null,
    jugador1_id: p.jugador1_id,
    jugador2_id: p.jugador2_id,
    jugador1: p.jugador1 as JugadorStory | null,
    jugador2: p.jugador2 as JugadorStory | null,
    categoria: p.cuadro?.categoria ?? "",
  })) as Array<PartidoStoryRow & { categoria: string }>;

  const inscritos = ((inscripciones ?? []) as any[])
    .filter((i) => i.jugador)
    .map((i) => ({
      categoria: i.categoria as string,
      jugador: i.jugador as JugadorStory,
    }));

  const club = (torneo as any)?.club;

  return (
    <div>
      <Link
        href={`/organizador/torneo/${id}`}
        style={{ color: "#555" }}
        className="text-xs hover:text-white transition-colors"
      >
        ← {(torneo as any).nombre}
      </Link>
      <h1 className="text-2xl font-bold text-white mt-3 mb-6">Contenido</h1>
      <ContenidoHub
        torneoId={id}
        torneoNombre={(torneo as any).nombre}
        torneoEdicion={(torneo as any).edicion}
        clubNombre={club?.nombre ?? null}
        clubImagenUrl={club?.imagen_url ?? null}
        patrocinadores={(patrocinadores ?? []) as any[]}
        partidos={partidos}
        inscritos={inscritos}
      />
    </div>
  );
}
