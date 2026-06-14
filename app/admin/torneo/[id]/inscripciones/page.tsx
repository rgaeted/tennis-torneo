import { createClient } from "@/lib/supabase/server";
import { InscripcionTable } from "@/components/admin/InscripcionTable";

export default async function InscripcionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripcion")
    .select("*, jugador(nombre, apellido)")
    .eq("torneo_id", id)
    .order("created_at", { ascending: false });

  const { data: torneo } = await supabase
    .from("torneo")
    .select("nombre, estado")
    .eq("id", id)
    .single();

  const pagados = (inscripciones ?? []).filter((i) => i.estado_pago === "pagado").length;
  const total = (inscripciones ?? []).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inscripciones</h1>
      <p className="text-gray-400 mb-6">{torneo?.nombre} · {pagados}/{total} confirmados</p>
      <InscripcionTable inscripciones={(inscripciones ?? []) as any} />
    </div>
  );
}
