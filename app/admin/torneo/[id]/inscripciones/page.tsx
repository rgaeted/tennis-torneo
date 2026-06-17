import { createClient, createAdminClient } from "@/lib/supabase/server";
import InscribirForm from "./InscribirForm";
import InscripcionesAdmin from "./InscripcionesAdmin";

export default async function InscripcionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: torneo }, { data: inscripciones }, { data: jugadores }] = await Promise.all([
    supabase.from("torneo").select("nombre, estado, monto_inscripcion, categorias").eq("id", id).single(),
    supabase.from("inscripcion").select("*, jugador:jugador_id(nombre, apellido)").eq("torneo_id", id).order("created_at", { ascending: false }),
    admin.from("jugador").select("id, nombre, apellido, categoria_habitual").order("apellido").order("nombre"),
  ]);

  const pagados = (inscripciones ?? []).filter((i) => i.estado_pago === "pagado").length;
  const total = (inscripciones ?? []).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Inscripciones</h1>
        <InscribirForm
          torneoId={id}
          jugadores={(jugadores ?? []) as any}
          montoDefault={torneo?.monto_inscripcion ?? 0}
          categorias={(torneo?.categorias ?? []) as any}
        />
      </div>
      <p className="text-slate-400 text-sm mb-6">
        {torneo?.nombre} · {pagados}/{total} confirmados
      </p>
      <InscripcionesAdmin inscripciones={(inscripciones ?? []) as any} categorias={(torneo?.categorias ?? []) as any} />
    </div>
  );
}
