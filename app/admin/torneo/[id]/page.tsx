import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import EstadoSelector from "./EstadoSelector";
import CategoriasEditor from "./CategoriasEditor";
import TorneoDetalleEditor from "./TorneoDetalleEditor";
import ClubSelector from "./ClubSelector";
import OrganizacionSelector from "./OrganizacionSelector";
import PartidosPorCuadro from "./PartidosPorCuadro";

export default async function TorneoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("*, club:club_id(id, nombre, num_canchas), organizacion:organizacion_id(id, nombre)")
    .eq("id", id)
    .single();

  if (!torneo) return <p className="text-slate-500">Torneo no encontrado.</p>;

  const { data: clubs } = await supabase
    .from("club")
    .select("id, nombre, num_canchas")
    .order("nombre");

  const { data: orgs } = await supabase
    .from("organizacion")
    .select("id, nombre")
    .order("nombre");

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

  // Group partidos by cuadro
  const cuadrosConPartidos = (cuadros ?? []).map((c) => ({
    id: c.id,
    categoria: c.categoria,
    partidos: ((partidos ?? []) as any[]).filter((p) => p.cuadro?.id === c.id),
  }));

  const accesos = [
    { href: `/admin/torneo/${id}/inscripciones`, label: "Inscripciones" },
    { href: `/admin/torneo/${id}/cuadros`, label: "Cuadros" },
    { href: `/admin/torneo/${id}/partidos`, label: "Lista de partidos" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{torneo.nombre}</h1>
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
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Organización</p>
        <OrganizacionSelector
          torneoId={torneo.id}
          orgActual={(torneo as any).organizacion ?? null}
          orgs={(orgs ?? []) as any[]}
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Club</p>
        <ClubSelector
          torneoId={torneo.id}
          clubActual={(torneo as any).club ?? null}
          clubs={(clubs ?? []) as any[]}
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Categorías</p>
        <CategoriasEditor torneoId={torneo.id} categoriasActuales={(torneo.categorias ?? []) as any} />
      </div>

      <div className="mb-8 bg-navy-900 border border-navy-700 rounded-xl p-5">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Información pública</p>
        <TorneoDetalleEditor
          torneoId={torneo.id}
          inicial={{
            imagen_url: (torneo as any).imagen_url ?? "",
            descripcion: (torneo as any).descripcion ?? "",
          }}
        />
      </div>

      {/* Partidos por cuadro */}
      <PartidosPorCuadro cuadros={cuadrosConPartidos} torneoId={id} numCanchas={(torneo as any).club?.num_canchas} />
    </div>
  );
}
