import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TorneoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("*")
    .eq("id", id)
    .single();

  if (!torneo) return <p className="text-gray-500">Torneo no encontrado.</p>;

  const secciones = [
    { href: `/admin/torneo/${id}/inscripciones`, label: "📋 Inscripciones", desc: "Ver y gestionar inscripciones y pagos" },
    { href: `/admin/torneo/${id}/cuadros`, label: "🗂 Cuadros", desc: "Generar y ver los cuadros por categoría" },
    { href: `/admin/torneo/${id}/partidos`, label: "⚡ Partidos", desc: "Programar partidos y cargar resultados" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{torneo.nombre}</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Edición {torneo.edicion} · {torneo.anio} · ${torneo.monto_inscripcion} · Estado: {torneo.estado}
      </p>
      <div className="space-y-3">
        {secciones.map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 hover:border-gray-600 transition-colors"
          >
            <div>
              <div className="font-medium">{label}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
            <span className="text-gray-600">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
