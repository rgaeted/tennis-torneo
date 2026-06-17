import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import MiembrosPanel from "./MiembrosPanel";
import EliminarOrganizacion from "./EliminarOrganizacion";

export default async function OrganizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizacion")
    .select("id, nombre, created_at")
    .eq("id", id)
    .single();

  if (!org) notFound();

  const { data: miembros } = await supabase
    .from("jugador")
    .select("id, nombre, apellido, rol, categoria_habitual")
    .eq("organizacion_id", id)
    .order("apellido");

  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, estado")
    .eq("organizacion_id", id)
    .order("anio", { ascending: false });

  // Todos los jugadores sin organización (para poder agregar)
  const { data: jugadoresDisponibles } = await supabase
    .from("jugador")
    .select("id, nombre, apellido, rol")
    .is("organizacion_id", null)
    .neq("rol", "admin")
    .order("apellido");

  const ESTADO_COLOR: Record<string, string> = {
    activo: "#C8FF00",
    cerrado: "#555",
    borrador: "#888",
  };

  return (
    <div className="max-w-3xl space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/organizaciones" style={{ color: "#555" }} className="text-xs hover:text-white transition-colors">
            ← Organizaciones
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{org.nombre}</h1>
          <p style={{ color: "#555" }} className="text-xs mt-1">
            Creada el {new Date(org.created_at).toLocaleDateString("es-CL")}
          </p>
        </div>
        <EliminarOrganizacion id={id} nombre={org.nombre} />
      </div>

      {/* Miembros */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#555" }}>
          Organizadores ({(miembros ?? []).length})
        </h2>

        <MiembrosPanel
          orgId={id}
          miembros={miembros ?? []}
          disponibles={jugadoresDisponibles ?? []}
        />
      </section>

      {/* Torneos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#555" }}>
            Torneos ({(torneos ?? []).length})
          </h2>
          <Link
            href={`/admin/torneo/nuevo?org=${id}`}
            style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            + Nuevo torneo
          </Link>
        </div>

        {(torneos ?? []).length === 0 ? (
          <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-xl px-5 py-8 text-center">
            <p style={{ color: "#555" }} className="text-sm">Esta organización no tiene torneos aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(torneos ?? []).map((t) => (
              <Link
                key={t.id}
                href={`/admin/torneo/${t.id}`}
                style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                className="flex items-center justify-between rounded-xl px-5 py-3.5 hover:border-[#C8FF00]/40 transition-colors group"
              >
                <div>
                  <span className="text-white text-sm font-medium group-hover:text-[#C8FF00] transition-colors">
                    {t.nombre}
                  </span>
                  <span style={{ color: "#555" }} className="text-xs ml-2">
                    Ed. {t.edicion} · {t.anio}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: ESTADO_COLOR[t.estado] ?? "#555", backgroundColor: `${ESTADO_COLOR[t.estado] ?? "#555"}15` }}
                >
                  {t.estado}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
