import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "text-slate-400",
  activo: "text-court",
  cerrado: "text-red-400",
};

export default async function TorneosPage() {
  const supabase = await createClient();
  const { data: torneos } = await supabase
    .from("torneo")
    .select("*")
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Torneos</h1>
        <Link
          href="/admin/torneo/nuevo"
          className="px-4 py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark text-sm transition-colors"
        >
          + Nuevo torneo
        </Link>
      </div>
      <div className="space-y-3">
        {(torneos ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/admin/torneo/${t.id}`}
            className="flex items-center gap-4 bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-navy-600 transition-colors"
          >
            {(t as any).imagen_url ? (
              <img
                src={(t as any).imagen_url}
                alt={t.nombre}
                className="w-20 h-16 object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-16 bg-navy-800 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 py-3">
              <div className="font-medium">{t.nombre}</div>
              <div className="text-sm text-slate-500">
                Edición {t.edicion} · {t.anio} · ${t.monto_inscripcion}
              </div>
            </div>
            <span className={`text-sm font-medium capitalize pr-5 flex-shrink-0 ${ESTADO_COLORS[t.estado] ?? ""}`}>
              {t.estado}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
