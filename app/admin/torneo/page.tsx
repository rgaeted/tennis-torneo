import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "text-gray-400",
  activo: "text-green-400",
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
          className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 text-sm"
        >
          + Nuevo torneo
        </Link>
      </div>
      <div className="space-y-3">
        {(torneos ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/admin/torneo/${t.id}`}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 hover:border-gray-600 transition-colors"
          >
            <div>
              <div className="font-medium">{t.nombre}</div>
              <div className="text-sm text-gray-500">
                Edición {t.edicion} · {t.anio} · ${t.monto_inscripcion}
              </div>
            </div>
            <span className={`text-sm font-medium capitalize ${ESTADO_COLORS[t.estado] ?? ""}`}>
              {t.estado}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
