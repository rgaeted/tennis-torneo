import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import EstadoSelector from "@/app/admin/torneo/[id]/EstadoSelector";
import CategoriasEditor from "@/app/admin/torneo/[id]/CategoriasEditor";
import PartidosPorCuadro from "@/app/admin/torneo/[id]/PartidosPorCuadro";

export default async function OrganizadorTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!await requireTorneoAccess(id)) redirect("/organizador");

  const supabase = await createClient();
  const { data: torneo } = await supabase
    .from("torneo")
    .select("*, club:club_id(id, nombre, num_canchas)")
    .eq("id", id)
    .single();

  if (!torneo) notFound();

  const { data: cuadros } = await supabase
    .from("cuadro")
    .select("id, categoria")
    .eq("torneo_id", id)
    .order("categoria");

  const cuadroIds = (cuadros ?? []).map((c) => c.id);

  const { data: partidos } = cuadroIds.length
    ? await supabase
        .from("partido")
        .select(`
          id, ronda, posicion, cancha, hora_inicio, ganador_id, resultado,
          jugador1:jugador!jugador1_id(id, nombre, apellido),
          jugador2:jugador!jugador2_id(id, nombre, apellido),
          ganador:jugador!ganador_id(nombre, apellido),
          cuadro:cuadro_id(id, categoria)
        `)
        .in("cuadro_id", cuadroIds)
        .order("ronda")
        .order("posicion")
    : { data: [] };

  const cuadrosConPartidos = (cuadros ?? []).map((c) => ({
    id: c.id,
    categoria: c.categoria,
    partidos: ((partidos ?? []) as any[]).filter((p) => p.cuadro?.id === c.id),
  }));

  const accesos = [
    { href: `/organizador/torneo/${id}/inscripciones`, label: "Inscripciones" },
    { href: `/organizador/torneo/${id}/cuadros`, label: "Cuadros" },
    { href: `/organizador/torneo/${id}/partidos`, label: "Lista de partidos" },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/organizador" style={{ color: "#555" }} className="text-xs hover:text-white transition-colors">
            ← Torneos
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{torneo.nombre}</h1>
          <p className="text-slate-500 text-sm">
            Edición {torneo.edicion} · {torneo.anio} · ${torneo.monto_inscripcion.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {accesos.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-slate-400 hover:text-white hover:border-navy-500 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <EstadoSelector torneoId={torneo.id} estadoActual={torneo.estado} />
      </div>

      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Categorías</p>
        <CategoriasEditor torneoId={torneo.id} categoriasActuales={(torneo.categorias ?? []) as any} />
      </div>

      <PartidosPorCuadro cuadros={cuadrosConPartidos} torneoId={id} numCanchas={(torneo as any).club?.num_canchas} />
    </div>
  );
}
